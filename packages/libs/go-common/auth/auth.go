package auth

import (
	"context"
	"errors"
)

type Ctx interface {
	TenantId(ctx context.Context) (string, error)
	UserId(ctx context.Context) (string, error)
}

var (
	ErrNoTenant = errors.New("missing tenant id")
	ErrNoUser   = errors.New("missing user id")
)

// DefaultCtx：配合 JwtUserContextMiddleware 注入
type DefaultCtx struct{}

func New() *DefaultCtx { return &DefaultCtx{} }

func (DefaultCtx) TenantId(ctx context.Context) (string, error) {
	tid := GetTenantID(ctx)
	if tid == "" {
		return "", ErrNoTenant
	}
	return tid, nil
}

func (DefaultCtx) UserId(ctx context.Context) (string, error) {
	uid := GetUserID(ctx)
	if uid == "" {
		return "", ErrNoUser
	}
	return uid, nil
}

