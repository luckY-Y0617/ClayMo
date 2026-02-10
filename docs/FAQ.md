# ClayMo 常见问题

## 环境与安装

### Q1: Windows 上如何修改 hosts 文件？

**A:** 

1. 以管理员身份运行记事本或其他文本编辑器
2. 打开文件 `C:\Windows\System32\drivers\etc\hosts`
3. 在末尾添加：
   ```
   127.0.0.1 claymo.local
   127.0.0.1 admin.claymo.local
   ```
4. 保存文件
5. 刷新 DNS 缓存：
   ```powershell
   ipconfig /flushdns
   ```

### Q2: 浏览器提示证书不安全怎么办？

**A:** 

需要安装 mkcert 的本地 CA 证书：

```bash
# 安装 CA（仅首次需要）
mkcert -install

# 重新生成证书
cd infra/cert
rm *.pem
mkcert claymo.local "*.claymo.local" localhost 127.0.0.1
```

重启浏览器后应该就能正常访问了。

### Q3: Docker 容器启动失败怎么办?

**A:** 

1. **检查端口占用**
   ```powershell
   # Windows
   netstat -ano | findstr "3306"
   netstat -ano | findstr "6379"
   
   # 如果端口被占用,修改 docker-compose.yml 中的端口映射
   # 或停止占用端口的服务
   ```

2. **查看容器日志**
   ```bash
   docker compose logs mysql
   docker compose logs redis
   ```

3. **重置容器和数据**
   ```bash
   docker compose down -v
   docker compose up -d
   ```

### Q4: pnpm install 失败或速度慢

**A:** 

使用国内镜像源：

```bash
# 设置淘宝镜像
pnpm config set registry https://registry.npmmirror.com

# 清除缓存重试
pnpm store prune
pnpm install --force
```

---

## 开发相关

### Q5: 如何重置数据库？

**A:** 

```bash
# 方式 1: 删除容器和数据卷
docker compose down -v mysql
docker compose up -d mysql

# 等待 MySQL 启动后，运行迁移
cd backend/tools/ClayMo.Tools.Platform
dotnet run -- migrate --seed

# 方式 2: 使用 MySQL 客户端
docker compose exec mysql mysql -u root -p
DROP DATABASE claymo_host;
CREATE DATABASE claymo_host;
exit
# 然后运行迁移
```

### Q6: 如何查看 API 日志？

**A:** 

**Docker 模式：**
```bash
docker compose logs -f api
```

**本地开发模式：**
日志会直接输出到启动 `dotnet run` 的终端窗口。

### Q7: 如何调试前端代码？

**A:** 

1. **浏览器 DevTools（推荐）**
   - 按 F12 打开开发者工具
   - Sources 面板设置断点
   - Console 面板查看日志

2. **VS Code 调试**
   - 安装 Chrome Debugger 插件
   - 在 `.vscode/launch.json` 添加配置：
     ```json
     {
       "type": "chrome",
       "request": "launch",
       "name": "Debug Admin",
       "url": "https://admin.claymo.local:3000",
       "webRoot": "${workspaceFolder}/frontend/admin/src"
     }
     ```
   - 启动前端开发服务器后，按 F5

### Q8: 如何添加新的 API 接口？

**A:** 

1. **定义 DTO**（在 `Application.Contracts` 项目）
   ```csharp
   // Dtos/MyDto.cs
   public class MyInputDto
   {
       public string Name { get; set; }
   }
   
   public class MyOutputDto
   {
       public Guid Id { get; set; }
       public string Name { get; set; }
   }
   ```

2. **添加接口定义**
   ```csharp
   // IMyAppService.cs
   public interface IMyAppService : IApplicationService
   {
       Task<MyOutputDto> CreateAsync(MyInputDto input);
   }
   ```

3. **实现服务**（在 `Application` 项目）
   ```csharp
   [Authorize]
   [ApiController]
   [Route("/api/app/my")]
   public class MyAppService : ApplicationService, IMyAppService
   {
       [HttpPost]
       public async Task<MyOutputDto> CreateAsync(MyInputDto input)
       {
           // 业务逻辑
           return new MyOutputDto { Id = Guid.NewGuid(), Name = input.Name };
       }
   }
   ```

4. **前端调用**
   ```typescript
   // frontend/web/src/api/modules/my.ts
   export function create(data: MyInputDto): Promise<MyOutputDto> {
     return http.post('/api/app/my', data)
   }
   ```

---

## 认证与授权

### Q9: Admin 和 Web 的认证有什么区别？

**A:** 

| 维度 | Admin 后台 | Web 前台 |
|---|---|---|
| **域名** | admin.claymo.local | claymo.local |
| **认证方式** | Session Cookie (`claymo.sid`) | JWT Bearer Token |
| **续期方式** | 服务端续期（8 小时） | Refresh Token 刷新（15 分钟 + 7 天） |
| **存储位置** | Redis Session | Refresh Token 存数据库 + 访问令牌存内存 |
| **适用场景** | 管理后台（长会话） | 用户端（无感刷新） |

### Q10: 如何获取当前登录用户信息？

**A:** 

**后端：**
```csharp
// 在 ApplicationService 中
var userId = CurrentUser.GetId();
var userName = CurrentUser.UserName;
var tenantId = CurrentTenant.Id;
```

**前端（Admin）：**
```typescript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
console.log(authStore.user)
```

**前端（Web）：**
```typescript
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
console.log(userStore.currentUser)
```

### Q11: 如何添加新权限？

**A:** 

1. **定义权限码**（在 `Domain.Shared` 项目）
   ```csharp
   // Permissions/SystemPermissions.cs
   public static class SystemPermissions
   {
       public static class MyModule
       {
           public const string View = "system.mymodule.view";
           public const string Manage = "system.mymodule.manage";
       }
   }
   ```

2. **在接口上添加权限检查**
   ```csharp
   [RequirePermission(SystemPermissions.MyModule.View)]
   public async Task<MyDto> GetAsync(Guid id)
   {
       // ...
   }
   ```

3. **在管理后台分配权限**
   - 登录 Admin 后台
   - 系统管理 → 角色管理
   - 选择角色 → 分配权限
   - 在权限树中勾选新权限

---

## 部署相关

### Q12: 如何部署到生产服务器？

**A:** 

详细步骤请参考 [部署指南](./DEPLOYMENT.md)。

简要步骤：

1. 准备服务器（Ubuntu 20.04+ / CentOS 8+）
2. 安装 Docker 和 Docker Compose
3. 配置域名和 SSL 证书
4. 克隆项目并配置 `.env`
5. 运行 `docker compose --profile full up -d`
6. 配置 Nginx 反向代理

### Q13: 如何备份数据库？

**A:** 

```bash
# 导出数据库
docker compose exec mysql mysqldump -u root -p claymo_host > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker compose exec -T mysql mysql -u root -p claymo_host < backup_20260210_120000.sql
```

### Q14: 如何更新线上代码？

**A:** 

**方式 1: 滚动更新（推荐）**
```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker compose build --no-cache gateway api file-service

# 滚动更新（不停机）
docker compose up -d --no-deps --build gateway
docker compose up -d --no-deps --build api
docker compose up -d --no-deps --build file-service
```

**方式 2: 停机更新**
```bash
git pull origin main
docker compose down
docker compose --profile full up -d --build
```

---

## 性能与优化

### Q15: 如何优化前端加载速度？

**A:** 

1. **启用压缩**
   ```typescript
   // vite.config.ts
   import viteCompression from 'vite-plugin-compression'
   
   export default {
     plugins: [
       viteCompression({
         algorithm: 'brotliCompress',
         ext: '.br'
       })
     ]
   }
   ```

2. **代码分割**
   ```typescript
   // 路由懒加载
   const UserList = () => import('@/views/system/users/UserList.vue')
   ```

3. **CDN 加速**
   - 在生产环境使用 CDN 托管静态资源
   - 配置 `base` 路径指向 CDN

### Q16: 如何优化 API 查询性能？

**A:** 

1. **添加索引**
   ```csharp
   // 在实体配置中
   builder.HasIndex(x => x.UserName);
   builder.HasIndex(x => new { x.TenantId, x.CreationTime });
   ```

2. **使用缓存**
   ```csharp
   var cacheKey = $"user:info:{userId}";
   var user = await _cache.GetOrAddAsync(
       cacheKey,
       async () => await _userRepository.GetAsync(userId),
       TimeSpan.FromMinutes(30)
   );
   ```

3. **分页查询**
   ```csharp
   var pagedResult = await _userRepository
       .GetQueryableAsync()
       .Skip(skipCount)
       .Take(maxResultCount)
       .ToListAsync();
   ```

---

## 多租户

### Q17: 如何为新租户初始化数据？

**A:** 

```bash
# 方式 1: 通过 Admin 后台
# 租户管理 → 创建租户 → 勾选"自动初始化"

# 方式 2: 使用 CLI 工具
cd backend/tools/ClayMo.Tools.Platform
dotnet run -- migrate --tenant-name "YourTenantName"
dotnet run -- seed --tenant-name "YourTenantName"
```

### Q18: 如何切换租户？

**A:** 

当前系统使用基于域名的租户识别（未来扩展）。

**临时方案：** 在 API 请求中添加 `X-Tenant-Id` 请求头。

**未来方案：** 
- 子域名识别：`tenant1.yourdomain.com`
- 路径识别：`yourdomain.com/tenant1`

---

## 错误处理

### Q19: 遇到 401 Unauthorized 怎么办？

**A:** 

1. **检查 Token 是否有效**
   ```typescript
   // 前端查看本地存储
   console.log(localStorage.getItem('access_token'))
   ```

2. **检查 Refresh Token**
   ```bash
   # 查看浏览器 Cookie
   # 应该有 claymo.rt（Web） 或 claymo.sid（Admin）
   ```

3. **手动刷新 Token**
   ```typescript
   // Web 前端
   await authApi.refresh()
   ```

4. **重新登录**
   ```typescript
   await authApi.logout()
   router.push('/login')
   ```

### Q20: 遇到 403 Forbidden 怎么办？

**A:** 

403 表示权限不足：

1. **检查用户权限**
   ```bash
   # 查看当前用户权限
   GET /api/app/users/me
   ```

2. **检查接口权限要求**
   ```csharp
   // 查看后端代码
   [RequirePermission(SystemPermissions.Users.Manage)]
   ```

3. **分配权限**
   - 登录 Admin 后台
   - 角色管理 → 选择角色 → 分配权限
   - 或：用户管理 → 选择用户 → 分配角色

---

## 其他

### Q21: 如何贡献代码？

**A:** 

1. Fork 项目到你的 GitHub
2. 创建功能分支：`git checkout -b feature/my-feature`
3. 提交更改：`git commit -m "feat: add my feature"`
4. 推送分支：`git push origin feature/my-feature`
5. 提交 Pull Request

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### Q22: 如何报告 Bug？

**A:** 

在 GitHub Issues 中创建新 Issue，包含：

- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 环境信息（操作系统、浏览器、.NET/Node.js 版本等）
- 错误日志/截图

### Q23: 如何联系作者？

**A:** 

- GitHub Issues: [https://github.com/yourname/claymo/issues](https://github.com/yourname/claymo/issues)
- Email: your-email@example.com

---

## 更多问题？

如果以上 FAQ 没有解决你的问题，请查看：

- [开发指南](./DEVELOPMENT.md)
- [架构文档](./ARCHITECTURE.md)
- [部署指南](./DEPLOYMENT.md)
- [GitHub Discussions](https://github.com/yourname/claymo/discussions)

