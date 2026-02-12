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

# 复制解决方案文件
COPY ["ClayMo.Abp.Net9.sln", "./"]
COPY ["global.json", "./"]

# 复制 Tools 项目文件
COPY ["tools/ClayMo.Tools.Platform/ClayMo.Tools.Platform.csproj", "tools/ClayMo.Tools.Platform/"]

# 复制 Framework 项目文件（Tools 依赖）
COPY ["framework/ClayMo.Framework.Core/ClayMo.Framework.Core.csproj", "framework/ClayMo.Framework.Core/"]
COPY ["framework/ClayMo.Framework.SqlSugar/ClayMo.Framework.SqlSugar.csproj", "framework/ClayMo.Framework.SqlSugar/"]
COPY ["framework/ClayMo.Framework.SqlSugar.Abstractions/ClayMo.Framework.SqlSugar.Abstractions.csproj", "framework/ClayMo.Framework.SqlSugar.Abstractions/"]

# 复制 Modules 项目文件（Tools 依赖的模块）
COPY ["modules/identity/ClayMo.Module.Identity.Domain.Shared/ClayMo.Module.Identity.Domain.Shared.csproj", "modules/identity/ClayMo.Module.Identity.Domain.Shared/"]
COPY ["modules/identity/ClayMo.Module.Identity.Domain/ClayMo.Module.Identity.Domain.csproj", "modules/identity/ClayMo.Module.Identity.Domain/"]
COPY ["modules/identity/ClayMo.Module.Identity.SqlSugar/ClayMo.Module.Identity.SqlSugar.csproj", "modules/identity/ClayMo.Module.Identity.SqlSugar/"]

COPY ["modules/kb/ClayMo.Module.Knowledge.Domain.Shared/ClayMo.Module.Knowledge.Domain.Shared.csproj", "modules/kb/ClayMo.Module.Knowledge.Domain.Shared/"]
COPY ["modules/kb/ClayMo.Module.Knowledge.Domain/ClayMo.Module.Knowledge.Domain.csproj", "modules/kb/ClayMo.Module.Knowledge.Domain/"]
COPY ["modules/kb/ClayMo.Module.Knowledge.SqlSugar/ClayMo.Module.Knowledge.SqlSugar.csproj", "modules/kb/ClayMo.Module.Knowledge.SqlSugar/"]

COPY ["modules/tenantmanagement/ClayMo.Module.TenantManagement.Domain.Shared/ClayMo.Module.TenantManagement.Domain.Shared.csproj", "modules/tenantmanagement/ClayMo.Module.TenantManagement.Domain.Shared/"]
COPY ["modules/tenantmanagement/ClayMo.Module.TenantManagement.Domain/ClayMo.Module.TenantManagement.Domain.csproj", "modules/tenantmanagement/ClayMo.Module.TenantManagement.Domain/"]
COPY ["modules/tenantmanagement/ClayMo.Module.TenantManagement.SqlSugar/ClayMo.Module.TenantManagement.SqlSugar.csproj", "modules/tenantmanagement/ClayMo.Module.TenantManagement.SqlSugar/"]

COPY ["modules/workspace/ClayMo.Module.Workspace.Domain.Shared/ClayMo.Module.Workspace.Domain.Shared.csproj", "modules/workspace/ClayMo.Module.Workspace.Domain.Shared/"]
COPY ["modules/workspace/ClayMo.Module.Workspace.Domain/ClayMo.Module.Workspace.Domain.csproj", "modules/workspace/ClayMo.Module.Workspace.Domain/"]
COPY ["modules/workspace/ClayMo.Module.Workspace.SqlSugar/ClayMo.Module.Workspace.SqlSugar.csproj", "modules/workspace/ClayMo.Module.Workspace.SqlSugar/"]

COPY ["modules/auditlogging/ClayMo.Module.AuditLogging.Domain.Shared/ClayMo.Module.AuditLogging.Domain.Shared.csproj", "modules/auditlogging/ClayMo.Module.AuditLogging.Domain.Shared/"]
COPY ["modules/auditlogging/ClayMo.Module.AuditLogging.Domain/ClayMo.Module.AuditLogging.Domain.csproj", "modules/auditlogging/ClayMo.Module.AuditLogging.Domain/"]
COPY ["modules/auditlogging/ClayMo.Module.AuditLogging.SqlSugar/ClayMo.Module.AuditLogging.SqlSugar.csproj", "modules/auditlogging/ClayMo.Module.AuditLogging.SqlSugar/"]

# 复制 Application 层（如果 Tools 依赖）
COPY ["src/ClayMo.Abp.Domain.Shared/ClayMo.Abp.Domain.Shared.csproj", "src/ClayMo.Abp.Domain.Shared/"]
COPY ["src/ClayMo.Abp.Domain/ClayMo.Abp.Domain.csproj", "src/ClayMo.Abp.Domain/"]
COPY ["src/ClayMo.Abp.SqlSugar/ClayMo.Abp.SqlSugar.csproj", "src/ClayMo.Abp.SqlSugar/"]

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
    --no-build \
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

