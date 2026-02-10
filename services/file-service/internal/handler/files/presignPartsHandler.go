// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package files

import (
	"net/http"

	"file-service/internal/logic/files"
	"file-service/internal/svc"
	"file-service/internal/types"

	"github.com/claymo/go-common/httpx"
	gzhttpx "github.com/zeromicro/go-zero/rest/httpx"
)

func PresignPartsHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.PresignPartsRequest
		if err := gzhttpx.Parse(r, &req); err != nil {
			httpx.Fail(w, err)
			return
		}

		l := files.NewPresignPartsLogic(r.Context(), svcCtx)
		resp, err := l.PresignParts(&req)
		httpx.Response(r, w, resp, err)
	}
}

