// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/zeromicro/go-zero/core/logx"

	"file-service/internal/domain"
	"file-service/internal/svc"
	"file-service/internal/types"
)

type GetFileContentLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewGetFileContentLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetFileContentLogic {
	return &GetFileContentLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

// 推荐：logic 返回 signedUrl，handler 307 redirect
func (l *GetFileContentLogic) GetFileContent(req *types.GetFileContentRequest) (string, error) {
	//tenantId, err := l.svcCtx.Auth.TenantId(l.ctx)
	//if err != nil {
	//	return "", err
	//}

	file, err := l.svcCtx.FileInfosModel.FindOneByFileId(l.ctx, req.FileId)
	if err != nil {
		return "", err
	}
	if file == nil || file.Status == domain.FileDeleted {
		return "", errors.New("file not found")
	}
	if file.Status != domain.FileAvailable && file.Status != domain.FileProcessing {
		return "", errors.New("file not ready")
	}

	disp := strings.TrimSpace(req.Disposition)
	if disp == "" {
		disp = DispInline
	}
	if disp != DispInline && disp != DispAttachment {
		disp = DispInline
	}

	expireSeconds := l.svcCtx.Config.Storage.PresignGetExpireSeconds
	signedUrl, _, err := l.svcCtx.Storage.PresignGet(l.ctx, file.ObjectKey, disp, time.Duration(expireSeconds)*time.Second)
	if err != nil {
		return "", err
	}
	return signedUrl, nil
}
