# Go Common 包迁移总结

## 迁移日期
2026-01-13

## 迁移内容

### 1. 错误处理 (errors)
- **源路径**: `services/file-service/internal/xerr/`
- **目标路径**: `packages/libs/go-common/errors/`
- **功能**: 统一的错误类型定义，包含 HTTP 状态码和业务错误码

### 2. HTTP 响应处理 (httpx)
- **源路径**: `services/file-service/internal/xhttp/`
- **目标路径**: `packages/libs/go-common/httpx/`
- **功能**: 统一的 HTTP 响应封装（Ok、Fail、Response）

### 3. 认证上下文 (auth)
- **源路径**: `services/file-service/internal/authctx/`
- **目标路径**: `packages/libs/go-common/auth/`
- **功能**: 用户和租户信息的 Context 管理

### 4. 中间件 (middleware)
- **源路径**: `services/file-service/internal/middleware/`
- **目标路径**: `packages/libs/go-common/middleware/`
- **功能**: 
  - JWT 用户上下文中间件
  - 内部 HMAC 签名验证中间件

### 5. 对象存储 (storage)
- **源路径**: `services/file-service/internal/storage/`
- **目标路径**: `packages/libs/go-common/storage/`
- **功能**: 
  - 统一的对象存储接口
  - S3 实现（支持 AWS S3、MinIO 等）
  - OBS 实现（华为云对象存储）

## 使用方式

### 在新服务中引用 go-common

1. 在 `go.mod` 中添加依赖：
```go
require (
    github.com/claymo/go-common v0.0.0
)

replace github.com/claymo/go-common => ../../packages/libs/go-common
```

2. 导入包：
```go
import (
    "github.com/claymo/go-common/errors"
    "github.com/claymo/go-common/httpx"
    "github.com/claymo/go-common/auth"
    "github.com/claymo/go-common/middleware"
    "github.com/claymo/go-common/storage"
)
```

## file-service 迁移验证

### 迁移步骤
1. ✅ 创建 go-common 模块结构
2. ✅ 迁移所有通用包
3. ✅ 更新 file-service 的导入引用
4. ✅ 删除旧的 internal 包文件
5. ✅ 编译测试通过
6. ✅ 运行时测试通过

### 验证结果
- 编译成功：✅
- 服务启动：✅
- API 响应正常：✅
- 错误处理正确：✅

## 注意事项

1. **模块路径**: 所有服务使用 `replace` 指令指向本地 go-common 包
2. **版本管理**: 当前使用 v0.0.0，后续可以根据需要打标签版本
3. **向后兼容**: 迁移过程中保持了所有 API 和行为不变
4. **依赖管理**: go-common 包含了所有必要的第三方依赖

## 未来扩展

可以继续添加以下通用包：
- `mq/` - 消息队列封装（Kafka、RabbitMQ 等）
- `cache/` - 缓存封装（Redis 等）
- `db/` - 数据库工具
- `logger/` - 日志封装
- `config/` - 配置管理
- `tracing/` - 链路追踪
- `metrics/` - 指标监控

