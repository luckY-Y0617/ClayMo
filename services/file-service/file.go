// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"strings"

	"file-service/internal/config"
	"file-service/internal/handler"
	"file-service/internal/svc"
	"github.com/zeromicro/go-zero/core/conf"
	"github.com/zeromicro/go-zero/rest"
)

var configFile = flag.String("f", "etc/file-api.yaml", "the config file")

func main() {
	flag.Parse()

	var c config.Config
	conf.MustLoad(*configFile, &c)
	applyEnvOverrides(&c)

	server := rest.MustNewServer(c.RestConf,
		rest.WithCors(c.Cors.AllowedOrigins...),
		rest.WithCorsHeaders(c.Cors.AllowedHeaders...),

		rest.WithUnauthorizedCallback(func(w http.ResponseWriter, r *http.Request, err error) {
			// 统一401返回体（大厂风格：code+message+requestId）
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"code":"Unauthorized","message":"unauthorized"}`))
		}),
	)
	defer server.Stop()

	ctx := svc.NewServiceContext(c)
	handler.RegisterHandlers(server, ctx)

	fmt.Printf("Starting server at %s:%d...\n", c.Host, c.Port)
	server.Start()
}

func applyEnvOverrides(c *config.Config) {
	c.Auth.AccessSecret = resolveEnv("FILE_SERVICE_JWT_SECRET", c.Auth.AccessSecret)
	c.Internal.HmacSecret = resolveEnv("INTERNAL_HMAC_SECRET", c.Internal.HmacSecret)

	c.Storage.Provider = resolveEnv("STORAGE_PROVIDER", c.Storage.Provider)
	c.Storage.Region = resolveEnv("STORAGE_REGION", c.Storage.Region)
	c.Storage.Endpoint = resolveEnv("STORAGE_ENDPOINT", c.Storage.Endpoint)
	c.Storage.AccessKey = resolveEnv("STORAGE_ACCESS_KEY", c.Storage.AccessKey)
	c.Storage.SecretKey = resolveEnv("STORAGE_SECRET_KEY", c.Storage.SecretKey)
	c.Storage.Bucket = resolveEnv("STORAGE_BUCKET", c.Storage.Bucket)

	c.DB.DataSource = resolveMysqlDataSource(c.DB.DataSource)

	redisHost := resolveRedisHost(c.Redis.Host)
	if redisHost != "" {
		c.Redis.Host = redisHost
	}
	c.Redis.Pass = resolveEnv("REDIS_PASSWORD", c.Redis.Pass)
	for i := range c.Cache {
		if redisHost != "" {
			c.Cache[i].Host = redisHost
		}
		c.Cache[i].Pass = resolveEnv("REDIS_PASSWORD", c.Cache[i].Pass)
	}

	kafkaBroker := resolveKafkaBroker()
	if kafkaBroker != "" {
		c.Kafka.Brokers = []string{kafkaBroker}
	}

	corsOrigin := strings.TrimSpace(os.Getenv("CORS_ORIGIN_0"))
	if corsOrigin != "" {
		c.Cors.AllowedOrigins = []string{corsOrigin}
	}
}

func resolveEnv(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value != "" {
		return value
	}
	return fallback
}

func resolveMysqlDataSource(fallback string) string {
	dsn := strings.TrimSpace(os.Getenv("MYSQL_DSN"))
	if dsn != "" {
		return dsn
	}
	user := strings.TrimSpace(os.Getenv("MYSQL_USER"))
	password := os.Getenv("MYSQL_PASSWORD")
	host := strings.TrimSpace(os.Getenv("MYSQL_HOST"))
	port := strings.TrimSpace(os.Getenv("MYSQL_PORT"))
	database := strings.TrimSpace(os.Getenv("MYSQL_DATABASE"))
	if user == "" && password == "" && host == "" && port == "" && database == "" {
		return fallback
	}
	if user == "" {
		user = "root"
	}
	if host == "" {
		host = "mysql"
	}
	if port == "" {
		port = "3306"
	}
	if database == "" {
		database = "claymo_host"
	}
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=true&loc=Local", user, password, host, port, database)
}

func resolveRedisHost(fallback string) string {
	host := strings.TrimSpace(os.Getenv("REDIS_HOST"))
	port := strings.TrimSpace(os.Getenv("REDIS_PORT"))
	if host == "" && port == "" {
		return fallback
	}
	if host == "" {
		host = "redis"
	}
	if port == "" {
		port = "6379"
	}
	return fmt.Sprintf("%s:%s", host, port)
}

func resolveKafkaBroker() string {
	host := strings.TrimSpace(os.Getenv("KAFKA_HOST"))
	port := strings.TrimSpace(os.Getenv("KAFKA_PORT"))
	if host == "" && port == "" {
		return ""
	}
	if host == "" {
		host = "kafka"
	}
	if port == "" {
		port = "9092"
	}
	return fmt.Sprintf("%s:%s", host, port)
}
