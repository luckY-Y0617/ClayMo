# ========================================
# ClayMo Init Service - Database Migration & Seeding
# ========================================
# 构建上下文：backend/
# 构建命令：docker build -f docker/init.Dockerfile -t claymo-init:latest ./backend
# ========================================
# 用途：数据库迁移和初始化种子数据
# Usage:
#   docker run claymo-init migrate host
#   docker run claymo-init migrate tenants --only-ready
#   docker run claymo-init seed host
#   docker run claymo-init seed tenants --only-ready
# ========================================

# ============================
# 基础运行时镜像
# ============================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS base

ENV TZ=Asia/Shanghai \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache tzdata ca-certificates icu-libs && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# ============================
# 构建阶段 - 依赖还原
# ============================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS restore

WORKDIR /src

# 复制解决方案文件和所有项目文件
# 由于依赖关系复杂，直接复制所有项目定义（.dockerignore 已排除 bin/obj）
COPY . .

# 执行还原
RUN dotnet restore "tools/ClayMo.Tools.Platform/ClayMo.Tools.Platform.csproj"

# ============================
# 构建阶段 - 编译
# ============================
FROM restore AS build

ARG BUILD_CONFIGURATION=Release

# 复制所有源代码
COPY . .

# 构建项目
WORKDIR "/src/tools/ClayMo.Tools.Platform"
RUN dotnet build "ClayMo.Tools.Platform.csproj" \
    -c ${BUILD_CONFIGURATION} \
    -o /app/build \
    --no-restore

# ============================
# 发布阶段
# ============================
FROM build AS publish

ARG BUILD_CONFIGURATION=Release

RUN dotnet publish "ClayMo.Tools.Platform.csproj" \
    -c ${BUILD_CONFIGURATION} \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ============================
# 最终运行镜像
# ============================
FROM base AS final

WORKDIR /app

# 复制发布产物
COPY --from=publish /app/publish .

# 运行时入口（支持命令行参数）
ENTRYPOINT ["dotnet", "ClayMo.Tools.Platform.dll"]

