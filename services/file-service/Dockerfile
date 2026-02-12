FROM golang:1.24-alpine AS builder

WORKDIR /build

ENV GOPROXY=https://goproxy.cn,direct
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

# 使用阿里云镜像源加速（国内环境）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache git ca-certificates tzdata

COPY services/file-service/go.mod services/file-service/go.sum ./
COPY packages/libs/go-common/ /packages/libs/go-common/

RUN sed -i 's|../../packages/libs/go-common|/packages/libs/go-common|g' go.mod

RUN go mod download

COPY services/file-service/ .

RUN go build -ldflags="-s -w" -o /app/file-service file.go

FROM alpine:3.19 AS final

WORKDIR /app

ENV TZ=Asia/Shanghai
# 使用阿里云镜像源加速（国内环境）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache ca-certificates tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

COPY --from=builder /app/file-service .

# 创建配置目录并复制配置模板（构建时使用 example 文件）
RUN mkdir -p /app/etc
COPY --from=builder /build/etc/file-api.yaml.example /app/etc/file-api.yaml

# 修改权限
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8889

ENTRYPOINT ["./file-service", "-f", "/app/etc/file-api.yaml"]

