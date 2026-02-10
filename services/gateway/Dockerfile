# ================================================
# ClayMo Gateway - YARP Reverse Proxy + Static Files
# ================================================
# 此镜像包含:
#   - Gateway 反向代理 (API, 文件服务)
#   - 前端静态文件 (admin, web)
#
# 子域名路由架构:
#   admin.example.com → 后台管理前端
#   www.example.com   → 前台前端
#   /api/*            → API 服务 (反向代理)
#   /fs/*             → 文件服务 (反向代理)
# ================================================

# ------------------------------------------------
# Frontend Build Stage - 一次构建两个前端
# ------------------------------------------------
FROM node:20-alpine AS frontend-build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# 复制 workspace 配置
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json tsconfig.node.base.json ./
COPY packages/ packages/
COPY frontend/ frontend/

# 安装依赖并构建共享包（只执行一次）
RUN pnpm install && pnpm build:packages

# 构建 Admin 前端（子域名模式，base 为 /）
WORKDIR /app/frontend/admin
RUN pnpm build

# 构建 Web 前端
WORKDIR /app/frontend/web
RUN pnpm build

# ------------------------------------------------
# .NET Base
# ------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS base
WORKDIR /app
EXPOSE 5080
EXPOSE 5443

ENV TZ=Asia/Shanghai
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

# ------------------------------------------------
# .NET Build Stage
# ------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dotnet-build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

COPY ["services/gateway/ClayMo.Gateway.csproj", "services/gateway/"]
RUN dotnet restore "services/gateway/ClayMo.Gateway.csproj"

COPY services/gateway/ services/gateway/
WORKDIR "/src/services/gateway"
RUN dotnet build "ClayMo.Gateway.csproj" -c $BUILD_CONFIGURATION -o /app/build

# ------------------------------------------------
# .NET Publish Stage
# ------------------------------------------------
FROM dotnet-build AS dotnet-publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "ClayMo.Gateway.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# ------------------------------------------------
# Final Stage - Gateway + Frontend
# ------------------------------------------------
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

ENTRYPOINT ["dotnet", "ClayMo.Gateway.dll"]

