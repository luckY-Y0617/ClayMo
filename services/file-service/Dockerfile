FROM golang:1.24-alpine AS builder

WORKDIR /build

ENV GOPROXY=https://goproxy.cn,direct
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

RUN apk add --no-cache git ca-certificates tzdata

COPY services/file-service/go.mod services/file-service/go.sum ./
COPY packages/libs/go-common/ /packages/libs/go-common/

RUN sed -i 's|../../packages/libs/go-common|/packages/libs/go-common|g' go.mod

RUN go mod download

COPY services/file-service/ .

RUN go build -ldflags="-s -w" -o /app/file-service file.go

FROM alpine:3.19 AS final

WORKDIR /app

ENV TZ=Asia/Shanghai
RUN apk add --no-cache ca-certificates tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

COPY --from=builder /app/file-service .

RUN mkdir -p /app/etc && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8889

ENTRYPOINT ["./file-service", "-f", "/app/etc/file-api.yaml"]

