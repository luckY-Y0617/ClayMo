package model

import (
	"context"
	"fmt"
	"time"

	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

var _ UploadSessionsModel = (*customUploadSessionsModel)(nil)

// Session status constants
// 状态机: Initiated -> Uploading -> Completed -> (finalized_file_id)
//
//	任意状态 -> Aborted | Expired | Failed
const (
	SessionStatusInitiated = "Initiated" // 会话已创建，等待上传
	SessionStatusUploading = "Uploading" // 上传进行中
	SessionStatusCompleted = "Completed" // 上传完成，等待 Finalize
	SessionStatusAborted   = "Aborted"   // 用户取消
	SessionStatusExpired   = "Expired"   // 会话过期
	SessionStatusFailed    = "Failed"    // 上传失败
)

type (
	// UploadSessionsModel is an interface to be customized, add more methods here,
	// and implement the added methods in customUploadSessionsModel.
	UploadSessionsModel interface {
		uploadSessionsModel
		DeleteBySessionId(ctx context.Context, sessionId string) error
		FindOneByTenantIdFileHash(ctx context.Context, tenantId, fileHash string) (*UploadSessions, error)
		UpdateStatus(ctx context.Context, sessionId, status string) error
		UpdateFinalized(ctx context.Context, sessionId, fileId string) error
	}

	customUploadSessionsModel struct {
		*defaultUploadSessionsModel
	}
)

// NewUploadSessionsModel returns a model for the database table.
func NewUploadSessionsModel(conn sqlx.SqlConn) UploadSessionsModel {
	return &customUploadSessionsModel{
		defaultUploadSessionsModel: newUploadSessionsModel(conn),
	}
}

// DeleteBySessionId deletes a session by session id
func (m *customUploadSessionsModel) DeleteBySessionId(ctx context.Context, sessionId string) error {
	data, err := m.FindOneBySessionId(ctx, sessionId)
	if err != nil {
		if err == ErrNotFound {
			return nil // already deleted
		}
		return err
	}
	return m.Delete(ctx, data.Id)
}

// FindOneByTenantIdFileHash finds completed/finalized session by tenant id and file hash for dedup
func (m *customUploadSessionsModel) FindOneByTenantIdFileHash(ctx context.Context, tenantId, fileHash string) (*UploadSessions, error) {
	if fileHash == "" {
		return nil, ErrNotFound
	}

	var resp UploadSessions
	// 只查找已 Completed 且已 finalized 的 session
	query := fmt.Sprintf("select %s from %s where `tenant_id` = ? and `file_hash` = ? and `status` = 'Completed' and `finalized_file_id` != '' order by `created_at` desc limit 1", uploadSessionsRows, m.table)
	err := m.conn.QueryRowCtx(ctx, &resp, query, tenantId, fileHash)
	switch err {
	case nil:
		return &resp, nil
	case sqlx.ErrNotFound:
		return nil, ErrNotFound
	default:
		return nil, err
	}
}

// UpdateStatus updates session status
func (m *customUploadSessionsModel) UpdateStatus(ctx context.Context, sessionId, status string) error {
	query := fmt.Sprintf("update %s set `status` = ?, `updated_at` = ? where `session_id` = ?", m.table)
	_, err := m.conn.ExecCtx(ctx, query, status, time.Now().UnixMilli(), sessionId)
	return err
}

// UpdateFinalized updates session with finalized file id (for Finalize idempotency)
func (m *customUploadSessionsModel) UpdateFinalized(ctx context.Context, sessionId, fileId string) error {
	now := time.Now().UnixMilli()
	query := fmt.Sprintf("update %s set `finalized_file_id` = ?, `finalized_at` = ?, `updated_at` = ? where `session_id` = ?", m.table)
	_, err := m.conn.ExecCtx(ctx, query, fileId, now, now, sessionId)
	return err
}
