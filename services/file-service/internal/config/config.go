// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package config

import (
	"github.com/zeromicro/go-queue/kq"
	"github.com/zeromicro/go-zero/core/stores/cache"
	"github.com/zeromicro/go-zero/core/stores/redis"
	"github.com/zeromicro/go-zero/rest"
)

type Config struct {
	rest.RestConf

	// Auth is used by go-zero jwt middleware (jwt: Auth in .api)
	Auth AuthConf

	// DB connection
	DB DBConf

	// Redis (optional but common: cache/outbox/locks)
	Redis redis.RedisConf

	// Cache config for goctl models (pass into model.NewXxxModel(db, c.Cache))
	// If you don't use cache, you can keep it empty or omit model cache generation.
	Cache cache.CacheConf

	// Storage provider config (S3 / S3-compatible)
	Storage StorageConf

	// Upload policy (multipart decision)
	UploadPolicy UploadPolicyConf

	// Internal endpoints protection (HMAC / allowlist)
	Internal InternalConf

	// Kafka topics (optional)
	Kafka KafkaConf

	Cors Cors
}

type AuthConf struct {
	AccessSecret string `json:",optional"`
	AccessExpire int64  `json:",optional"` // seconds
}

// DBConf keeps mysql datasource
type DBConf struct {
	DataSource string
}

// StorageConf supports s3 compatible
type StorageConf struct {
	Provider string // "s3"

	Region       string
	Endpoint     string // optional, e.g. http://127.0.0.1:9000
	AccessKey    string
	SecretKey    string
	Bucket       string
	UsePathStyle bool

	// presign expire settings (seconds)
	PresignPutExpireSeconds int64
	PresignGetExpireSeconds int64
}

// UploadPolicyConf controls multipart decision and constraints.
// This is independent of storage; used by service/logic to choose mode & part size.
type UploadPolicyConf struct {
	// auto multipart threshold, >= this value uses multipart when mode=auto
	AutoMultipartThresholdBytes int64

	// min part size (S3 recommends >= 5MB; last part can be smaller)
	MinPartSizeBytes int64

	// maximum number of parts (S3 limit: 10000)
	MaxParts int
}

// InternalConf secures /internal APIs.
// 推荐：internal route 走网关 allowlist + HMAC 双保险
type InternalConf struct {
	HmacSecret            string
	AllowClockSkewSeconds int64 // tolerate timestamp skew
}

// KafkaConf controls event topics.
// If you use go-queue/kq, you can directly embed kq.KqConf or keep simple fields.
type KafkaConf struct {
	Brokers []string

	// transcode dispatch topic
	TopicTranscode string

	// outbox dispatcher could publish different topics if needed
	TopicOutbox string `json:",optional"`

	// optional kq producer conf (timeouts etc.)
	Producer kq.KqConf `json:",optional"`
}

type Cors struct {
	AllowedOrigins   []string `json:",optional"`
	AllowedHeaders   []string `json:",optional"`
	AllowedMethods   []string `json:",optional"`
	ExposeHeaders    []string `json:",optional"`
	AllowCredentials bool     `json:",optional"`
	MaxAgeSeconds    int      `json:",optional"`
}
