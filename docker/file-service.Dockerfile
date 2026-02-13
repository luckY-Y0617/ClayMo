# ========================================
# ClayMo File Service - Go 文件服务
# ========================================
# 构建上下文：项目根目录
# 构建命令：docker build -f docker/file-service.Dockerfile -t claymo-file-service:latest .
# ========================================

# ============================
# 构建阶段
# ============================
FROM golang:1.24-alpine AS builder

ENV GOPROXY=https://goproxy.cn,direct \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    TZ=Asia/Shanghai

WORKDIR /build

# 使用阿里云镜像源加速（国内环境）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache git ca-certificates tzdata && \
    rm -rf /var/cache/apk/*

# 复制 go.mod 和 go.sum（利用 Docker 缓存层）
COPY services/file-service/go.mod services/file-service/go.sum ./

# 复制 go-common 库
COPY packages/libs/go-common/ ../packages/libs/go-common/

# 修改 go.mod 中的本地路径引用
RUN sed -i 's|../../packages/libs/go-common|../packages/libs/go-common|g' go.mod && \
    cat go.mod

# 下载依赖（此层会被缓存）
RUN go mod download

# 复制源代码
COPY services/file-service/ .

# 编译应用（优化：去除调试信息和符号表）
RUN go build -ldflags="-s -w" -o /app/file-service .

# ============================
# 运行时镜像
# ============================
FROM alpine:3.19 AS final

WORKDIR /app

ENV TZ=Asia/Shanghai

# 使用阿里云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache ca-certificates tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    rm -rf /var/cache/apk/*

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

# 复制编译产物
COPY --from=builder /app/file-service .

# 创建配置目录并复制配置文件
RUN mkdir -p /app/etc
COPY --from=builder /build/etc/file-api.yaml /app/etc/file-api.yaml

# 修改权限
RUN chown -R appuser:appgroup /app

# 切换到非 root 用户
USER appuser

EXPOSE 8889

# 运行时入口
ENTRYPOINT ["./file-service", "-f", "/app/etc/file-api.yaml"]

