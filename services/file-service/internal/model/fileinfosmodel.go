package model

import (
	"context"
	"fmt"
	"strings"

	"github.com/zeromicro/go-zero/core/stores/sqlx"
)

var _ FileInfosModel = (*customFileInfosModel)(nil)

// FileListFilter defines filter parameters for ListByFilter
type FileListFilter struct {
	TenantId    string
	BizType     string
	Keyword     string
	Status      string
	Mime        string
	OwnerId     string
	CreatedFrom string
	CreatedTo   string
	Offset      int
	Limit       int
}

type (
	// FileInfosModel is an interface to be customized, add more methods here,
	// and implement the added methods in customFileInfosModel.
	FileInfosModel interface {
		fileInfosModel
		FindOneByTenantIdFileHash(ctx context.Context, tenantId, fileHash string) (*FileInfos, error)
		ListByFilter(ctx context.Context, filter FileListFilter) ([]*FileInfos, int64, error)
	}

	customFileInfosModel struct {
		*defaultFileInfosModel
	}
)

// NewFileInfosModel returns a model for the database table.
func NewFileInfosModel(conn sqlx.SqlConn) FileInfosModel {
	return &customFileInfosModel{
		defaultFileInfosModel: newFileInfosModel(conn),
	}
}

// FindOneByTenantIdFileHash finds an Available file by tenant id and file hash (for dedup/秒传)
// 只返回 status=Available 的文件，确保 dedup 不会返回已删除/处理中的文件
func (m *customFileInfosModel) FindOneByTenantIdFileHash(ctx context.Context, tenantId, fileHash string) (*FileInfos, error) {
	if fileHash == "" {
		return nil, ErrNotFound
	}

	var resp FileInfos
	query := fmt.Sprintf("select %s from %s where `tenant_id` = ? and `file_hash` = ? and `status` = 'Available' and `deleted_at` = 0 order by `created_at` desc limit 1", fileInfosRows, m.table)
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

// ListByFilter lists files by filter with pagination
func (m *customFileInfosModel) ListByFilter(ctx context.Context, filter FileListFilter) ([]*FileInfos, int64, error) {
	var conditions []string
	var args []interface{}

	conditions = append(conditions, "`tenant_id` = ?")
	args = append(args, filter.TenantId)

	conditions = append(conditions, "`deleted_at` = 0")

	if filter.BizType != "" {
		conditions = append(conditions, "`biz_type` = ?")
		args = append(args, filter.BizType)
	}
	if filter.Status != "" {
		conditions = append(conditions, "`status` = ?")
		args = append(args, filter.Status)
	}
	if filter.Mime != "" {
		conditions = append(conditions, "`file_type` LIKE ?")
		args = append(args, filter.Mime+"%")
	}
	if filter.OwnerId != "" {
		conditions = append(conditions, "`owner_id` = ?")
		args = append(args, filter.OwnerId)
	}
	if filter.Keyword != "" {
		conditions = append(conditions, "`file_name` LIKE ?")
		args = append(args, "%"+filter.Keyword+"%")
	}

	where := strings.Join(conditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf("select count(*) from %s where %s", m.table, where)
	var total int64
	if err := m.conn.QueryRowCtx(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	// List with pagination
	listQuery := fmt.Sprintf("select %s from %s where %s order by `created_at` desc limit ?, ?", fileInfosRows, m.table, where)
	args = append(args, filter.Offset, filter.Limit)

	var items []*FileInfos
	if err := m.conn.QueryRowsCtx(ctx, &items, listQuery, args...); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}
