# ClayMo 架构文档

## 系统架构

ClayMo 采用前后端分离、微服务架构设计，基于 DDD（领域驱动设计）进行模块划分。

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                   Browser / Client                       │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ HTTPS (子域名隔离)
                    │
┌───────────────────▼─────────────────────────────────────┐
│                  Gateway (YARP + 静态文件)                │
│                                                           │
│  • admin.yourdomain.com → Admin 前端 + Session 认证      │
│  • www.yourdomain.com   → Web 前端 + JWT 认证            │
│  • /api/*               → 反向代理到 API 服务             │
│  • /fs/*                → 反向代理到文件服务              │
└─────────────┬─────────────────────┬─────────────────────┘
              │                     │
      ┌───────▼─────────┐   ┌───────▼─────────┐
      │   API Service   │   │  File Service   │
      │   (.NET 10)     │   │    (Go)         │
      └───────┬─────────┘   └───────┬─────────┘
              │                     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   MySQL + Redis     │
              │   (数据持久化 + 缓存) │
              └─────────────────────┘
```

## 子域名隔离策略

### Cookie/Token 隔离

**问题背景：**
- 早期架构中 Admin 和 App 前端共享同一域名
- 导致 Admin 的 Session Cookie 会被带到 App API 请求中

**解决方案：**
- **Admin 后台**：`admin.yourdomain.com`
  - 认证方式：Session（`claymo.sid` Cookie）
  - Cookie 仅在 `admin.yourdomain.com` 域有效
  
- **Web 前台**：`www.yourdomain.com`
  - 认证方式：JWT（`Bearer` Token + `claymo.rt` Refresh Token Cookie）
  - Token 仅在 `www.yourdomain.com` 域有效

**路由策略：**
```
Gateway 根据 Host 头判断：
- Host: admin.yourdomain.com → 返回 wwwroot/admin/ 静态文件
- Host: www.yourdomain.com   → 返回 wwwroot/web/ 静态文件
- Path: /api/*               → 反向代理到 API Service
- Path: /fs/*                → 反向代理到 File Service
```

## 后端架构

### DDD 分层

每个业务模块遵循标准的 DDD 分层：

```
ClayMo.Module.{ModuleName}/
├── Domain.Shared/          # 共享层（枚举、常量、事件定义）
├── Domain/                 # 领域层（实体、值对象、领域服务、仓储接口）
├── Application.Contracts/  # 应用服务契约（DTO、接口定义）
├── Application/            # 应用层（业务逻辑、事件处理器）
└── SqlSugar/               # 基础设施层（仓储实现、数据访问）
```

### 核心模块

| 模块 | 职责 |
|---|---|
| **Identity** | 用户、角色、权限、认证、会话管理 |
| **TenantManagement** | 多租户管理、租户初始化 |
| **Workspace** | 工作区、专注模式、目标管理、打卡 |
| **Knowledge (KB)** | 知识库、文档管理、版本历史 |
| **AuditLogging** | 审计日志、实体变更跟踪 |

### 认证与授权

#### Smart Policy Scheme

Gateway 使用自定义的"智能策略"方案，根据请求路径自动选择认证方式：

```csharp
// ForwardDefaultSelector 逻辑
if (path.StartsWith("/api/app/workspace/"))
    return JwtAuthenticationScheme;  // JWT Bearer
else if (httpContext.Request.Headers.ContainsKey("Authorization"))
    return JwtAuthenticationScheme;
else
    return SessionAuthenticationScheme;  // Session Cookie
```

#### 职责划分

- **`UserRepository.FindAndVerifyAsync`**：用户名密码验证（领域层）
- **`LoginAttemptedEvent` + Handler**：登录日志记录（领域事件，异步处理）
- **`UserAppService.GetMeAsync`**：获取当前用户信息（应用层，统一端点）

### 事件驱动

使用 ABP `ILocalEventBus` 实现模块间解耦：

| 事件 | 发布者 | 订阅者 | 目的 |
|---|---|---|---|
| `LoginAttemptedEvent` | `AdminAuthController` / `IdentityAuthAppService` | `LoginAttemptedEventHandler` | 异步记录登录日志 |
| `UserRoleChangedEvent` | `UserAppService` | `UserRoleChangedEventHandler` | 清除权限缓存 |
| `RolePermissionChangedEvent` | `RoleAppService` | `RolePermissionChangedEventHandler` | 清除角色权限缓存 |

## 前端架构

### 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite 5 |
| 路由 | Vue Router 4 |
| 状态管理 | Pinia |
| UI 组件 | Element Plus（Admin） / 自定义组件（Web） |
| 富文本编辑 | TipTap（Web） |
| HTTP 客户端 | Axios |
| 样式 | 原生 CSS + CSS Modules |

### Monorepo 结构

使用 pnpm workspace 管理前端多项目：

```
frontend/
├── admin/           # 管理后台
├── web/             # 用户端 Web
└── (未来可扩展)
    ├── mobile/      # 移动端（可选）
    └── desktop/     # Electron（可选）

packages/
├── contracts/       # API 契约、错误码定义
├── libs/
│   ├── ts-common/   # 通用工具库
│   └── go-common/   # Go 通用库（文件服务）
└── sdk/
    ├── ts/          # TypeScript SDK
    └── csharp/      # C# SDK（未来扩展）
```

### 前端 API 请求流程

```
Component
    ↓
API Module (api/modules/auth.ts)
    ↓
HTTP Client (utils/http.ts)
    ↓ Request Interceptor
      - 添加 Authorization: Bearer {token}
      - 添加 X-Tenant-Id（如果存在）
      - 添加 X-Request-Id
    ↓
Gateway (/api/*)
    ↓
API Service
    ↓ Response
HTTP Client
    ↓ Response Interceptor
      - 401 自动刷新 Token（无感刷新）
      - 403/404/5xx 错误统一处理
      - 错误信息规范化（error-codes 映射）
    ↓
Component
```

## 文件服务架构

文件服务使用 Go + go-zero 实现，独立微服务。

### 文件上传流程

```
前端上传请求
    ↓
Gateway (/fs/upload)
    ↓
File Service (Go)
    ↓
华为云 OBS / 阿里云 OSS
    ↓
返回文件 URL
    ↓
前端展示/使用
```

### 异步处理（可选）

```
文件上传成功
    ↓
发布 Kafka 消息（FileUploadedEvent）
    ↓
消息消费者（如：缩略图生成、病毒扫描）
    ↓
处理完成，更新文件元数据
```

## 数据库设计

### 多租户策略

**数据库隔离模式：**
- Host 使用默认数据库（`claymo_host`）
- 每个 Tenant 可配置独立数据库或共享数据库

**表结构：**
- 所有业务表包含 `TenantId` 字段（Guid? 可为 null）
- ABP 自动过滤查询（Multi-Tenancy Filter）
- Host 数据：`TenantId = null`
- Tenant 数据：`TenantId = {具体租户ID}`

### 缓存策略

| 缓存类型 | Key 模式 | 过期时间 | 用途 |
|---|---|---|---|
| 用户信息 | `user:info:{userId}` | 30 分钟 | 用户基本信息缓存 |
| 用户权限 | `user:permissions:{userId}` | 30 分钟 | 用户权限码列表 |
| Session | `session:{sessionId}` | 8 小时 | Admin Session 存储 |
| Refresh Token | `refresh:{tokenHash}` | - | Token 黑名单（数据库存储） |

### 索引策略

```sql
-- 用户表
CREATE INDEX idx_user_normalized_username ON users(normalized_user_name);
CREATE INDEX idx_user_normalized_email ON users(normalized_email);
CREATE INDEX idx_user_tenant ON users(tenant_id);

-- 审计日志
CREATE INDEX idx_auditlog_userid_time ON audit_logs(user_id, execution_time);
CREATE INDEX idx_auditlog_tenant_time ON audit_logs(tenant_id, execution_time);
```

## 部署架构

### Docker Compose（开发/小规模生产）

```yaml
services:
  mysql: 主数据库
  redis: 缓存 + Session 存储
  api: .NET API 服务
  file-service: Go 文件服务
  gateway: 统一入口（前端 + 反向代理）
```

### Kubernetes（大规模生产）

```
Ingress (Nginx)
    ↓
Service (gateway)
    ├─ Pod: gateway-xxx
    ├─ Pod: gateway-yyy
    └─ ...
Service (api)
    ├─ Pod: api-xxx
    ├─ Pod: api-yyy
    └─ ...
Service (file)
    └─ Pod: file-xxx
StatefulSet (mysql)
StatefulSet (redis)
```

## 性能优化

### 后端优化

1. **查询优化**
   - SqlSugar 延迟加载
   - 合理使用 `Include()` 预加载关联数据
   - 避免 N+1 查询

2. **缓存策略**
   - 热数据缓存（用户信息、权限）
   - 分布式缓存（Redis）
   - 本地缓存（ABP MemoryCache）

3. **异步处理**
   - 登录日志异步写入（领域事件）
   - 长时间任务队列化（Hangfire）

### 前端优化

1. **构建优化**
   - 代码分割（Vite `manualChunks`）
   - Tree Shaking
   - 压缩（Gzip + Brotli）

2. **运行时优化**
   - 路由懒加载
   - 虚拟滚动（长列表）
   - 防抖节流（搜索、滚动）

3. **网络优化**
   - HTTP/2
   - 资源预加载
   - CDN（生产环境）

## 安全策略

### 认证安全

- JWT 短期有效（15 分钟）
- Refresh Token 轮转（Rotation + Reuse Detection）
- Session 持久化到 Redis，自动过期
- 密码哈希（PBKDF2）

### 授权安全

- RBAC（基于角色的权限控制）
- 细粒度权限（模块.功能.操作）
- 动态权限检查（`[RequirePermission]`）

### 数据安全

- SQL 注入防护（SqlSugar 参数化查询）
- XSS 防护（前端转义 + CSP）
- CSRF 防护（SameSite Cookie）
- HTTPS 强制（生产环境）

### 审计追踪

- 请求审计（AuditLogging 模块）
- 实体变更跟踪（Entity Change）
- 登录日志（LoginLog）

## 扩展性设计

### 水平扩展

- **无状态设计**：Session 存储在 Redis
- **负载均衡**：Gateway/API 多实例部署
- **数据库读写分离**：SqlSugar 支持主从配置

### 垂直扩展

- **模块化**：新功能独立模块开发
- **插件化**：ABP 模块系统
- **多语言**：国际化支持（ABP Localization）

---

## 参考资料

- [ABP Framework 文档](https://docs.abp.io/)
- [SqlSugar 文档](https://www.donet5.com/Home/Doc)
- [Vue 3 文档](https://cn.vuejs.org/)
- [YARP 文档](https://microsoft.github.io/reverse-proxy/)

