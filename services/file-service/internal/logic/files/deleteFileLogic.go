// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"context"
	"errors"

	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/core/stores/sqlx"

	"file-service/internal/domain"
	"file-service/internal/model"
	"file-service/internal/svc"
	"file-service/internal/types"
)

type DeleteFileLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewDeleteFileLogic(ctx context.Context, svcCtx *svc.ServiceContext) *DeleteFileLogic {
	return &DeleteFileLogic{Logger: logx.WithContext(ctx), ctx: ctx, svcCtx: svcCtx}
}

func (l *DeleteFileLogic) DeleteFile(req *types.DeleteFileRequest) (*types.DeleteFileResponse, error) {
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

	// 幂等
	if file.Status == domain.FileDeleted {
		return &types.DeleteFileResponse{Success: true, Message: "already deleted"}, nil
	}

	now := nowMs()

	err = l.svcCtx.DB.TransactCtx(l.ctx, func(ctx context.Context, _ sqlx.Session) error {
		if req.Hard {
			// hard delete：先删对象再删记录（对象删除失败可重试）
			_ = l.svcCtx.Storage.DeleteObject(ctx, file.ObjectKey)
			if err := l.svcCtx.FileInfosModel.Delete(ctx, file.Id); err != nil {
				return err
			}
		} else {
			// soft delete
			file.Status = domain.FileDeleted
			file.DeletedAt = now
			file.UpdatedAt = now
			if err := l.svcCtx.FileInfosModel.Update(ctx, file); err != nil {
				return err
			}
		}

		// outbox
		ev := &model.FileOutbox{
			EventId:       newEventId(),
			TenantId:      file.TenantId,
			AggregateType: "file",
			AggregateId:   file.FileId,
			EventType:     "FileDeleted",
			Payload:       mustJson(map[string]any{"fileId": file.FileId, "hard": req.Hard, "bucket": file.Bucket, "objectKey": file.ObjectKey}),
			Status:        "Pending",
			RetryCount:    0,
			NextRetryAt:   0,
			CreatedAt:     now,
			UpdatedAt:     now,
		}
		_, err := l.svcCtx.FileOutboxModel.Insert(ctx, ev)
		return err
	})
	if err != nil {
		return nil, err
	}

	return &types.DeleteFileResponse{Success: true, Message: "ok"}, nil
}
