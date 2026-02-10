// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"context"
	"errors"
	"fmt"

	"github.com/zeromicro/go-zero/core/logx"

	"file-service/internal/domain"
	"file-service/internal/model"
	"file-service/internal/svc"
	"file-service/internal/types"

	"github.com/claymo/go-common/storage"
)

type CompleteUploadLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewCompleteUploadLogic(ctx context.Context, svcCtx *svc.ServiceContext) *CompleteUploadLogic {
	return &CompleteUploadLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

// CompleteUpload 完成上传会话（Step 3）
// POST /uploads/sessions/{sessionId}/complete
// 只做校验+合并，不创建 File，不返回 contentUrl
func (l *CompleteUploadLogic) CompleteUpload(req *types.CompleteUploadRequest) (*types.CompleteUploadResponse, error) {
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

	// 2) 幂等：已完成直接返回
	if sess.Status == model.SessionStatusCompleted {
		return &types.CompleteUploadResponse{
			SessionId: sess.SessionId,
			Status:    sess.Status,
			Message:   "already completed",
		}, nil
	}

	// 状态校验：
	// - single 模式：Initiated 或 Uploading 可以 Complete
	// - multipart 模式：只有 Uploading 可以 Complete（CreateMultipart 后即为 Uploading）
	if sess.Status != model.SessionStatusInitiated && sess.Status != model.SessionStatusUploading {
		return nil, errors.New("invalid session status: " + sess.Status)
	}

	// 3) 根据模式验证上传完成（严格校验）
	if sess.Mode == domain.ModeSingle {
		// single 模式：禁止传 parts
		if len(req.Parts) > 0 {
			l.Logger.Infof("warning: single mode session %s received parts, ignored", sess.SessionId)
			// 不报错，但记录告警（或者你可以选择报错）
		}

		// HEAD 验证对象存在
		//size, _, err := l.svcCtx.Storage.HeadObject(l.ctx, sess.ObjectKey)
		//if err != nil {
		//	return nil, errors.New("object not found, upload may not be completed")
		//}
		//// 验证大小
		//if sess.FileSize > 0 && size != sess.FileSize {
		//	return nil, errors.New("size mismatch: expected " + formatSize(sess.FileSize) + ", got " + formatSize(size))
		//}

	} else if sess.Mode == domain.ModeMultipart {
		// multipart 模式：必须传 parts
		if sess.UploadId == "" {
			return nil, errors.New("multipart uploadId not found")
		}
		if len(req.Parts) == 0 {
			return nil, errors.New("parts required for multipart complete")
		}

		// 转换分片信息
		parts := make([]storage.UploadedPart, 0, len(req.Parts))
		for _, p := range req.Parts {
			if p.PartNumber <= 0 {
				return nil, errors.New("invalid partNumber: must be > 0")
			}
			if p.ETag == "" {
				return nil, errors.New("invalid part: etag is required")
			}
			parts = append(parts, storage.UploadedPart{PartNumber: p.PartNumber, ETag: p.ETag})
		}

		// 完成分片上传
		if err := l.svcCtx.Storage.CompleteMultipart(l.ctx, sess.ObjectKey, sess.UploadId, parts); err != nil {
			return nil, err
		}

		// HEAD 验证
		size, _, err := l.svcCtx.Storage.HeadObject(l.ctx, sess.ObjectKey)
		if err != nil {
			return nil, errors.New("object verification failed after multipart complete")
		}
		if sess.FileSize > 0 && size != sess.FileSize {
			return nil, errors.New("size mismatch after multipart complete")
		}
	} else {
		return nil, errors.New("invalid mode: " + sess.Mode)
	}

	// 4) 更新状态为 Completed
	if err := l.svcCtx.UploadSessionsModel.UpdateStatus(l.ctx, sess.SessionId, model.SessionStatusCompleted); err != nil {
		return nil, err
	}

	// ⚠️ 不返回 contentUrl，不返回 fileId
	return &types.CompleteUploadResponse{
		SessionId: sess.SessionId,
		Status:    model.SessionStatusCompleted,
		Message:   "ok",
	}, nil
}

func formatSize(size int64) string {
	return fmt.Sprintf("%d", size)
}
