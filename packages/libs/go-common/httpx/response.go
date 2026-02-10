package httpx

import (
	"net/http"

	"github.com/claymo/go-common/errors"
	"github.com/zeromicro/go-zero/core/logx"
	"github.com/zeromicro/go-zero/rest/httpx"
)

type ErrorResp struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func Ok(w http.ResponseWriter, v any) {
	httpx.OkJson(w, v)
}

func Fail(w http.ResponseWriter, err error) {
	if err == nil {
		httpx.WriteJson(w, http.StatusInternalServerError, ErrorResp{
			Code:    errors.ErrInternal.Code,
			Message: errors.ErrInternal.Message,
		})
		return
	}

	// typed error
	if xe, ok := err.(*errors.Error); ok {
		httpx.WriteJson(w, xe.HTTPCode, ErrorResp{Code: xe.Code, Message: xe.Message})
		return
	}

	// unknown error: log it for debugging, but don't leak details
	logx.Errorf("unhandled error: %v", err)
	httpx.WriteJson(w, http.StatusInternalServerError, ErrorResp{
		Code:    errors.ErrInternal.Code,
		Message: errors.ErrInternal.Message,
	})
}

// Response 统一响应处理
func Response(r *http.Request, w http.ResponseWriter, resp any, err error) {
	if err != nil {
		Fail(w, err)
		return
	}
	Ok(w, resp)
}

