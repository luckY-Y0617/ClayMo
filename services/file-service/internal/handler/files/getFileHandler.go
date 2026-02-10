// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"net/http"

	"file-service/internal/logic/files"
	"file-service/internal/svc"
	"file-service/internal/types"
	"github.com/zeromicro/go-zero/rest/httpx"
)

func GetFileHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.GetFileRequest
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := files.NewGetFileLogic(r.Context(), svcCtx)
		resp, err := l.GetFile(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
		} else {
			httpx.OkJsonCtx(r.Context(), w, resp)
		}
	}
}
