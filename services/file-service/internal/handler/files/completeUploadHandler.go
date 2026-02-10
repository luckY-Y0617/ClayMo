// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"net/http"

	logic "file-service/internal/logic/files"
	"file-service/internal/svc"
	"file-service/internal/types"

	"github.com/claymo/go-common/httpx"
	gzhttpx "github.com/zeromicro/go-zero/rest/httpx"
)

func CompleteUploadHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.CompleteUploadRequest
		if err := gzhttpx.Parse(r, &req); err != nil {
			// 统一错误输出（code/message）
			httpx.Fail(w, err)
			return
		}

		l := logic.NewCompleteUploadLogic(r.Context(), svcCtx)
		resp, err := l.CompleteUpload(&req)
		if err != nil {
			httpx.Fail(w, err)
			return
		}

		// 成功响应不包裹，直接输出业务返回体
		httpx.Ok(w, resp)
	}
}
