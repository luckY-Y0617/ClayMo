// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"context"
	"errors"

	"github.com/zeromicro/go-zero/core/logx"

	"file-service/internal/domain"
	"file-service/internal/model"
	"file-service/internal/svc"
	"file-service/internal/types"
)

type UploadProgressLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewUploadProgressLogic(ctx context.Context, svcCtx *svc.ServiceContext) *UploadProgressLogic {
	return &UploadProgressLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

// UploadProgress 获取上传进度
// GET /uploads/sessions/{sessionId}/progress
func (l *UploadProgressLogic) UploadProgress(req *types.UploadProgressRequest) (*types.UploadProgressResponse, error) {
	tenantId, err := l.svcCtx.Auth.TenantId(l.ctx)
	if err != nil {
		return nil, err
	}

	// 1) 查找 session
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

	resp := &types.UploadProgressResponse{
		SessionId: sess.SessionId,
		Mode:      sess.Mode,
		Status:    sess.Status,
	}

	// 2) 根据状态判断进度
	if sess.Status == model.SessionStatusCompleted || sess.FinalizedFileId != "" {
		resp.Progress = 100
		return resp, nil
	}
	if sess.Status == model.SessionStatusAborted || sess.Status == model.SessionStatusExpired || sess.Status == model.SessionStatusFailed {
		resp.Progress = 0
		return resp, nil
	}

	// 3) 单文件：检查对象是否存在
	if sess.Mode == domain.ModeSingle {
		_, _, err := l.svcCtx.Storage.HeadObject(l.ctx, sess.ObjectKey)
		if err == nil {
			resp.Progress = 100
		} else {
			resp.Progress = 0
		}
		return resp, nil
	}

	// 4) 分片上传：列出已上传的分片
	if sess.Mode == domain.ModeMultipart && sess.UploadId != "" && sess.TotalParts > 0 {
		parts, err := l.svcCtx.Storage.ListUploadedParts(l.ctx, sess.ObjectKey, sess.UploadId)
		if err != nil {
			return nil, err
		}

		uploaded := make([]int, 0, len(parts))
		for _, p := range parts {
			uploaded = append(uploaded, p.PartNumber)
		}

		resp.UploadedParts = uploaded
		resp.TotalParts = int(sess.TotalParts)
		resp.Progress = int(float64(len(uploaded)) / float64(sess.TotalParts) * 100.0)
		return resp, nil
	}

	resp.Progress = 0
	return resp, nil
}
