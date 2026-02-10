package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/huaweicloud/huaweicloud-sdk-go-obs/obs"
)

// OBSConfig OBS 配置
type OBSConfig struct {
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	Region          string
}

// OBS 华为云对象存储实现
type OBS struct {
	client     *obs.ObsClient
	bucketName string
	region     string
}

// NewOBS 创建 OBS 存储实例
func NewOBS(config OBSConfig) (*OBS, error) {
	// endpoint 建议包含协议（https://），UseSSL 可通过 endpoint 控制
	client, err := obs.New(config.AccessKeyID, config.SecretAccessKey, config.Endpoint)
	if err != nil {
		return nil, fmt.Errorf("创建OBS客户端失败: %w", err)
	}

	storage := &OBS{
		client:     client,
		bucketName: config.BucketName,
		region:     config.Region,
	}

	return storage, nil
}

// EnsureBucketExists 确保存储桶存在
func (o *OBS) EnsureBucketExists() error {
	_, err := o.client.HeadBucket(o.bucketName)
	if err == nil {
		return nil
	}

	input := &obs.CreateBucketInput{}
	input.Location = o.region
	input.Bucket = o.bucketName
	// 尝试创建（幂等）
	_, createErr := o.client.CreateBucket(input)
	if createErr != nil {
		return fmt.Errorf("创建存储桶失败: %w", createErr)
	}
	return nil
}

// Bucket 返回 bucket 名称
func (o *OBS) Bucket() string {
	return o.bucketName
}

// PresignPut 生成预签名上传URL（用于前端直传）
func (o *OBS) PresignPut(ctx context.Context, key, contentType string, expires time.Duration) (string, map[string]string, int64, error) {
	input := &obs.CreateSignedUrlInput{}
	input.Bucket = o.bucketName
	input.Key = key
	input.Method = obs.HttpMethodPut
	input.Expires = int(expires / time.Second)

	// 把 Content-Type 纳入签名，避免签名验证失败
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	input.Headers = map[string]string{
		"Content-Type": contentType,
	}

	output, err := o.client.CreateSignedUrl(input)
	if err != nil {
		return "", nil, 0, fmt.Errorf("生成预签名上传URL失败(bucket=%s,key=%s): %w", o.bucketName, key, err)
	}

	headers := map[string]string{
		"Content-Type": contentType,
	}
	expAt := time.Now().Add(expires).Unix() // Unix seconds

	return output.SignedUrl, headers, expAt, nil
}

// PresignGet 生成预签名访问URL（用于访问文件）
func (o *OBS) PresignGet(ctx context.Context, key, disposition string, expires time.Duration) (string, int64, error) {
	input := &obs.CreateSignedUrlInput{}
	input.Bucket = o.bucketName
	input.Key = key
	input.Method = obs.HttpMethodGet
	input.Expires = int(expires / time.Second)

	// 设置 Content-Disposition（inline/attachment）
	if disposition != "" {
		input.QueryParams = map[string]string{
			"response-content-disposition": disposition,
		}
	}

	output, err := o.client.CreateSignedUrl(input)
	if err != nil {
		return "", 0, fmt.Errorf("生成预签名访问URL失败(bucket=%s,key=%s): %w", o.bucketName, key, err)
	}

	expAt := time.Now().Add(expires).Unix() // Unix seconds
	return output.SignedUrl, expAt, nil
}

// CreateMultipart 初始化分块上传
func (o *OBS) CreateMultipart(ctx context.Context, key, contentType string) (string, error) {
	input := &obs.InitiateMultipartUploadInput{}
	input.Bucket = o.bucketName
	input.Key = key
	if contentType != "" {
		input.ContentType = contentType
	}

	output, err := o.client.InitiateMultipartUpload(input)
	if err != nil {
		return "", fmt.Errorf("初始化分片上传失败(bucket=%s,key=%s): %w", o.bucketName, key, err)
	}

	return output.UploadId, nil
}

// PresignUploadPart 生成分块上传的预签名URL（用于前端直传分块）
func (o *OBS) PresignUploadPart(ctx context.Context, key, uploadId string, partNumber int, expires time.Duration) (string, map[string]string, int64, error) {
	input := &obs.CreateSignedUrlInput{}
	input.Bucket = o.bucketName
	input.Key = key
	input.Method = obs.HttpMethodPut
	input.Expires = int(expires / time.Second)

	// OBS签名算法要求查询参数按字母序排列，所以使用uploadId和partNumber
	// 这样OBS验证签名时会包含这些参数，避免403错误
	input.QueryParams = map[string]string{
		"partNumber": fmt.Sprintf("%d", partNumber),
		"uploadId":   uploadId,
	}

	// 前端使用 application/octet-stream，所以这里也设置相同的值
	// 否则签名验证会失败（AccessDenied: Authentication Failed）
	input.Headers = map[string]string{
		"Content-Type": "application/octet-stream",
	}

	output, err := o.client.CreateSignedUrl(input)
	if err != nil {
		return "", nil, 0, fmt.Errorf("生成分块预签名URL失败(bucket=%s,key=%s,uploadId=%s,part=%d): %w", o.bucketName, key, uploadId, partNumber, err)
	}

	headers := map[string]string{
		"Content-Type": "application/octet-stream",
	}
	expAt := time.Now().Add(expires).Unix() // Unix seconds

	return output.SignedUrl, headers, expAt, nil
}

// CompleteMultipart 完成分块上传
func (o *OBS) CompleteMultipart(ctx context.Context, key, uploadId string, parts []UploadedPart) error {
	input := &obs.CompleteMultipartUploadInput{}
	input.Bucket = o.bucketName
	input.Key = key
	input.UploadId = uploadId

	// 转换分片列表
	if len(parts) > 0 {
		obsParts := make([]obs.Part, 0, len(parts))
		for _, p := range parts {
			obsParts = append(obsParts, obs.Part{PartNumber: p.PartNumber, ETag: p.ETag})
		}
		input.Parts = obsParts
	}

	_, err := o.client.CompleteMultipartUpload(input)
	if err != nil {
		return fmt.Errorf("完成分片上传失败(bucket=%s,key=%s,uploadId=%s): %w", o.bucketName, key, uploadId, err)
	}
	return nil
}

// AbortMultipart 取消分块上传
func (o *OBS) AbortMultipart(ctx context.Context, key, uploadId string) error {
	input := &obs.AbortMultipartUploadInput{}
	input.Bucket = o.bucketName
	input.Key = key
	input.UploadId = uploadId

	_, err := o.client.AbortMultipartUpload(input)
	if err != nil {
		return fmt.Errorf("取消分片上传失败(bucket=%s,key=%s,uploadId=%s): %w", o.bucketName, key, uploadId, err)
	}
	return nil
}

// HeadObject 获取对象元信息
func (o *OBS) HeadObject(ctx context.Context, key string) (int64, string, error) {
	input := &obs.GetObjectMetadataInput{}
	input.Bucket = o.bucketName
	input.Key = key

	output, err := o.client.GetObjectMetadata(input)
	if err != nil {
		if obsErr, ok := err.(obs.ObsError); ok && obsErr.StatusCode == 404 {
			return 0, "", fmt.Errorf("对象不存在(bucket=%s,key=%s)", o.bucketName, key)
		}
		return 0, "", fmt.Errorf("获取对象元信息失败(bucket=%s,key=%s): %w", o.bucketName, key, err)
	}

	return output.ContentLength, output.ContentType, nil
}

// ListUploadedParts 列出已上传的分片
func (o *OBS) ListUploadedParts(ctx context.Context, key, uploadId string) ([]UploadedPart, error) {
	var result []UploadedPart
	var partNumberMarker int

	for {
		input := &obs.ListPartsInput{}
		input.Bucket = o.bucketName
		input.Key = key
		input.UploadId = uploadId
		input.PartNumberMarker = partNumberMarker
		input.MaxParts = 1000

		output, err := o.client.ListParts(input)
		if err != nil {
			return nil, fmt.Errorf("列出分片失败(bucket=%s,key=%s,uploadId=%s): %w", o.bucketName, key, uploadId, err)
		}

		for _, p := range output.Parts {
			result = append(result, UploadedPart{
				PartNumber: p.PartNumber,
				ETag:       p.ETag,
			})
		}

		if !output.IsTruncated {
			break
		}
		partNumberMarker = output.NextPartNumberMarker
	}

	return result, nil
}

// DeleteObject 删除对象
func (o *OBS) DeleteObject(ctx context.Context, key string) error {
	input := &obs.DeleteObjectInput{}
	input.Bucket = o.bucketName
	input.Key = key

	_, err := o.client.DeleteObject(input)
	if err != nil {
		return fmt.Errorf("删除文件失败(bucket=%s,key=%s): %w", o.bucketName, key, err)
	}
	return nil
}

// 确保 OBS 实现了 Storage 接口
var _ Storage = (*OBS)(nil)

