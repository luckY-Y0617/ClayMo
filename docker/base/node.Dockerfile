# ========================================
# ClayMo Node.js 基础镜像
# ========================================
# 用途：前端构建的统一基础镜像
# 包含：Node.js、pnpm、构建工具
# ========================================

FROM node:20-alpine AS base

# ============================
# 环境变量配置
# ============================
ENV TZ=Asia/Shanghai \
    NODE_ENV=production \
    PNPM_VERSION=9.0.0

# ============================
# 系统配置和工具安装
# ============================
# 使用阿里云镜像源加速（国内环境）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache \
        tzdata \
        git && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    rm -rf /var/cache/apk/*

# ============================
# pnpm 配置
# ============================
RUN corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate && \
    pnpm config set store-dir /root/.pnpm-store

WORKDIR /app

# ============================
# 标签信息
# ============================
LABEL maintainer="ClayMo Team" \
      description="ClayMo Node.js Base Image with pnpm" \
      version="1.0"

