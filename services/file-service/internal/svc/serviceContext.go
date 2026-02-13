package svc

import (
	"context"
	"net/http"
	"os"
	"strings"

	"file-service/internal/config"
	"file-service/internal/model"

	"github.com/claymo/go-common/auth"
	"github.com/claymo/go-common/middleware"
	"github.com/claymo/go-common/storage"
	"github.com/zeromicro/go-queue/kq"
	"github.com/zeromicro/go-zero/core/stores/redis"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
	"github.com/zeromicro/go-zero/rest"
)

type ServiceContext struct {
	Config config.Config

	DB    sqlx.SqlConn
	Redis *redis.Redis

	// ====== Models (goctl generated) ======
	FileInfosModel      model.FileInfosModel
	UploadSessionsModel model.UploadSessionsModel
	FileOutboxModel     model.FileOutboxModel

	// ====== Infrastructure ======
	Storage storage.Storage
	Auth    auth.Ctx

	// ====== Message Queue ======
	KafkaTranscodePusher *kq.Pusher

	// ====== HTTP middlewares (required by goctl routes.go) ======
	JwtUserContext rest.Middleware
	InternalHmac   rest.Middleware
}

func NewServiceContext(c config.Config) *ServiceContext {
	// ---------- DB ----------
	db := sqlx.NewMysql(c.DB.DataSource)

	// ---------- Redis ----------
	rd := redis.MustNewRedis(c.Redis)

	// ---------- Storage ----------
	provider := resolveStorageProvider(c.Storage.Provider)
	c.Storage.Provider = provider
	var st storage.Storage
	switch provider {
	case "s3":
		client, err := storage.NewS3(context.Background(), storage.S3Config{
			Region:       c.Storage.Region,
			Endpoint:     c.Storage.Endpoint,
			AccessKey:    c.Storage.AccessKey,
			SecretKey:    c.Storage.SecretKey,
			Bucket:       c.Storage.Bucket,
			UsePathStyle: c.Storage.UsePathStyle,
		})
		if err != nil {
			panic("failed to init s3 storage: " + err.Error())
		}
		st = client
	case "obs":
		client, err := storage.NewOBS(storage.OBSConfig{
			Endpoint:        c.Storage.Endpoint,
			AccessKeyID:     c.Storage.AccessKey,
			SecretAccessKey: c.Storage.SecretKey,
			BucketName:      c.Storage.Bucket,
			Region:          c.Storage.Region,
		})
		if err != nil {
			panic("failed to init obs storage: " + err.Error())
		}
		st = client
	default:
		panic("unsupported storage provider: " + provider)
	}

	// ---------- Kafka ----------
	var pusher *kq.Pusher
	if len(c.Kafka.Brokers) > 0 && c.Kafka.TopicTranscode != "" {
		pusher = kq.NewPusher(c.Kafka.Brokers, c.Kafka.TopicTranscode)
	}

	// ---------- Assemble ----------
	sc := &ServiceContext{
		Config: c,
		DB:     db,
		Redis:  rd,

		FileInfosModel:      model.NewFileInfosModel(db),
		UploadSessionsModel: model.NewUploadSessionsModel(db),
		FileOutboxModel:     model.NewFileOutboxModel(db),

		Storage:              st,
		Auth:                 auth.New(), // 已改为读取 go-common/auth 的统一 key
		KafkaTranscodePusher: pusher,
	}

	// ---------- Middlewares required by goctl routes.go ----------
	// JwtUserContext: enrich ctx with uid/tid (should write via authctx.WithUserID/WithTenantID)
	sc.JwtUserContext = middleware.NewJwtUserContextMiddleware(middleware.JwtUserContextConfig{
		AccessSecret:    c.Auth.AccessSecret,
		DefaultTenantID: "default",
		RequireTenant:   false,
	}).Handle

	// InternalHmac: protect /internal APIs. If not configured, use noop to avoid nil.
	if c.Internal.HmacSecret != "" {
		sc.InternalHmac = middleware.NewInternalHmacMiddleware(middleware.InternalHmacConfig{
			Secret:                c.Internal.HmacSecret,
			AllowClockSkewSeconds: c.Internal.AllowClockSkewSeconds,
		}).Handle
	} else {
		sc.InternalHmac = noopMiddleware()
	}

	return sc
}

func resolveStorageProvider(configProvider string) string {
	envProvider := strings.TrimSpace(os.Getenv("STORAGE_PROVIDER"))
	if envProvider != "" {
		return strings.ToLower(envProvider)
	}
	normalized := strings.TrimSpace(strings.ToLower(configProvider))
	if normalized == "" || strings.Contains(normalized, "${") {
		return "obs"
	}
	return normalized
}

func (sc *ServiceContext) Close() {
	if sc.KafkaTranscodePusher != nil {
		_ = sc.KafkaTranscodePusher.Close()
	}
}

func noopMiddleware() rest.Middleware {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			next(w, r)
		}
	}
}
