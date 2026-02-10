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

func GetFileContentHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.GetFileContentRequest
		if err := httpx.Parse(r, &req); err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		l := files.NewGetFileContentLogic(r.Context(), svcCtx)
		signedUrl, err := l.GetFileContent(&req)
		if err != nil {
			httpx.ErrorCtx(r.Context(), w, err)
			return
		}

		// 307 临时重定向到预签名 URL
		http.Redirect(w, r, signedUrl, http.StatusTemporaryRedirect)
	}
}
