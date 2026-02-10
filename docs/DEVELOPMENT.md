# ClayMo 开发指南

## 前置要求

### 必需工具

| 工具 | 版本要求 | 用途 |
|---|---|---|
| Docker | 20.10+ | 运行基础设施（MySQL、Redis） |
| Node.js | 18.0+ | 前端开发 |
| pnpm | 9.0+ | 包管理器 |
| .NET SDK | 10.0+ | 后端开发 |
| Go | 1.21+ | 文件服务开发 |
| mkcert | 最新 | 生成本地 HTTPS 证书 |

### 可选工具

- Visual Studio 2022 / Rider：.NET 开发 IDE
- VS Code：跨平台代码编辑器
- Postman / Insomnia：API 测试工具
- DataGrip / MySQL Workbench：数据库管理工具
- RedisInsight：Redis 管理工具

---

## 环境搭建

### 1. 克隆项目

```bash
git clone https://github.com/yourname/claymo.git
cd claymo
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，设置开发环境配置
# 通常保持默认值即可，注意修改数据库密码
```

### 3. 生成 HTTPS 证书

```bash
# 安装 mkcert（仅首次需要）
# Windows: choco install mkcert
# macOS: brew install mkcert
# Linux: 参考 https://github.com/FiloSottile/mkcert#installation

# 安装本地 CA
mkcert -install

# 生成证书（在项目根目录执行）
cd infra/cert
mkcert claymo.local "*.claymo.local" localhost 127.0.0.1

# 证书文件将生成为：
# - claymo.local+3.pem（公钥）
# - claymo.local+3-key.pem（私钥）
```

### 4. 配置 hosts 文件

添加以下内容到系统 hosts 文件：

```
127.0.0.1 claymo.local
127.0.0.1 admin.claymo.local
```

**文件位置：**
- Windows: `C:\Windows\System32\drivers\etc\hosts`
- Linux/Mac: `/etc/hosts`

**Windows 编辑方法：**
```powershell
# 以管理员身份运行 PowerShell
notepad C:\Windows\System32\drivers\etc\hosts
```

### 5. 启动基础设施

```bash
# 启动 MySQL 和 Redis
docker compose up -d mysql redis

# 等待服务就绪（约 30 秒）
docker compose logs -f mysql
# 看到 "ready for connections" 即可 Ctrl+C 退出
```

### 6. 初始化数据库

```bash
# 方式 1：使用 CLI 工具
cd backend/tools/ClayMo.Tools.Platform
dotnet run -- migrate --seed

# 方式 2：启动 API 服务（首次运行会自动迁移）
cd backend/src/ClayMo.Abp.Web
dotnet run
```

### 7. 安装前端依赖

```bash
# 在项目根目录执行
pnpm install
```

---

## 本地开发

### 方案 1：全部在 Docker 中运行（推荐新手）

```bash
# 启动所有服务
docker compose --profile full up -d

# 访问
# Web: https://claymo.local:5443
# Admin: https://admin.claymo.local:5443
# API: https://claymo.local:5443/api/swagger

# 查看日志
docker compose logs -f gateway api file-service

# 停止所有服务
docker compose down
```

### 方案 2：本地开发模式（支持热重载）

#### 启动后端 API

```bash
# 终端 1：启动基础设施
docker compose up -d mysql redis

# 终端 2：启动 API 服务
cd backend/src/ClayMo.Abp.Web
dotnet watch run
# API 将运行在 http://localhost:19001
```

#### 启动文件服务

```bash
# 终端 3：启动文件服务
cd services/file-service
go run .
# 文件服务将运行在 http://localhost:8889
```

#### 启动前端开发服务器

```bash
# 终端 4：启动 Web 前端
cd frontend/web
pnpm dev
# Web 将运行在 https://claymo.local:3001

# 终端 5：启动 Admin 后台
cd frontend/admin
pnpm dev
# Admin 将运行在 https://admin.claymo.local:3000
```

#### 启动网关（可选）

如果需要完整测试网关功能：

```bash
# 终端 6：启动网关
cd services/gateway
dotnet watch run
# 网关将运行在 https://claymo.local:5443
```

**注意：** 本地开发模式下，前端默认直接访问 Vite 开发服务器（3000/3001 端口），不经过网关。这样可以使用 Vite 的 HMR（热模块替换）功能。

---

## 常用命令

### 前端命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev              # 启动 Web 前端
pnpm dev:admin        # 启动 Admin 后台

# 构建生产版本
pnpm build            # 构建 Web
pnpm build:admin      # 构建 Admin

# 代码检查
pnpm lint             # ESLint 检查
pnpm lint:fix         # 自动修复 ESLint 问题

# 类型检查
pnpm type-check       # TypeScript 类型检查
```

### 后端命令

```bash
# 编译项目
dotnet build

# 运行项目（支持热重载）
dotnet watch run

# 运行测试
dotnet test

# 清理构建产物
dotnet clean

# 还原 NuGet 包
dotnet restore

# 发布生产版本
dotnet publish -c Release -o ./publish
```

### Docker 命令

```bash
# 启动所有服务
docker compose --profile full up -d

# 启动基础设施
docker compose up -d mysql redis

# 查看日志
docker compose logs -f                  # 所有服务
docker compose logs -f gateway api      # 指定服务

# 停止服务
docker compose stop

# 停止并删除容器（保留数据）
docker compose down

# 停止并删除容器和数据卷
docker compose down -v

# 重启服务
docker compose restart gateway

# 重新构建镜像
docker compose build --no-cache api
docker compose up -d api
```

### 数据库命令

```bash
# 进入 MySQL 容器
docker compose exec mysql mysql -u root -p

# 导出数据库
docker compose exec mysql mysqldump -u root -p claymo_host > backup.sql

# 导入数据库
docker compose exec -T mysql mysql -u root -p claymo_host < backup.sql

# 重置数据库（危险操作）
docker compose down -v mysql
docker compose up -d mysql
```

---

## 项目结构

### 后端结构

```
backend/
├── framework/                      # 框架层
│   ├── ClayMo.Framework.Authentication/   # 认证（JWT、Session）
│   ├── ClayMo.Framework.Authorization/    # 授权（RBAC）
│   ├── ClayMo.Framework.SqlSugar/         # ORM 集成
│   ├── ClayMo.Framework.AspNetCore/       # ASP.NET Core 扩展
│   └── ...
│
├── modules/                        # 业务模块
│   ├── identity/                   # 用户、角色、权限
│   │   ├── ClayMo.Module.Identity.Domain.Shared/
│   │   ├── ClayMo.Module.Identity.Domain/
│   │   ├── ClayMo.Module.Identity.Application.Contracts/
│   │   ├── ClayMo.Module.Identity.Application/
│   │   └── ClayMo.Module.Identity.SqlSugar/
│   ├── kb/                         # 知识库
│   ├── workspace/                  # 工作区
│   ├── tenantmanagement/           # 租户管理
│   └── auditlogging/               # 审计日志
│
├── src/                            # 主应用
│   ├── ClayMo.Abp.Domain.Shared/
│   ├── ClayMo.Abp.Domain/
│   ├── ClayMo.Abp.Application.Contracts/
│   ├── ClayMo.Abp.Application/
│   ├── ClayMo.Abp.SqlSugar/
│   └── ClayMo.Abp.Web/            # 启动项目
│
└── tools/                          # CLI 工具
    └── ClayMo.Tools.Platform/      # 数据库迁移、种子工具
```

### 前端结构

```
frontend/
├── admin/                          # Admin 后台
│   ├── src/
│   │   ├── api/                    # API 接口封装
│   │   ├── layout/                 # 布局组件
│   │   ├── router/                 # 路由配置
│   │   ├── stores/                 # Pinia 状态管理
│   │   ├── styles/                 # 全局样式
│   │   ├── types/                  # TypeScript 类型
│   │   ├── utils/                  # 工具函数
│   │   └── views/                  # 页面组件
│   ├── vite.config.ts
│   └── package.json
│
└── web/                            # Web 前端
    ├── src/
    │   ├── api/modules/            # API 模块
    │   ├── components/             # 通用组件
    │   ├── layouts/                # 布局
    │   ├── router/                 # 路由
    │   ├── stores/                 # 状态管理
    │   ├── utils/                  # 工具
    │   └── views/                  # 页面
    ├── vite.config.ts
    └── package.json
```

---

## 开发规范

### Git 规范

#### Commit Message 格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构（既不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关

**示例：**

```bash
git commit -m "feat(identity): 添加用户头像上传功能"
git commit -m "fix(gateway): 修复 CORS 配置导致的跨域问题"
git commit -m "docs: 更新开发指南和架构文档"
```

#### 分支策略

- `main`: 主分支（稳定版本）
- `develop`: 开发分支
- `feature/xxx`: 功能分支
- `fix/xxx`: 修复分支
- `release/vx.x.x`: 发布分支

**工作流：**

```bash
# 创建功能分支
git checkout -b feature/user-avatar develop

# 开发...

# 提交
git add .
git commit -m "feat(identity): 添加用户头像上传"

# 推送
git push origin feature/user-avatar

# 合并到 develop
git checkout develop
git merge --no-ff feature/user-avatar
git push origin develop
```

### 代码规范

#### .NET 代码规范

遵循 [.NET 编码约定](https://learn.microsoft.com/zh-cn/dotnet/csharp/fundamentals/coding-style/coding-conventions)：

- 使用 PascalCase 命名类、方法、属性
- 使用 camelCase 命名局部变量、参数
- 使用 `_camelCase` 命名私有字段
- 接口以 `I` 开头（如 `IUserRepository`）
- 异步方法以 `Async` 结尾（如 `GetUserAsync`）
- 使用 `var` 当类型明显时
- 使用 4 空格缩进

**示例：**

```csharp
public class UserAppService : ApplicationService, IUserAppService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserAppService> _logger;

    public UserAppService(
        IUserRepository userRepository,
        ILogger<UserAppService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<UserDto> GetAsync(Guid id)
    {
        var user = await _userRepository.GetAsync(id);
        return ObjectMapper.Map<User, UserDto>(user);
    }
}
```

#### TypeScript/Vue 代码规范

- 使用 ESLint + Prettier 配置（项目已配置）
- 组件使用 PascalCase（如 `UserList.vue`）
- 组合式函数使用 `use` 前缀（如 `useAuth.ts`）
- 常量使用 UPPER_SNAKE_CASE
- 使用 2 空格缩进

**示例：**

```typescript
// ========================================
// API 接口
// ========================================

export interface LoginRequest {
  userName: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  expireAtUtc: string
}

// ========================================
// API 方法
// ========================================

export function login(data: LoginRequest): Promise<LoginResponse> {
  return http.post('/api/app/auth/login', data)
}
```

### JSDoc 注释规范

所有公共 API 方法都需要添加 JSDoc 注释：

```typescript
/**
 * 用户登录
 * POST /api/admin/auth/login
 * @param data 登录信息（用户名和密码）
 * @returns 登录响应（Session 过期时间）
 */
export function adminLogin(data: AdminSessionLoginInputDto): Promise<AdminSessionLoginOutputDto> {
  return post('/admin/auth/login', data)
}
```

---

## 调试技巧

### 后端调试

#### Visual Studio / Rider

1. 在代码中设置断点
2. 按 F5 启动调试
3. 使用 Postman 发送请求触发断点

#### VS Code

1. 安装 C# Dev Kit 插件
2. 在 `.vscode/launch.json` 中配置：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": ".NET Core Launch (web)",
      "type": "coreclr",
      "request": "launch",
      "preLaunchTask": "build",
      "program": "${workspaceFolder}/backend/src/ClayMo.Abp.Web/bin/Debug/net10.0/ClayMo.Abp.Web.dll",
      "args": [],
      "cwd": "${workspaceFolder}/backend/src/ClayMo.Abp.Web",
      "stopAtEntry": false,
      "env": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  ]
}
```

3. 按 F5 启动调试

### 前端调试

#### 浏览器 DevTools

1. 打开浏览器开发者工具（F12）
2. Sources 面板可以设置断点
3. Console 面板查看日志

#### VS Code 调试

1. 安装 Chrome Debugger 插件
2. 在 `.vscode/launch.json` 中配置：

```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Debug Admin",
  "url": "https://admin.claymo.local:3000",
  "webRoot": "${workspaceFolder}/frontend/admin/src"
}
```

3. 启动 Vite 开发服务器
4. 在 VS Code 中按 F5

---

## 常见问题

### Q1: 证书问题（ERR_CERT_AUTHORITY_INVALID）

**问题：** 浏览器提示证书不安全

**解决方案：**

```bash
# 重新安装 mkcert CA
mkcert -install

# 重新生成证书
cd infra/cert
rm *.pem
mkcert claymo.local "*.claymo.local" localhost 127.0.0.1
```

### Q2: hosts 文件修改无效

**问题：** 修改 hosts 文件后仍然无法解析域名

**解决方案：**

```bash
# Windows: 刷新 DNS 缓存
ipconfig /flushdns

# macOS: 刷新 DNS 缓存
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Linux: 刷新 DNS 缓存
sudo systemd-resolve --flush-caches
```

### Q3: Docker 容器启动失败

**问题：** MySQL 或 Redis 容器无法启动

**解决方案：**

```bash
# 查看容器日志
docker compose logs mysql

# 检查端口占用
# Windows
netstat -ano | findstr "3306"
netstat -ano | findstr "6379"

# Linux/Mac
lsof -i :3306
lsof -i :6379

# 停止占用端口的服务或修改 docker-compose.yml 中的端口映射
```

### Q4: pnpm install 失败

**问题：** 依赖安装失败或速度慢

**解决方案：**

```bash
# 使用国内镜像
pnpm config set registry https://registry.npmmirror.com

# 清除缓存重试
pnpm store prune
pnpm install --force
```

### Q5: 数据库连接失败

**问题：** API 启动时提示无法连接数据库

**解决方案：**

1. 检查 MySQL 容器是否正常运行：
   ```bash
   docker compose ps mysql
   ```

2. 检查 `appsettings.json` 中的连接字符串：
   ```json
   {
     "ConnectionStrings": {
       "Default": "Server=localhost;Port=3307;Database=claymo_host;User Id=root;Password=123456;"
     }
   }
   ```

3. 确认端口映射是否正确（本地开发使用 3307 避免与系统 MySQL 冲突）

---

## 性能优化建议

### 后端性能

1. **查询优化**
   - 使用 SqlSugar 的 `.Select()` 只查询需要的字段
   - 合理使用 `.Includes()` 避免 N+1 查询
   - 复杂查询使用原生 SQL

2. **缓存策略**
   - 热数据使用 Redis 缓存
   - 用户权限缓存 30 分钟
   - 配置数据永久缓存（监听变更事件清除）

3. **异步处理**
   - 日志记录异步化（领域事件）
   - 耗时任务队列化（Hangfire）

### 前端性能

1. **构建优化**
   - 启用代码分割
   - Tree Shaking 去除未使用代码
   - 图片压缩和懒加载

2. **运行时优化**
   - 使用虚拟滚动（长列表）
   - 防抖节流（搜索、滚动）
   - 合理使用 `computed` 和 `watch`

---

## 相关资源

- [ClayMo 架构文档](./ARCHITECTURE.md)
- [部署指南](./DEPLOYMENT.md)
- [ABP Framework 官方文档](https://docs.abp.io/)
- [Vue 3 官方文档](https://cn.vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [SqlSugar 文档](https://www.donet5.com/Home/Doc)

