package auth

import "context"

// 私有 key 类型，避免与其他包的 context key 冲突
type ctxKey int

const (
	keyUserID ctxKey = iota
	keyTenantID
)

// 写入（middleware 调用）
func WithUserID(ctx context.Context, uid string) context.Context {
	return context.WithValue(ctx, keyUserID, uid)
}

func WithTenantID(ctx context.Context, tid string) context.Context {
	return context.WithValue(ctx, keyTenantID, tid)
}

// 读取（业务逻辑调用）
func GetUserID(ctx context.Context) string {
	v, _ := ctx.Value(keyUserID).(string)
	return v
}

func GetTenantID(ctx context.Context) string {
	v, _ := ctx.Value(keyTenantID).(string)
	return v
}
