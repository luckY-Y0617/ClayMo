# ClayMo 项目部署检查清单

## ✅ 配置文件完整性检查

### 1. 环境变量配置
- [x] `.env.example` - 环境变量示例文件
- [ ] `.env` - 实际环境变量（需手动创建，已被 .gitignore 忽略）

**首次部署创建 .env：**
```bash
cp .env.example .env
# 修改其中的密码、密钥等敏感信息
```

### 2. SSL 证书（本地开发）
- [x] `infra/cert/.gitkeep` - 证书目录占位文件
- [ ] `infra/cert/claymo.local+3.pem` - 开发证书（需手动生成）
- [ ] `infra/cert/claymo.local+3-key.pem` - 开发私钥（需手动生成）

**生成本地开发证书：**
```bash
# 安装 mkcert
# Windows: choco install mkcert
# macOS: brew install mkcert
# Linux: 参考 https://github.com/FiloSottile/mkcert

# 生成证书
mkcert -install
mkcert claymo.local "*.claymo.local" localhost 127.0.0.1
mv claymo.local+3.pem infra/cert/
mv claymo.local+3-key.pem infra/cert/

# 配置 hosts 文件
# Windows: C:\Windows\System32\drivers\etc\hosts
# Linux/macOS: /etc/hosts
# 添加以下两行：
127.0.0.1  claymo.local
127.0.0.1  admin.claymo.local
```

### 3. Docker 配置
- [x] `docker-compose.yml` - 开发环境配置
- [x] `docker-compose.prod.yml` - 生产环境配置
- [x] `services/gateway/Dockerfile` - Gateway 构建文件
- [x] `deploy.sh` - 部署脚本

### 4. 前端配置
- [x] `frontend/admin/vite.config.ts` - Admin 构建配置
  - ✅ `base: '/'` - 子域名模式根路径
  - ✅ HTTPS 证书路径配置
  - ✅ API 代理配置

- [x] `frontend/web/vite.config.ts` - Web 构建配置
  - ✅ HTTPS 证书路径配置
  - ✅ API 代理配置

### 5. 后端配置
- [x] `services/gateway/appsettings.json` - Gateway 开发配置
- [x] `services/gateway/appsettings.example.json` - 生产配置示例
- [ ] `services/gateway/appsettings.Production.json` - 生产配置（需手动创建）

**创建生产配置：**
```bash
cp services/gateway/appsettings.example.json services/gateway/appsettings.Production.json
# 修改其中的域名、证书路径等
```

---

## ⚠️ 已发现的问题及建议

### 🔴 严重问题（必须修复）

#### 1. SSL 证书在容器中的路径问题
**问题描述：**
- 开发环境：证书在 `infra/cert/` 目录，通过 volume 挂载到容器
- 生产环境：证书应在宿主机 `/etc/ssl/certs/` 目录

**当前配置：**
```yaml
# docker-compose.yml (开发)
volumes:
  - ./infra/cert:/app/cert:ro
environment:
  Kestrel__Endpoints__Https__Certificate__Path: /app/cert/claymo.local+3.pem

# docker-compose.prod.yml (生产)
volumes:
  - /etc/ssl/certs:/etc/ssl/certs:ro
environment:
  Kestrel__Endpoints__Https__Certificate__Path: ${SSL_CERT_PATH}
```

**✅ 已修复：** 生产环境使用环境变量 `SSL_CERT_PATH` 和 `SSL_KEY_PATH`

#### 2. 前端 API 请求路径硬编码问题
**问题描述：**
- `frontend/admin/src/utils/request.ts` 硬编码 `baseURL: '/api'`
- `frontend/web/src/utils/http.ts` 没有 `baseURL`，依赖相对路径

**影响：**
- ✅ **本地开发**：通过 Vite proxy 正常工作
- ✅ **生产环境**：前端部署到 Gateway 的 wwwroot，相对路径 `/api` 正常工作
- ✅ **无需修改**

#### 3. 敏感信息保护
**✅ 已确认：**
- `.gitignore` 已正确配置，忽略以下文件：
  - `*.env` （环境变量）
  - `appsettings.Development.json`（开发配置）
  - `appsettings.Production.json`（生产配置）
  - `infra/cert/*`（SSL 证书，除了 .gitkeep）

### 🟡 建议优化（非阻塞）

#### 1. 前端环境变量支持
**建议：** 支持通过 `VITE_API_BASE_URL` 覆盖 API 地址

**实现方式：**
```typescript
// frontend/admin/src/utils/request.ts
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  withCredentials: true,
})
```

**好处：**
- 更灵活的部署方式（API 和前端分离部署）
- 便于测试环境配置

#### 2. 健康检查端点
**建议：** Gateway 添加 `/health` 端点

**当前：** Dockerfile 中已配置
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5080/health || exit 1
```

**需确认：** Gateway 代码中是否实现了 `/health` 端点

#### 3. 日志管理
**建议：** 生产环境挂载日志目录
```yaml
# docker-compose.prod.yml
gateway:
  volumes:
    - ./logs:/app/logs
```

**✅ 已包含在 docker-compose.prod.yml 中**

#### 4. 数据库备份策略
**建议：** 添加定时备份脚本

**参考实现：**
```bash
# backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec claymo-mysql-prod mysqldump -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} > backup/claymo_$DATE.sql
find backup -name "claymo_*.sql" -mtime +7 -delete
```

---

## 📋 部署前检查清单

### 本地开发环境
- [ ] 已安装 Docker 和 Docker Compose
- [ ] 已生成本地开发证书（mkcert）
- [ ] 已配置 hosts 文件（`claymo.local`, `admin.claymo.local`）
- [ ] 已创建 `.env` 文件（可直接使用 `.env.example`）
- [ ] 运行 `docker compose --profile full up -d`
- [ ] 访问 `https://admin.claymo.local:3000`（前端开发）
- [ ] 访问 `https://admin.claymo.local:5443`（通过 Gateway）

### 生产环境
- [ ] 已购买域名并配置 DNS 解析
- [ ] 已申请 SSL 证书（Let's Encrypt 或云服务商）
- [ ] 已创建 `.env` 文件并修改生产配置
- [ ] 已修改 `docker-compose.prod.yml` 中的域名配置
- [ ] 已创建 `services/gateway/appsettings.Production.json`
- [ ] 已上传证书到服务器 `/etc/ssl/certs/`
- [ ] 运行 `./deploy.sh` 或 `docker compose -f docker-compose.prod.yml up -d`
- [ ] 配置防火墙（开放 80, 443 端口）
- [ ] 配置定时备份（可选）

---

## 🚀 快速启动

### 开发环境
```bash
# 1. 生成证书
mkcert claymo.local "*.claymo.local" localhost 127.0.0.1
mv claymo.local+3* infra/cert/

# 2. 配置 hosts
echo "127.0.0.1  claymo.local admin.claymo.local" | sudo tee -a /etc/hosts

# 3. 启动服务
docker compose --profile full up -d

# 4. 查看日志
docker compose logs -f gateway

# 5. 前端开发（可选）
cd frontend/admin && pnpm dev  # Admin: https://admin.claymo.local:3000
cd frontend/web && pnpm dev    # Web: https://claymo.local:3001
```

### 生产环境
```bash
# 1. 准备配置
cp .env.example .env
cp services/gateway/appsettings.example.json services/gateway/appsettings.Production.json
# 修改以上两个文件中的配置

# 2. 上传证书到服务器
scp /path/to/cert.pem user@server:/etc/ssl/certs/yourdomain.com.pem
scp /path/to/key.pem user@server:/etc/ssl/certs/yourdomain.com-key.pem

# 3. 部署
chmod +x deploy.sh
./deploy.sh

# 4. 验证
curl -k https://www.yourdomain.com/api/health
curl -k https://admin.yourdomain.com/api/health
```

---

## 🛠️ 故障排查

### 问题：证书无法加载
**错误信息：** `Unable to load certificate` 或 `ERR_SSL_PROTOCOL_ERROR`

**解决方案：**
1. 检查证书文件是否存在且有读取权限
2. 检查 volume 挂载路径是否正确
3. 检查证书格式（需要 PEM 格式）
4. 容器内验证：`docker exec -it claymo-gateway-prod ls -la /etc/ssl/certs/`

### 问题：前端访问 404
**可能原因：** 
- Gateway 静态文件路径配置错误
- 前端构建产物未正确复制到镜像

**解决方案：**
```bash
# 检查容器内前端文件
docker exec -it claymo-gateway-prod ls -la /app/wwwroot/admin/
docker exec -it claymo-gateway-prod ls -la /app/wwwroot/web/

# 重新构建
docker compose -f docker-compose.prod.yml build --no-cache gateway
```

### 问题：API 请求失败（CORS）
**错误信息：** `Access-Control-Allow-Origin` 相关错误

**解决方案：**
检查 `appsettings.json` 中的 CORS 配置：
```json
{
  "Cors": {
    "Origins": [
      "https://www.yourdomain.com",
      "https://admin.yourdomain.com"
    ]
  }
}
```

### 问题：数据库连接失败
**错误信息：** `Unable to connect to MySQL`

**解决方案：**
1. 检查 `.env` 中的数据库密码是否正确
2. 等待 MySQL 健康检查完成（约 30 秒）
3. 查看 MySQL 日志：`docker logs claymo-mysql-prod`
4. 验证连接：`docker exec -it claymo-mysql-prod mysql -u root -p`

---

## 📞 支持

如有问题，请查看：
- 项目 Wiki
- Issue 跟踪
- 联系开发团队

