# ========================================
# ClayMo Backend API Service
# ========================================
# 构建上下文：backend/
# 构建命令：docker build -f docker/backend.Dockerfile -t claymo-backend:latest ./backend
# ========================================

# ============================
# 基础运行时镜像
# ============================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS base

ENV TZ=Asia/Shanghai \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache tzdata curl ca-certificates icu-libs && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    rm -rf /var/cache/apk/*

WORKDIR /app
EXPOSE 19001

# ============================
# 构建阶段 - 依赖还原
# ============================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS restore

WORKDIR /src

# 复制解决方案文件
COPY ["ClayMo.Abp.Net9.sln", "./"]
COPY ["global.json", "./"]

# 复制所有 .csproj 文件（利用 Docker 层缓存）
# Framework
COPY ["framework/ClayMo.Framework.Core/ClayMo.Framework.Core.csproj", "framework/ClayMo.Framework.Core/"]
COPY ["framework/ClayMo.Framework.AspNetCore/ClayMo.Framework.AspNetCore.csproj", "framework/ClayMo.Framework.AspNetCore/"]
COPY ["framework/ClayMo.Framework.Authentication/ClayMo.Framework.Authentication.csproj", "framework/ClayMo.Framework.Authentication/"]
COPY ["framework/ClayMo.Framework.Authorization/ClayMo.Framework.Authorization.csproj", "framework/ClayMo.Framework.Authorization/"]
COPY ["framework/ClayMo.Framework.Mapster/ClayMo.Framework.Mapster.csproj", "framework/ClayMo.Framework.Mapster/"]
COPY ["framework/ClayMo.Framework.Notifycation/ClayMo.Framework.Notifycation.csproj", "framework/ClayMo.Framework.Notifycation/"]
COPY ["framework/ClayMo.Framework.SqlSugar/ClayMo.Framework.SqlSugar.csproj", "framework/ClayMo.Framework.SqlSugar/"]
COPY ["framework/ClayMo.Framework.SqlSugar.Abstractions/ClayMo.Framework.SqlSugar.Abstractions.csproj", "framework/ClayMo.Framework.SqlSugar.Abstractions/"]
COPY ["framework/ClayMo.Framework.BackgroundJobs.Hangfire/ClayMo.Framework.BackgroundJobs.Hangfire.csproj", "framework/ClayMo.Framework.BackgroundJobs.Hangfire/"]

# Modules - Identity
COPY ["modules/identity/ClayMo.Module.Identity.Domain.Shared/ClayMo.Module.Identity.Domain.Shared.csproj", "modules/identity/ClayMo.Module.Identity.Domain.Shared/"]
COPY ["modules/identity/ClayMo.Module.Identity.Domain/ClayMo.Module.Identity.Domain.csproj", "modules/identity/ClayMo.Module.Identity.Domain/"]
COPY ["modules/identity/ClayMo.Module.Identity.Application.Contracts/ClayMo.Module.Identity.Application.Contracts.csproj", "modules/identity/ClayMo.Module.Identity.Application.Contracts/"]
COPY ["modules/identity/ClayMo.Module.Identity.Application/ClayMo.Module.Identity.Application.csproj", "modules/identity/ClayMo.Module.Identity.Application/"]
COPY ["modules/identity/ClayMo.Module.Identity.SqlSugar/ClayMo.Module.Identity.SqlSugar.csproj", "modules/identity/ClayMo.Module.Identity.SqlSugar/"]

# Modules - Knowledge
COPY ["modules/kb/ClayMo.Module.Knowledge.Domain.Shared/ClayMo.Module.Knowledge.Domain.Shared.csproj", "modules/kb/ClayMo.Module.Knowledge.Domain.Shared/"]
COPY ["modules/kb/ClayMo.Module.Knowledge.Domain/ClayMo.Module.Knowledge.Domain.csproj", "modules/kb/ClayMo.Module.Knowledge.Domain/"]
COPY ["modules/kb/ClayMo.Module.Knowledge.Application.Contracts/ClayMo.Module.Knowledge.Application.Contracts.csproj", "modules/kb/ClayMo.Module.Knowledge.Application.Contracts/"]
COPY ["modules/kb/ClayMo.Module.Knowledge.Application/ClayMo.Module.Knowledge.Application.csproj", "modules/kb/ClayMo.Module.Knowledge.Application/"]
COPY ["modules/kb/ClayMo.Module.Knowledge.SqlSugar/ClayMo.Module.Knowledge.SqlSugar.csproj", "modules/kb/ClayMo.Module.Knowledge.SqlSugar/"]

# Modules - TenantManagement
COPY ["modules/tenantmanagement/ClayMo.Module.TenantManagement.Domain.Shared/ClayMo.Module.TenantManagement.Domain.Shared.csproj", "modules/tenantmanagement/ClayMo.Module.TenantManagement.Domain.Shared/"]
COPY ["modules/tenantmanagement/ClayMo.Module.TenantManagement.Domain/ClayMo.Module.TenantManagement.Domain.csproj", "modules/tenantmanagement/ClayMo.Module.TenantManagement.Domain/"]
COPY ["modules/tenantmanagement/ClayMo.Module.TenantManagement.Application.Contracts/ClayMo.Module.TenantManagement.Application.Contracts.csproj", "modules/tenantmanagement/ClayMo.Module.TenantManagement.Application.Contracts/"]
COPY ["modules/tenantmanagement/ClayMo.Module.TenantManagement.Application/ClayMo.Module.TenantManagement.Application.csproj", "modules/tenantmanagement/ClayMo.Module.TenantManagement.Application/"]
COPY ["modules/tenantmanagement/ClayMo.Module.TenantManagement.SqlSugar/ClayMo.Module.TenantManagement.SqlSugar.csproj", "modules/tenantmanagement/ClayMo.Module.TenantManagement.SqlSugar/"]

# Modules - Workspace
COPY ["modules/workspace/ClayMo.Module.Workspace.Domain.Shared/ClayMo.Module.Workspace.Domain.Shared.csproj", "modules/workspace/ClayMo.Module.Workspace.Domain.Shared/"]
COPY ["modules/workspace/ClayMo.Module.Workspace.Domain/ClayMo.Module.Workspace.Domain.csproj", "modules/workspace/ClayMo.Module.Workspace.Domain/"]
COPY ["modules/workspace/ClayMo.Module.Workspace.Application.Contracts/ClayMo.Module.Workspace.Application.Contracts.csproj", "modules/workspace/ClayMo.Module.Workspace.Application.Contracts/"]
COPY ["modules/workspace/ClayMo.Module.Workspace.Application/ClayMo.Module.Workspace.Application.csproj", "modules/workspace/ClayMo.Module.Workspace.Application/"]
COPY ["modules/workspace/ClayMo.Module.Workspace.SqlSugar/ClayMo.Module.Workspace.SqlSugar.csproj", "modules/workspace/ClayMo.Module.Workspace.SqlSugar/"]

# Modules - AuditLogging
COPY ["modules/auditlogging/ClayMo.Module.AuditLogging.Domain.Shared/ClayMo.Module.AuditLogging.Domain.Shared.csproj", "modules/auditlogging/ClayMo.Module.AuditLogging.Domain.Shared/"]
COPY ["modules/auditlogging/ClayMo.Module.AuditLogging.Domain/ClayMo.Module.AuditLogging.Domain.csproj", "modules/auditlogging/ClayMo.Module.AuditLogging.Domain/"]
COPY ["modules/auditlogging/ClayMo.Module.AuditLogging.Application.Contracts/ClayMo.Module.AuditLogging.Application.Contracts.csproj", "modules/auditlogging/ClayMo.Module.AuditLogging.Application.Contracts/"]
COPY ["modules/auditlogging/ClayMo.Module.AuditLogging.Application/ClayMo.Module.AuditLogging.Application.csproj", "modules/auditlogging/ClayMo.Module.AuditLogging.Application/"]
COPY ["modules/auditlogging/ClayMo.Module.AuditLogging.SqlSugar/ClayMo.Module.AuditLogging.SqlSugar.csproj", "modules/auditlogging/ClayMo.Module.AuditLogging.SqlSugar/"]

# Application
COPY ["src/ClayMo.Abp.Domain.Shared/ClayMo.Abp.Domain.Shared.csproj", "src/ClayMo.Abp.Domain.Shared/"]
COPY ["src/ClayMo.Abp.Domain/ClayMo.Abp.Domain.csproj", "src/ClayMo.Abp.Domain/"]
COPY ["src/ClayMo.Abp.Application.Contracts/ClayMo.Abp.Application.Contracts.csproj", "src/ClayMo.Abp.Application.Contracts/"]
COPY ["src/ClayMo.Abp.Application/ClayMo.Abp.Application.csproj", "src/ClayMo.Abp.Application/"]
COPY ["src/ClayMo.Abp.SqlSugar/ClayMo.Abp.SqlSugar.csproj", "src/ClayMo.Abp.SqlSugar/"]
COPY ["src/ClayMo.Abp.Web/ClayMo.Abp.Web.csproj", "src/ClayMo.Abp.Web/"]

# 执行还原（此层会被缓存，除非 .csproj 文件变化）
RUN dotnet restore "src/ClayMo.Abp.Web/ClayMo.Abp.Web.csproj"

# ============================
# 构建阶段 - 编译
# ============================
FROM restore AS build

ARG BUILD_CONFIGURATION=Release

# 复制所有源代码
COPY . .

# 构建项目
WORKDIR "/src/src/ClayMo.Abp.Web"
RUN dotnet build "ClayMo.Abp.Web.csproj" \
    -c ${BUILD_CONFIGURATION} \
    -o /app/build \
    --no-restore

# ============================
# 发布阶段
# ============================
FROM build AS publish

ARG BUILD_CONFIGURATION=Release

RUN dotnet publish "ClayMo.Abp.Web.csproj" \
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

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -sf http://localhost:19001/health || exit 1

# 运行时入口
ENTRYPOINT ["dotnet", "ClayMo.Abp.Web.dll"]

