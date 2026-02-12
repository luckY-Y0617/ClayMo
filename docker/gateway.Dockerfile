# ========================================
# ClayMo Gateway - YARP Reverse Proxy + Static Files
# ========================================
# 构建上下文：项目根目录
# 构建命令：docker build -f docker/gateway.Dockerfile -t claymo-gateway:latest .
# ========================================
# 此镜像包含:
#   - Gateway 反向代理 (API, 文件服务)
#   - 前端静态文件 (admin, web)
#
# 子域名路由架构:
#   admin.example.com → 后台管理前端
#   www.example.com   → 前台前端
#   /api/*            → API 服务 (反向代理)
#   /fs/*             → 文件服务 (反向代理)
# ========================================

# ============================
# 前端构建阶段
# ============================
FROM node:20-alpine AS frontend-build

ENV TZ=Asia/Shanghai \
    NODE_ENV=production \
    PNPM_VERSION=9.0.0

WORKDIR /app

# 使用阿里云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache tzdata git && \
    rm -rf /var/cache/apk/*

# 配置 pnpm
RUN corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate && \
    pnpm config set store-dir /root/.pnpm-store

# 复制 workspace 配置文件（利用缓存）
COPY ["pnpm-workspace.yaml", "package.json", "pnpm-lock.yaml", "./"]
COPY ["tsconfig.base.json", "tsconfig.node.base.json", "./"]

# 复制共享包
COPY packages/ packages/

# 复制前端项目配置文件（利用缓存层）
COPY frontend/admin/package.json frontend/admin/
COPY frontend/web/package.json frontend/web/

# 安装依赖（此层会被缓存）
RUN pnpm install --frozen-lockfile

# 复制前端源代码
COPY frontend/ frontend/

# 构建共享包
RUN pnpm build:packages

# 构建 Admin 前端
WORKDIR /app/frontend/admin
RUN pnpm build

# 构建 Web 前端
WORKDIR /app/frontend/web
RUN pnpm build

# ============================
# .NET 基础运行时镜像
# ============================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS base

ENV TZ=Asia/Shanghai

WORKDIR /app
EXPOSE 5080
EXPOSE 5443

# 使用阿里云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache tzdata wget ca-certificates && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    rm -rf /var/cache/apk/*

# 创建证书目录（即使没有证书文件也不会报错）
RUN mkdir -p /app/cert

# ============================
# .NET 构建阶段 - 依赖还原
# ============================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dotnet-restore

ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# 复制项目文件（利用缓存）
COPY ["services/gateway/ClayMo.Gateway.csproj", "services/gateway/"]

# 还原依赖
RUN dotnet restore "services/gateway/ClayMo.Gateway.csproj"

# ============================
# .NET 构建阶段 - 编译
# ============================
FROM dotnet-restore AS dotnet-build

ARG BUILD_CONFIGURATION=Release

# 复制源代码
COPY services/gateway/ services/gateway/

# 构建项目
WORKDIR "/src/services/gateway"
RUN dotnet build "ClayMo.Gateway.csproj" \
    -c ${BUILD_CONFIGURATION} \
    -o /app/build \
    --no-restore

# ============================
# .NET 发布阶段
# ============================
FROM dotnet-build AS dotnet-publish

ARG BUILD_CONFIGURATION=Release

RUN dotnet publish "ClayMo.Gateway.csproj" \
    -c ${BUILD_CONFIGURATION} \
    -o /app/publish \
    --no-restore \
    --no-build \
    /p:UseAppHost=false

# ============================
# 最终运行镜像 - Gateway + Frontend
# ============================
FROM base AS final

WORKDIR /app

# 创建 wwwroot 目录结构
RUN mkdir -p wwwroot/admin wwwroot/web

# 复制 .NET 发布产物
COPY --from=dotnet-publish /app/publish .

# 复制前端构建产物
COPY --from=frontend-build /app/frontend/admin/dist ./wwwroot/admin/
COPY --from=frontend-build /app/frontend/web/dist ./wwwroot/web/

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5080/health || exit 1

# 运行时入口
ENTRYPOINT ["dotnet", "ClayMo.Gateway.dll"]

