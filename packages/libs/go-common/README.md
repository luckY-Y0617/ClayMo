# go-common

通用 Go 服务库，包含所有 Go 微服务共享的基础组件。

## 包结构

- `errors/` - 统一错误处理
- `httpx/` - HTTP 响应处理
- `auth/` - 认证上下文管理
- `middleware/` - 通用中间件（JWT、HMAC 等）
- `storage/` - 对象存储抽象层（S3、OBS 等）

## 使用方式

```go
import (
    "github.com/claymo/go-common/errors"
    "github.com/claymo/go-common/httpx"
    "github.com/claymo/go-common/auth"
    "github.com/claymo/go-common/middleware"
    "github.com/claymo/go-common/storage"
)
```

## 版本

Go 1.24.6+

