// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"context"
	"errors"

	"github.com/zeromicro/go-zero/core/logx"

	"file-service/internal/svc"
	"file-service/internal/types"
)

type GetFileLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewGetFileLogic(ctx context.Context, svcCtx *svc.ServiceContext) *GetFileLogic {
	return &GetFileLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *GetFileLogic) GetFile(req *types.GetFileRequest) (*types.GetFileResponse, error) {
	tenantId, err := l.svcCtx.Auth.TenantId(l.ctx)
	if err != nil {
		return nil, err
	}

	file, err := l.svcCtx.FileInfosModel.FindOneByFileId(l.ctx, req.FileId)
	if err != nil {
		return nil, err
	}
	if file == nil || file.TenantId != tenantId {
		return nil, errors.New("file not found")
	}

	// 不再返回 URL，需要通过 /files/{fileId}/urls 获取
	return &types.GetFileResponse{
		FileItem: types.FileItem{
			FileId:     file.FileId,
			FileName:   file.FileName,
			FileSize:   file.FileSize,
			FileType:   file.FileType,
			BizType:    file.BizType,
			FileHash:   file.FileHash,
			Status:     file.Status,
			Width:      int(file.Width),
			Height:     int(file.Height),
			DurationMs: file.DurationMs,
			CreatedAt:  file.CreatedAt,
			UpdatedAt:  file.UpdatedAt,
		},
	}, nil
}
