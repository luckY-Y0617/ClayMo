// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/core/stores/sqlx"

	"file-service/internal/domain"
	"file-service/internal/model"
	"file-service/internal/svc"
	"file-service/internal/types"
)

type FinalizeUploadLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewFinalizeUploadLogic(ctx context.Context, svcCtx *svc.ServiceContext) *FinalizeUploadLogic {
	return &FinalizeUploadLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

// FinalizeUpload 完成上传并创建 File（Step 4）
// POST /uploads/sessions/{sessionId}/finalize
// 👉 只有这一步，fileId 才第一次出现
func (l *FinalizeUploadLogic) FinalizeUpload(req *types.FinalizeUploadRequest) (*types.FinalizeUploadResponse, error) {
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

	// 2) 幂等：已 finalized（finalized_file_id != ""）则直接返回
	if sess.FinalizedFileId != "" {
		// 查找已创建的 file
		file, err := l.svcCtx.FileInfosModel.FindOneByFileId(l.ctx, sess.FinalizedFileId)
		if err != nil {
			// file 可能被删了，但 session 记录了 fileId，仍然返回
			return &types.FinalizeUploadResponse{
				FileId:   sess.FinalizedFileId,
				Status:   domain.FileAvailable,
				FileType: sess.FileType,
				FileSize: sess.FileSize,
				Message:  "already finalized",
			}, nil
		}
		return &types.FinalizeUploadResponse{
			FileId:   file.FileId,
			Status:   file.Status,
			FileType: file.FileType,
			FileSize: file.FileSize,
			Message:  "already finalized",
		}, nil
	}

	// 3) 状态校验：必须是 Completed
	if sess.Status != model.SessionStatusCompleted {
		return nil, errors.New("session must be completed before finalize, current status: " + sess.Status)
	}

	// 4) 创建 File 记录（事务）
	fileId := uuid.NewString()
	now := nowMs()

	err = l.svcCtx.DB.TransactCtx(l.ctx, func(ctx context.Context, _ sqlx.Session) error {
		// 创建 file_infos 记录
		file := &model.FileInfos{
			FileId:     fileId,
			TenantId:   sess.TenantId,
			OwnerId:    sess.OwnerId,
			FileName:   sess.FileName,
			FileSize:   sess.FileSize,
			FileType:   sess.FileType,
			BizType:    sess.BizType,
			FileHash:   sess.FileHash,
			Bucket:     sess.Bucket,
			ObjectKey:  sess.ObjectKey,
			Status:     domain.FileAvailable,
			Width:      0,
			Height:     0,
			DurationMs: 0,
			Version:    0,
			CreatedAt:  now,
			UpdatedAt:  now,
			DeletedAt:  0,
		}

		if _, err := l.svcCtx.FileInfosModel.Insert(ctx, file); err != nil {
			return err
		}

		// 更新 session：设置 finalized_file_id（幂等保证）
		// 注意：不改变 status，保持 Completed
		if err := l.svcCtx.UploadSessionsModel.UpdateFinalized(ctx, sess.SessionId, fileId); err != nil {
			return err
		}

		// 写 outbox 事件：FileCreated
		ev := &model.FileOutbox{
			EventId:       newEventId(),
			TenantId:      sess.TenantId,
			AggregateType: "file",
			AggregateId:   fileId,
			EventType:     "FileCreated",
			Payload: mustJson(map[string]any{
				"fileId":    fileId,
				"tenantId":  sess.TenantId,
				"ownerId":   sess.OwnerId,
				"fileName":  sess.FileName,
				"fileSize":  sess.FileSize,
				"fileType":  sess.FileType,
				"bizType":   sess.BizType,
				"fileHash":  sess.FileHash,
				"bucket":    sess.Bucket,
				"objectKey": sess.ObjectKey,
				"status":    domain.FileAvailable,
				"createdAt": now,
			}),
			Status:     "Pending",
			RetryCount: 0,
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		_, err := l.svcCtx.FileOutboxModel.Insert(ctx, ev)
		return err
	})
	if err != nil {
		return nil, err
	}

	// ⚠️ 不返回 contentUrl
	return &types.FinalizeUploadResponse{
		FileId:   fileId,
		Status:   domain.FileAvailable,
		FileType: sess.FileType,
		FileSize: sess.FileSize,
		Message:  "ok",
	}, nil
}
