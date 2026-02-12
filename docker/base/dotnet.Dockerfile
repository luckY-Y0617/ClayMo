# ========================================
# ClayMo .NET 基础镜像
# ========================================
# 用途：所有 .NET 服务的统一基础镜像
# 包含：时区配置、常用工具、健康检查依赖
# ========================================

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS base

# ============================
# 环境变量配置
# ============================
ENV TZ=Asia/Shanghai \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# ============================
# 系统配置和工具安装
# ============================
# 使用阿里云镜像源加速（国内环境）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache \
        tzdata \
        curl \
        wget \
        ca-certificates \
        icu-libs && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# ============================
# 标签信息
# ============================
LABEL maintainer="ClayMo Team" \
      description="ClayMo .NET Base Image with Alpine Linux" \
      version="1.0"

