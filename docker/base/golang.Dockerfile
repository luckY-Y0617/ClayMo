# ========================================
# ClayMo Golang 基础镜像
# ========================================
# 用途：Go 微服务的统一构建基础
# 包含：Go 环境、构建工具、时区配置
# ========================================

FROM golang:1.24-alpine AS builder

# ============================
# 环境变量配置
# ============================
ENV GOPROXY=https://goproxy.cn,direct \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    TZ=Asia/Shanghai

# ============================
# 构建工具安装
# ============================
# 使用阿里云镜像源加速（国内环境）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache \
        git \
        ca-certificates \
        tzdata \
        make && \
    rm -rf /var/cache/apk/*

WORKDIR /build

# ============================
# 标签信息
# ============================
LABEL maintainer="ClayMo Team" \
      description="ClayMo Golang Builder Base Image" \
      version="1.0"

# ========================================
# 运行时基础镜像
# ========================================
FROM alpine:3.19 AS runtime

ENV TZ=Asia/Shanghai

# 使用阿里云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache \
        ca-certificates \
        tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    rm -rf /var/cache/apk/*

# 创建非 root 用户
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

LABEL maintainer="ClayMo Team" \
      description="ClayMo Golang Runtime Base Image" \
      version="1.0"

