# ClayMo 更新日志

所有重要的项目变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### Added
- 完整的架构文档 (`docs/ARCHITECTURE.md`)
- 开发指南文档 (`docs/DEVELOPMENT.md`)
- 部署指南文档 (`docs/DEPLOYMENT.md`)
- 常见问题文档 (`docs/FAQ.md`)
- 子域名隔离架构，解决 Admin 和 Web Cookie 混用问题
- 统一的 `.env.example` 环境变量模板
- 完善的 `.gitignore` 配置

### Changed
- **重构 Identity 模块**
  - 将 `GetCurrentUserAsync` 移至 `UserAppService.GetMeAsync`
  - 将 `FindAndVerifyUserAsync` 下沉至 `UserRepository.FindAndVerifyAsync`
  - 将 `RecordLoginLogAsync` 改为领域事件 `LoginAttemptedEvent`
  - 删除 `AuthServiceBase`，逻辑分散到各自的 Controller/AppService
- **前端架构优化**
  - Admin 前端迁移至子域名 `admin.yourdomain.com`
  - Web 前端迁移至主域名 `www.yourdomain.com`
  - API 端点统一改为 `/api/app/users/me`

### Removed
- 删除 `Todo.md`（个人开发笔记）
- 删除 `backend/modules/identity/admin-portal.md`（已实现的需求文档）
- 删除 `docker.env.example`（与 `.env.example` 重复）
- 删除 `docker-compose.dev.yml`（功能重复）
- 删除 `docker-compose.prod.yml`（通过 `.env` 区分环境）
- 删除 `deploy.sh`（由详细文档指导部署）
- 删除 `scripts/docker/rebuild.sh` 和 `start-dev.sh`（Linux 脚本）

---

## [0.1.0] - 2026-02-10

### Added
- 项目初始化
- 基础架构搭建（.NET 10 + Vue 3 + MySQL + Redis）
- Identity 模块（用户、角色、权限、认证）
- TenantManagement 模块（多租户管理）
- Workspace 模块（工作区、专注模式）
- Knowledge 模块（知识库）
- AuditLogging 模块（审计日志）
- Gateway 服务（YARP 反向代理 + 静态文件）
- File Service（Go 文件服务）
- Admin 后台前端（Vue 3 + Element Plus）
- Web 前端（Vue 3 + 自定义组件）
- Docker Compose 一键部署
- 认证系统（JWT + Session）
- 权限系统（RBAC）
- 审计日志系统

### Security
- JWT 短期有效（15 分钟）
- Refresh Token 轮转（Rotation + Reuse Detection）
- Session 持久化到 Redis
- 密码哈希（PBKDF2）
- HTTPS 强制（生产环境）
- CORS 配置
- 子域名 Cookie 隔离

---

## 版本号说明

版本格式：`主版本号.次版本号.修订号`

- **主版本号**：架构或不兼容的重大变更
- **次版本号**：新功能或功能增强
- **修订号**：Bug 修复和小优化

---

## 标签说明

- `Added`：新增功能
- `Changed`：功能变更
- `Deprecated`：即将废弃的功能
- `Removed`：已删除的功能
- `Fixed`：Bug 修复
- `Security`：安全相关更新

---

## 贡献指南

提交更新日志时请遵循以下规范：

1. 在 `[Unreleased]` 部分添加变更
2. 使用标签分类（Added、Changed、Fixed 等）
3. 描述清晰，说明影响范围
4. 重大变更需要额外说明升级方法

示例：

```markdown
## [Unreleased]

### Added
- 新增用户头像上传功能 (#123)
- 新增团队邀请邮件通知 (#124)

### Changed
- 优化知识库搜索性能，减少 50% 查询时间 (#125)

### Fixed
- 修复多租户下权限缓存失效问题 (#126)
```

---

## 发布流程

1. 更新 CHANGELOG.md，将 `[Unreleased]` 改为版本号
2. 更新项目版本号（`package.json`、`*.csproj`）
3. 提交代码：`git commit -m "chore: release v0.2.0"`
4. 打标签：`git tag -a v0.2.0 -m "Release v0.2.0"`
5. 推送：`git push origin main --tags`
6. 在 GitHub 创建 Release，复制 CHANGELOG 内容

