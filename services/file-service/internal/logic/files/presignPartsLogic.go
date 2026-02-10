// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"context"
	"errors"
	"time"

	"github.com/zeromicro/go-zero/core/logx"

	"file-service/internal/domain"
	"file-service/internal/model"
	"file-service/internal/svc"
	"file-service/internal/types"
)

type PresignPartsLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewPresignPartsLogic(ctx context.Context, svcCtx *svc.ServiceContext) *PresignPartsLogic {
	return &PresignPartsLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

// PresignParts 批量获取分片上传预签名 URL
// POST /uploads/sessions/{sessionId}/parts/presign
// 支持大文件 1000+ parts，避免逐个请求打爆 API
func (l *PresignPartsLogic) PresignParts(req *types.PresignPartsRequest) (*types.PresignPartsResponse, error) {
	tenantId, err := l.svcCtx.Auth.TenantId(l.ctx)
	if err != nil {
		return nil, err
	}

	// 1) 参数校验
	if len(req.PartNumbers) == 0 {
		return nil, errors.New("parts is required")
	}
	if len(req.PartNumbers) > 1000 {
		return nil, errors.New("too many parts in single request, max 1000")
	}

	// 2) 查找 session
	sess, err := l.svcCtx.UploadSessionsModel.FindOneBySessionId(l.ctx, req.SessionId)
	if err != nil {
		if err == model.ErrNotFound {
			return nil, errors.New("session not found")
		}
		return nil, err
	}

	// 权限校验
	if sess.TenantId != tenantId {
		return nil, errors.New("session not found")
	}

	// 3) 状态校验
	if sess.Status != model.SessionStatusInitiated && sess.Status != model.SessionStatusUploading {
		return nil, errors.New("session is not in uploading state")
	}

	// 4) 模式校验
	if sess.Mode != domain.ModeMultipart {
		return nil, errors.New("not a multipart session")
	}
	if sess.UploadId == "" {
		return nil, errors.New("multipart uploadId not found")
	}

	// 5) 批量生成预签名 URL
	expireSeconds := l.svcCtx.Config.Storage.PresignPutExpireSeconds
	expires := time.Duration(expireSeconds) * time.Second

	parts := make([]types.PresignedPart, 0, len(req.PartNumbers))
	for _, partNum := range req.PartNumbers {
		// 分片号校验
		if partNum <= 0 || int64(partNum) > sess.TotalParts {
			return nil, errors.New("invalid partNumber")
		}

		url, headers, expAt, err := l.svcCtx.Storage.PresignUploadPart(l.ctx, sess.ObjectKey, sess.UploadId, partNum, expires)
		if err != nil {
			return nil, err
		}

		parts = append(parts, types.PresignedPart{
			PartNumber: partNum,
			UploadUrl:  url,
			Headers:    headers,
			ExpiresAt:  expAt, // Unix seconds
		})
	}

	// 更新状态为 Uploading（首次获取分片 URL 时）
	if sess.Status == model.SessionStatusInitiated {
		_ = l.svcCtx.UploadSessionsModel.UpdateStatus(l.ctx, sess.SessionId, model.SessionStatusUploading)
	}

	return &types.PresignPartsResponse{
		Parts: parts,
	}, nil
}

