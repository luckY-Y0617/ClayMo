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

type AbortUploadLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewAbortUploadLogic(ctx context.Context, svcCtx *svc.ServiceContext) *AbortUploadLogic {
	return &AbortUploadLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

// AbortUpload 取消上传会话
// POST /uploads/sessions/{sessionId}/abort
func (l *AbortUploadLogic) AbortUpload(req *types.AbortUploadRequest) (*types.AbortUploadResponse, error) {
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

	// 2) 幂等：已取消
	if sess.Status == model.SessionStatusAborted {
		return &types.AbortUploadResponse{
			SessionId: sess.SessionId,
			Success:   true,
			Message:   "already aborted",
		}, nil
	}

	// 3) 不能取消已 finalized 的 session
	if sess.FinalizedFileId != "" {
		return nil, errors.New("cannot abort finalized session")
	}

	// 4) 清理存储资源
	if sess.Mode == domain.ModeMultipart && sess.UploadId != "" {
		// 取消分片上传
		_ = l.svcCtx.Storage.AbortMultipart(l.ctx, sess.ObjectKey, sess.UploadId)
	} else if sess.Mode == domain.ModeSingle {
		// 单文件：尝试删除已上传的对象（best-effort）
		_ = l.svcCtx.Storage.DeleteObject(l.ctx, sess.ObjectKey)
	}

	// 5) 更新状态
	if err := l.svcCtx.UploadSessionsModel.UpdateStatus(l.ctx, sess.SessionId, model.SessionStatusAborted); err != nil {
		return nil, err
	}

	return &types.AbortUploadResponse{
		SessionId: sess.SessionId,
		Success:   true,
		Message:   "ok",
	}, nil
}
