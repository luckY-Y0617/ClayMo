// middleware/jwt_user_context.go
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/claymo/go-common/auth"

	jwt "github.com/golang-jwt/jwt/v4"
	"github.com/zeromicro/go-zero/core/logx"
)

type JwtUserContextConfig struct {
	AccessSecret    string
	DefaultTenantID string
	RequireTenant   bool
}

type JwtUserContextMiddleware struct {
	cfg JwtUserContextConfig
}

func NewJwtUserContextMiddleware(cfg JwtUserContextConfig) *JwtUserContextMiddleware {
	return &JwtUserContextMiddleware{cfg: cfg}
}

func (m *JwtUserContextMiddleware) Handle(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		uid := ""
		tid := m.cfg.DefaultTenantID

		// 1) 解析 Authorization: Bearer <token>
		tokenStr := bearerToken(r.Header.Get("Authorization"))
		if tokenStr != "" {
			claims := jwt.MapClaims{}
			_, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
				return []byte(m.cfg.AccessSecret), nil
			})
			if err != nil {
				// 注意：鉴权失败一般由 rest.WithJwt 负责直接 401
				// 这里的定位是"上下文增强"，所以只记录日志，不直接中断
				logx.WithContext(ctx).Errorf("parse jwt claims failed: %v", err)
			} else {
				uid = pickStringClaim(claims, "uid")
				if uid == "" {
					uid = pickStringClaim(claims, "sub") // 兼容
				}
				tid = pickStringClaim(claims, "tid")
				if tid == "" {
					tid = m.cfg.DefaultTenantID
				}
			}
		}

		// 2) tenant header 覆盖（网关/调用方显式指定优先）
		if ht := strings.TrimSpace(r.Header.Get("X-Tenant-Id")); ht != "" {
			tid = ht
		}

		// 3) RequireTenant 的话，你可以在这里做硬校验（可选）
		if m.cfg.RequireTenant && strings.TrimSpace(tid) == "" {
			// 这里建议不要直接写 response（交给统一错误处理/鉴权链路更一致）
			// 但如果你希望在这里硬拦，也可以返回 400/401/403
		}

		// 4) 写入统一的 auth keys
		ctx = auth.WithUserID(ctx, uid)
		ctx = auth.WithTenantID(ctx, tid)

		next(w, r.WithContext(ctx))
	}
}

func bearerToken(authHeader string) string {
	authHeader = strings.TrimSpace(authHeader)
	if authHeader == "" {
		return ""
	}
	if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		return strings.TrimSpace(authHeader[7:])
	}
	return strings.TrimSpace(authHeader)
}

func pickStringClaim(claims jwt.MapClaims, key string) string {
	v, ok := claims[key]
	if !ok || v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	default:
		// 兼容一些实现把数字/uuid序列化成非 string
		return ""
	}
}

// 如果你还想保留工具函数：
func MustUser(ctx context.Context) (uid, tid string) {
	uid = auth.GetUserID(ctx)
	tid = auth.GetTenantID(ctx)
	return
}
