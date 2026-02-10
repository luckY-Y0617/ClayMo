<p align="center">
  <img src="" width="80" alt="ClayMo Logo" />
</p>

<h1 align="center">ClayMo</h1>

<p align="center">
  <strong>知识管理与效率工具平台</strong><br>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> •
  <a href="#项目结构">项目结构</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="docs/DEVELOPMENT.md">开发</a> •
  <a href="docs/DEPLOYMENT.md">部署</a> •
  <a href="docs/FAQ.md">FAQ</a>
</p>

---

## 这是什么？

ClayMo 是一个面向个人和小团队的知识管理平台。

核心功能：
- 📚 **知识库** - 支持富文本编辑、文档树、版本历史
- 🎯 **专注模式** - 番茄钟 + 目标追踪
- 👥 **团队协作** - 多租户、权限管理、审计日志
- 🔐 **企业级安全** - RBAC、会话管理、操作审计

## 快速开始

**前置要求**：Docker、Node.js 18+、pnpm 9+

```bash
# 克隆仓库
git clone https://github.com/yourname/claymo.git
cd claymo

# 一键启动所有服务
docker compose --profile full up -d

# 访问
# Web 前端: https://claymo.local:5443
# Admin 后台: https://admin.claymo.local:5443
# API 文档: https://claymo.local:5443/api/swagger
```

首次启动会自动执行数据库迁移和种子数据初始化，耐心等待约 2 分钟。

<details>
<summary><b>本地开发模式（热重载）</b></summary>

```bash
# 1. 启动基础设施
docker compose up -d mysql redis

# 2. 安装前端依赖
pnpm install

# 3. 启动后端 (另开终端)
cd backend/src/ClayMo.Abp.Web
dotnet run

# 4. 启动前端
pnpm dev        # Web 前端
pnpm dev:admin  # Admin 后台
```

</details>

## 项目结构

```
claymo/
├── backend/                 # .NET 后端
│   ├── framework/           # 框架层 (认证、授权、ORM 抽象)
│   ├── modules/             # 业务模块
│   │   ├── identity/        # 用户、角色、权限
│   │   ├── kb/              # 知识库
│   │   ├── workspace/       # 工作区、专注模式
│   │   ├── tenantmanagement/# 多租户
│   │   └── auditlogging/    # 审计日志
│   ├── src/                 # 主应用
│   └── tools/               # CLI 工具 (迁移、种子)
│
├── frontend/
│   ├── web/                 # 用户端 (Vue 3 + Vite)
│   └── admin/               # 管理后台 (Vue 3 + Element Plus)
│
├── services/
│   ├── gateway/             # API 网关 (YARP + 静态文件)
│   └── file-service/        # 文件服务 (Go + go-zero)
│
├── packages/
│   ├── contracts/           # 跨语言契约 (API、事件、Proto)
│   ├── libs/                # 共享库 (ts-common, go-common)
│   └── sdk/                 # 客户端 SDK
│
└── infra/                   # 基础设施配置
```

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Vue 3, TypeScript, Vite, Pinia, TipTap Editor |
| **后端** | .NET 10, ABP Framework, SqlSugar |
| **网关** | YARP (Yet Another Reverse Proxy) |
| **文件服务** | Go, go-zero |
| **数据库** | MySQL 8.0, Redis |
| **消息队列** | Kafka (可选) |
| **容器化** | Docker, Docker Compose |

### 为什么是 SqlSugar 而不是 EF Core？

SqlSugar 在国内项目中更常见，对复杂查询和分表分库支持更好。ABP 官方用 EF Core，但这个项目通过自定义 `ClayMo.Framework.SqlSugar` 模块实现了无缝集成。

## 开发指南

### 环境配置

```bash
# 创建环境变量文件
cp .env.example .env

# 生成本地 HTTPS 证书 (需要先安装 mkcert)
cd infra/cert
mkcert -install
mkcert claymo.local "*.claymo.local" localhost 127.0.0.1

# 配置本地 hosts 文件
# Windows: C:\Windows\System32\drivers\etc\hosts
# Linux/Mac: /etc/hosts
# 添加以下内容：
# 127.0.0.1 claymo.local
# 127.0.0.1 admin.claymo.local
```

### 常用命令

```bash
# 前端
pnpm dev              # 启动 Web 开发服务器
pnpm dev:admin        # 启动 Admin 开发服务器
pnpm build            # 构建生产版本
pnpm lint             # 代码检查

# 后端
dotnet build          # 编译
dotnet test           # 运行测试
dotnet run            # 启动 API

# Docker
docker compose --profile full up -d    # 启动全部
docker compose logs -f gateway         # 查看日志
docker compose down -v                 # 停止并清理数据
```

### 添加新模块

后端模块遵循 DDD 分层：

```
modules/your-module/
├── ClayMo.Module.YourModule.Domain.Shared/     # 共享常量、枚举
├── ClayMo.Module.YourModule.Domain/            # 实体、仓储接口
├── ClayMo.Module.YourModule.Application.Contracts/  # DTO、服务接口
├── ClayMo.Module.YourModule.Application/       # 业务逻辑
└── ClayMo.Module.YourModule.SqlSugar/          # 数据访问
```

## 部署

### Docker Compose (推荐)

```bash
# 生产环境配置
cp .env.example .env
# 编辑 .env 设置生产密钥（JWT_SECRET_KEY、MYSQL_ROOT_PASSWORD 等）

docker compose --profile full up -d

# 详细部署文档请查看
# docs/DEPLOYMENT.md
```

### Kubernetes

CI/CD 会自动构建并推送 Docker 镜像到 GitHub Container Registry：

- `ghcr.io/yourname/claymo-backend`
- `ghcr.io/yourname/claymo-gateway`
- `ghcr.io/yourname/claymo-file-service`
- `ghcr.io/yourname/claymo-cli`

使用 Helm Chart 或 Kustomize 部署到 K8s 集群。

## 架构概览

```
                    ┌─────────────────────────────────────────┐
                    │           Gateway (:5080/:5443)         │
                    │  ┌─────────────────────────────────┐    │
   Browser ────────▶│  │  YARP Reverse Proxy             │    │
                    │  │  + Static Files (Admin/Web)     │    │
                    │  └─────────────────────────────────┘    │
                    └──────────────┬──────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
        ┌──────────┐        ┌──────────┐        ┌──────────┐
        │   API    │        │  File    │        │  Kafka   │
        │ :19001   │        │ Service  │        │ (async)  │
        └────┬─────┘        └────┬─────┘        └──────────┘
             │                   │
             └─────────┬─────────┘
                       ▼
              ┌─────────────────┐
              │  MySQL + Redis  │
              └─────────────────┘
```

## 文档

- [架构文档](docs/ARCHITECTURE.md) - 系统架构、设计决策、技术选型
- [开发指南](docs/DEVELOPMENT.md) - 环境搭建、开发规范、调试技巧
- [部署指南](docs/DEPLOYMENT.md) - 生产环境部署详细步骤
- [常见问题](docs/FAQ.md) - 开发过程中的常见问题和解决方案

## 贡献

欢迎提交 Issue 和 PR。请先阅读代码规范：

- 前端遵循 ESLint + Prettier 配置
- 后端遵循 .NET 编码规范
- Commit message 使用 [Conventional Commits](https://www.conventionalcommits.org/)

详细开发规范请查看 [开发指南](docs/DEVELOPMENT.md)。

## License

MIT © 2024-2026

>>>>>>> be58bd7 (初始化)
