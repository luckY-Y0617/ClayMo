# Go Common 使用示例

## 1. 错误处理 (errors)

```go
package main

import (
    "github.com/claymo/go-common/errors"
)

func SomeBusinessLogic() error {
    // 使用预定义错误
    return errors.ErrNotFound
    
    // 或创建自定义错误
    return errors.New(400, "CustomError", "custom error message")
}
```

## 2. HTTP 响应 (httpx)

```go
package handler

import (
    "net/http"
    "github.com/claymo/go-common/httpx"
    "github.com/claymo/go-common/errors"
)

func MyHandler(w http.ResponseWriter, r *http.Request) {
    // 成功响应
    data := map[string]string{"message": "success"}
    httpx.Ok(w, data)
    
    // 错误响应
    httpx.Fail(w, errors.ErrBadRequest)
    
    // 统一响应处理
    result, err := someLogic()
    httpx.Response(r, w, result, err)
}
```

## 3. 认证上下文 (auth)

```go
package logic

import (
    "context"
    "github.com/claymo/go-common/auth"
)

func GetCurrentUser(ctx context.Context) (string, error) {
    // 获取用户 ID
    uid := auth.GetUserID(ctx)
    
    // 获取租户 ID
    tid := auth.GetTenantID(ctx)
    
    return uid, nil
}

// 在业务逻辑中使用
func MyBusinessLogic(ctx context.Context, authCtx auth.Ctx) error {
    uid, err := authCtx.UserId(ctx)
    if err != nil {
        return err
    }
    
    tid, err := authCtx.TenantId(ctx)
    if err != nil {
        return err
    }
    
    // 使用 uid 和 tid
    return nil
}
```

## 4. JWT 中间件 (middleware)

```go
package main

import (
    "github.com/claymo/go-common/middleware"
    "github.com/zeromicro/go-zero/rest"
)

func main() {
    // 创建 JWT 中间件
    jwtMiddleware := middleware.NewJwtUserContextMiddleware(
        middleware.JwtUserContextConfig{
            AccessSecret:    "your-secret-key",
            DefaultTenantID: "default",
            RequireTenant:   false,
        },
    )
    
    // 在 go-zero 中使用
    server := rest.MustNewServer(rest.RestConf{
        // ... config
    })
    
    // 应用中间件
    server.Use(jwtMiddleware.Handle)
}
```

## 5. HMAC 中间件 (middleware)

```go
package main

import (
    "github.com/claymo/go-common/middleware"
)

func main() {
    // 创建 HMAC 中间件
    hmacMiddleware := middleware.NewInternalHmacMiddleware(
        middleware.InternalHmacConfig{
            Secret:                "your-hmac-secret",
            AllowClockSkewSeconds: 60,
        },
    )
    
    // 使用中间件保护内部 API
    // server.Use(hmacMiddleware.Handle)
}
```

## 6. 对象存储 (storage)

### S3 存储

```go
package main

import (
    "context"
    "time"
    "github.com/claymo/go-common/storage"
)

func main() {
    ctx := context.Background()
    
    // 创建 S3 客户端
    s3Client, err := storage.NewS3(ctx, storage.S3Config{
        Region:       "us-east-1",
        Endpoint:     "http://localhost:9000", // MinIO
        AccessKey:    "minioadmin",
        SecretKey:    "minioadmin",
        Bucket:       "my-bucket",
        UsePathStyle: true,
    })
    if err != nil {
        panic(err)
    }
    
    // 生成预签名上传 URL
    url, headers, expAt, err := s3Client.PresignPut(
        ctx,
        "path/to/file.jpg",
        "image/jpeg",
        15*time.Minute,
    )
    
    // 生成预签名下载 URL
    downloadUrl, expAt, err := s3Client.PresignGet(
        ctx,
        "path/to/file.jpg",
        "inline",
        10*time.Minute,
    )
    
    // 分片上传
    uploadId, err := s3Client.CreateMultipart(ctx, "large-file.zip", "application/zip")
    
    partUrl, headers, expAt, err := s3Client.PresignUploadPart(
        ctx,
        "large-file.zip",
        uploadId,
        1, // part number
        15*time.Minute,
    )
    
    // 完成分片上传
    parts := []storage.UploadedPart{
        {PartNumber: 1, ETag: "etag1"},
        {PartNumber: 2, ETag: "etag2"},
    }
    err = s3Client.CompleteMultipart(ctx, "large-file.zip", uploadId, parts)
}
```

### OBS 存储

```go
package main

import (
    "context"
    "github.com/claymo/go-common/storage"
)

func main() {
    // 创建 OBS 客户端
    obsClient, err := storage.NewOBS(storage.OBSConfig{
        Endpoint:        "obs.cn-east-3.myhuaweicloud.com",
        AccessKeyID:     "your-access-key",
        SecretAccessKey: "your-secret-key",
        BucketName:      "my-bucket",
        Region:          "cn-east-3",
    })
    if err != nil {
        panic(err)
    }
    
    // 使用方式与 S3 相同
    ctx := context.Background()
    url, headers, expAt, err := obsClient.PresignPut(
        ctx,
        "path/to/file.jpg",
        "image/jpeg",
        15*time.Minute,
    )
}
```

## 7. 完整示例：创建新服务

```go
package main

import (
    "context"
    "net/http"
    
    "github.com/claymo/go-common/auth"
    "github.com/claymo/go-common/errors"
    "github.com/claymo/go-common/httpx"
    "github.com/claymo/go-common/middleware"
    "github.com/claymo/go-common/storage"
    "github.com/zeromicro/go-zero/rest"
)

type ServiceContext struct {
    Auth    auth.Ctx
    Storage storage.Storage
}

func NewServiceContext() *ServiceContext {
    ctx := context.Background()
    
    // 初始化存储
    st, _ := storage.NewS3(ctx, storage.S3Config{
        Region:       "us-east-1",
        Endpoint:     "http://localhost:9000",
        AccessKey:    "minioadmin",
        SecretKey:    "minioadmin",
        Bucket:       "my-bucket",
        UsePathStyle: true,
    })
    
    return &ServiceContext{
        Auth:    auth.New(),
        Storage: st,
    }
}

func main() {
    svcCtx := NewServiceContext()
    
    // 创建服务器
    server := rest.MustNewServer(rest.RestConf{
        Host: "0.0.0.0",
        Port: 8080,
    })
    
    // 添加 JWT 中间件
    jwtMiddleware := middleware.NewJwtUserContextMiddleware(
        middleware.JwtUserContextConfig{
            AccessSecret:    "your-secret",
            DefaultTenantID: "default",
            RequireTenant:   false,
        },
    )
    
    // 注册路由
    server.AddRoute(rest.Route{
        Method:  http.MethodGet,
        Path:    "/api/files",
        Handler: filesHandler(svcCtx),
    }, rest.WithJwt("your-secret"), rest.WithMiddlewares(jwtMiddleware.Handle))
    
    server.Start()
}

func filesHandler(svcCtx *ServiceContext) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // 获取用户信息
        uid, err := svcCtx.Auth.UserId(r.Context())
        if err != nil {
            httpx.Fail(w, errors.ErrUnauthorized)
            return
        }
        
        // 业务逻辑
        result := map[string]string{
            "userId": uid,
            "message": "success",
        }
        
        httpx.Ok(w, result)
    }
}
```

