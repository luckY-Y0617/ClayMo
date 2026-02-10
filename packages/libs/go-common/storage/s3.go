package storage

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	s3svc "github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// S3Config supports AWS S3 and S3-compatible providers (MinIO / OBS / COS).
type S3Config struct {
	Region       string
	Endpoint     string // e.g. "https://s3.amazonaws.com" / "http://127.0.0.1:9000"
	AccessKey    string
	SecretKey    string
	Bucket       string
	UsePathStyle bool // true for most S3-compatible providers
}

// S3 implements Storage using AWS SDK for Go v2.
type S3 struct {
	bucket    string
	client    *s3svc.Client
	presigner *s3svc.PresignClient
}

func NewS3(ctx context.Context, c S3Config) (*S3, error) {
	if strings.TrimSpace(c.Bucket) == "" {
		return nil, errors.New("storage: bucket is required")
	}

	region := strings.TrimSpace(c.Region)
	if region == "" {
		region = "us-east-1"
	}

	loadOpts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(region),
	}

	// Static credentials (recommended for MinIO/OBS/COS)
	if strings.TrimSpace(c.AccessKey) != "" || strings.TrimSpace(c.SecretKey) != "" {
		loadOpts = append(loadOpts,
			awsconfig.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(strings.TrimSpace(c.AccessKey), strings.TrimSpace(c.SecretKey), ""),
			),
		)
	}

	cfg, err := awsconfig.LoadDefaultConfig(ctx, loadOpts...)
	if err != nil {
		return nil, fmt.Errorf("storage: load aws config: %w", err)
	}

	baseEndpoint := ""
	if strings.TrimSpace(c.Endpoint) != "" {
		baseEndpoint, err = normalizeBaseEndpoint(c.Endpoint)
		if err != nil {
			return nil, fmt.Errorf("storage: invalid endpoint: %w", err)
		}
	}

	// IMPORTANT:
	// Use endpoint resolution v2 via BaseEndpoint (AWS official recommendation).
	// Do NOT use EndpointResolverWithOptionsFunc (deprecated).
	client := s3svc.NewFromConfig(cfg, func(o *s3svc.Options) {
		o.UsePathStyle = c.UsePathStyle
		if baseEndpoint != "" {
			o.BaseEndpoint = aws.String(baseEndpoint)
		}
	})

	return &S3{
		bucket:    c.Bucket,
		client:    client,
		presigner: s3svc.NewPresignClient(client),
	}, nil
}

func (s *S3) Bucket() string { return s.bucket }

func (s *S3) PresignPut(ctx context.Context, key, contentType string, expires time.Duration) (string, map[string]string, int64, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return "", nil, 0, errors.New("storage: key is required")
	}
	if expires <= 0 {
		expires = 15 * time.Minute
	}

	in := &s3svc.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	headers := map[string]string{}
	if ct := strings.TrimSpace(contentType); ct != "" {
		// 注意：Content-Type 会参与签名，客户端 PUT 必须带同样的 Content-Type
		in.ContentType = aws.String(ct)
		headers["Content-Type"] = ct
	}

	out, err := s.presigner.PresignPutObject(ctx, in, func(po *s3svc.PresignOptions) {
		po.Expires = expires
	})
	if err != nil {
		return "", nil, 0, fmt.Errorf("storage: presign put: %w", err)
	}

	expAt := time.Now().Add(expires).Unix() // unix seconds
	return out.URL, headers, expAt, nil
}

func (s *S3) PresignGet(ctx context.Context, key string, disposition string, expires time.Duration) (string, int64, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return "", 0, errors.New("storage: key is required")
	}
	if expires <= 0 {
		expires = 10 * time.Minute
	}

	disp := normalizeDisposition(disposition)

	in := &s3svc.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}
	// 浏览器行为：inline/attachment
	in.ResponseContentDisposition = aws.String(disp)

	out, err := s.presigner.PresignGetObject(ctx, in, func(po *s3svc.PresignOptions) {
		po.Expires = expires
	})
	if err != nil {
		return "", 0, fmt.Errorf("storage: presign get: %w", err)
	}

	expAt := time.Now().Add(expires).Unix() // unix seconds
	return out.URL, expAt, nil
}

func (s *S3) CreateMultipart(ctx context.Context, key, contentType string) (string, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return "", errors.New("storage: key is required")
	}

	in := &s3svc.CreateMultipartUploadInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}
	if ct := strings.TrimSpace(contentType); ct != "" {
		in.ContentType = aws.String(ct)
	}

	out, err := s.client.CreateMultipartUpload(ctx, in)
	if err != nil {
		return "", fmt.Errorf("storage: create multipart: %w", err)
	}
	if out.UploadId == nil || *out.UploadId == "" {
		return "", errors.New("storage: empty uploadId")
	}
	return *out.UploadId, nil
}

func (s *S3) PresignUploadPart(ctx context.Context, key, uploadId string, partNumber int, expires time.Duration) (string, map[string]string, int64, error) {
	key = strings.TrimSpace(key)
	uploadId = strings.TrimSpace(uploadId)
	if key == "" || uploadId == "" {
		return "", nil, 0, errors.New("storage: key and uploadId are required")
	}
	if partNumber <= 0 {
		return "", nil, 0, errors.New("storage: invalid partNumber")
	}
	if expires <= 0 {
		expires = 15 * time.Minute
	}

	in := &s3svc.UploadPartInput{
		Bucket:     aws.String(s.bucket),
		Key:        aws.String(key),
		UploadId:   aws.String(uploadId),
		PartNumber: aws.Int32(int32(partNumber)),
	}

	out, err := s.presigner.PresignUploadPart(ctx, in, func(po *s3svc.PresignOptions) {
		po.Expires = expires
	})
	if err != nil {
		return "", nil, 0, fmt.Errorf("storage: presign upload part: %w", err)
	}

	expAt := time.Now().Add(expires).Unix() // unix seconds
	return out.URL, map[string]string{}, expAt, nil
}

func (s *S3) CompleteMultipart(ctx context.Context, key, uploadId string, parts []UploadedPart) error {
	key = strings.TrimSpace(key)
	uploadId = strings.TrimSpace(uploadId)
	if key == "" || uploadId == "" {
		return errors.New("storage: key and uploadId are required")
	}
	if len(parts) == 0 {
		return errors.New("storage: parts is required")
	}

	// S3 要求 parts 按 PartNumber 升序
	sort.Slice(parts, func(i, j int) bool { return parts[i].PartNumber < parts[j].PartNumber })

	completed := make([]s3types.CompletedPart, 0, len(parts))
	for _, p := range parts {
		if p.PartNumber <= 0 {
			return errors.New("storage: invalid partNumber in parts")
		}
		etag := strings.TrimSpace(p.ETag)
		etag = strings.Trim(etag, `"`)
		if etag == "" {
			return errors.New("storage: empty etag in parts")
		}
		completed = append(completed, s3types.CompletedPart{
			ETag:       aws.String(etag),
			PartNumber: aws.Int32(int32(p.PartNumber)),
		})
	}

	_, err := s.client.CompleteMultipartUpload(ctx, &s3svc.CompleteMultipartUploadInput{
		Bucket:   aws.String(s.bucket),
		Key:      aws.String(key),
		UploadId: aws.String(uploadId),
		MultipartUpload: &s3types.CompletedMultipartUpload{
			Parts: completed,
		},
	})
	if err != nil {
		return fmt.Errorf("storage: complete multipart: %w", err)
	}
	return nil
}

func (s *S3) AbortMultipart(ctx context.Context, key, uploadId string) error {
	key = strings.TrimSpace(key)
	uploadId = strings.TrimSpace(uploadId)
	if key == "" || uploadId == "" {
		return errors.New("storage: key and uploadId are required")
	}

	_, err := s.client.AbortMultipartUpload(ctx, &s3svc.AbortMultipartUploadInput{
		Bucket:   aws.String(s.bucket),
		Key:      aws.String(key),
		UploadId: aws.String(uploadId),
	})
	if err != nil {
		return fmt.Errorf("storage: abort multipart: %w", err)
	}
	return nil
}

func (s *S3) HeadObject(ctx context.Context, key string) (int64, string, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return 0, "", errors.New("storage: key is required")
	}

	out, err := s.client.HeadObject(ctx, &s3svc.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return 0, "", fmt.Errorf("storage: head object: %w", err)
	}

	ct := ""
	if out.ContentType != nil {
		ct = *out.ContentType
	}
	size := int64(0)
	if out.ContentLength != nil {
		size = *out.ContentLength
	}
	return size, ct, nil

}

func (s *S3) ListUploadedParts(ctx context.Context, key, uploadId string) ([]UploadedPart, error) {
	key = strings.TrimSpace(key)
	uploadId = strings.TrimSpace(uploadId)
	if key == "" || uploadId == "" {
		return nil, errors.New("storage: key and uploadId are required")
	}

	p := s3svc.NewListPartsPaginator(s.client, &s3svc.ListPartsInput{
		Bucket:   aws.String(s.bucket),
		Key:      aws.String(key),
		UploadId: aws.String(uploadId),
	})

	var res []UploadedPart
	for p.HasMorePages() {
		page, err := p.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("storage: list parts: %w", err)
		}

		for _, part := range page.Parts {
			if part.PartNumber == nil {
				continue
			}
			pn := int(*part.PartNumber)
			if pn <= 0 {
				continue
			}
			etag := ""
			if part.ETag != nil {
				etag = strings.Trim(*part.ETag, `"`)
			}
			res = append(res, UploadedPart{PartNumber: pn, ETag: etag})
		}
	}

	return res, nil
}

func (s *S3) DeleteObject(ctx context.Context, key string) error {
	key = strings.TrimSpace(key)
	if key == "" {
		return errors.New("storage: key is required")
	}

	_, err := s.client.DeleteObject(ctx, &s3svc.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("storage: delete object: %w", err)
	}
	return nil
}

func normalizeDisposition(d string) string {
	d = strings.ToLower(strings.TrimSpace(d))
	switch d {
	case "attachment":
		return "attachment"
	default:
		return "inline"
	}
}

// normalizeBaseEndpoint ensures scheme + trailing slash.
// AWS v2 endpoint resolution recommends BaseEndpoint for S3 custom endpoints.
func normalizeBaseEndpoint(ep string) (string, error) {
	ep = strings.TrimSpace(ep)
	if ep == "" {
		return "", nil
	}
	if !strings.Contains(ep, "://") {
		// 如果你是本地 MinIO/LocalStack，建议显式写 http://
		ep = "https://" + ep
	}
	u, err := url.Parse(ep)
	if err != nil {
		return "", err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", fmt.Errorf("unsupported scheme: %s", u.Scheme)
	}
	if u.Host == "" {
		return "", errors.New("missing host")
	}
	// 强制以 / 结尾（AWS 文档示例是带 / 的）
	if !strings.HasSuffix(u.String(), "/") {
		return u.String() + "/", nil
	}
	return u.String(), nil
}

