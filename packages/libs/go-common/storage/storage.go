package storage

import (
	"context"
	"time"
)

type UploadedPart struct {
	PartNumber int
	ETag       string
}

// Storage 对象存储接口
// 所有 expAt 返回值统一使用 Unix seconds（秒级时间戳）
type Storage interface {
	Bucket() string

	// PresignPut 生成预签名上传URL，expAt 为 Unix seconds
	PresignPut(ctx context.Context, key, contentType string, expires time.Duration) (url string, headers map[string]string, expAt int64, err error)
	// PresignGet 生成预签名访问URL，expAt 为 Unix seconds
	PresignGet(ctx context.Context, key string, disposition string, expires time.Duration) (url string, expAt int64, err error)

	CreateMultipart(ctx context.Context, key, contentType string) (uploadId string, err error)
	// PresignUploadPart 生成分片预签名URL，expAt 为 Unix seconds
	PresignUploadPart(ctx context.Context, key, uploadId string, partNumber int, expires time.Duration) (url string, headers map[string]string, expAt int64, err error)
	CompleteMultipart(ctx context.Context, key, uploadId string, parts []UploadedPart) error
	AbortMultipart(ctx context.Context, key, uploadId string) error

	HeadObject(ctx context.Context, key string) (size int64, contentType string, err error)
	ListUploadedParts(ctx context.Context, key, uploadId string) ([]UploadedPart, error)
	DeleteObject(ctx context.Context, key string) error
}

