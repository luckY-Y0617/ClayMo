package model

import "github.com/zeromicro/go-zero/core/stores/sqlx"

var _ FileOutboxModel = (*customFileOutboxModel)(nil)

type (
	FileOutboxModel interface {
		fileOutboxModel
	}

	customFileOutboxModel struct {
		*defaultFileOutboxModel
	}
)

// NewFileOutboxModel returns a model for the database table.
func NewFileOutboxModel(conn sqlx.SqlConn) FileOutboxModel {
	return &customFileOutboxModel{
		defaultFileOutboxModel: newFileOutboxModel(conn),
	}
}
