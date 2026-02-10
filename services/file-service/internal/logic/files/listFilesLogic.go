// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"context"
	"strings"

	"github.com/zeromicro/go-zero/core/logx"

	"file-service/internal/model"
	"file-service/internal/svc"
	"file-service/internal/types"
)

type ListFilesLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewListFilesLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ListFilesLogic {
	return &ListFilesLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *ListFilesLogic) ListFiles(req *types.ListFilesRequest) (*types.ListFilesResponse, error) {
	tenantId, err := l.svcCtx.Auth.TenantId(l.ctx)
	if err != nil {
		return nil, err
	}

	page := req.Page
	if page <= 0 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// 大厂建议：列表查询走"专用 query 方法"，避免在 logic 拼接 SQL 漏洞
	items, total, err := l.svcCtx.FileInfosModel.ListByFilter(l.ctx, model.FileListFilter{
		TenantId:    tenantId,
		BizType:     strings.TrimSpace(req.BizType),
		Keyword:     strings.TrimSpace(req.Keyword),
		Status:      strings.TrimSpace(req.Status),
		Mime:        strings.TrimSpace(req.Mime),
		OwnerId:     strings.TrimSpace(req.OwnerId),
		CreatedFrom: strings.TrimSpace(req.CreatedFrom),
		CreatedTo:   strings.TrimSpace(req.CreatedTo),
		Offset:      offset,
		Limit:       pageSize,
	})
	if err != nil {
		return nil, err
	}

	respItems := make([]types.FileItem, 0, len(items))
	for _, it := range items {
		respItems = append(respItems, types.FileItem{
			FileId:     it.FileId,
			FileName:   it.FileName,
			FileSize:   it.FileSize,
			FileType:   it.FileType,
			BizType:    it.BizType,
			FileHash:   it.FileHash,
			Status:     it.Status,
			Width:      int(it.Width),
			Height:     int(it.Height),
			DurationMs: it.DurationMs,
			CreatedAt:  it.CreatedAt,
			UpdatedAt:  it.UpdatedAt,
		})
	}

	return &types.ListFilesResponse{
		PageResponse: types.PageResponse{
			Page:     page,
			PageSize: pageSize,
			Total:    int(total),
		},
		Items: respItems,
	}, nil
}
