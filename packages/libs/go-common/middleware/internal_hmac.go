package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/zeromicro/go-zero/core/logx"
)

type InternalHmacConfig struct {
	Secret                string
	AllowClockSkewSeconds int64
}

// 约定：
// Header: X-Internal-Timestamp: unix秒
// Header: X-Internal-Signature: hex(hmac_sha256(secret, ts + "\n" + rawBody))
type InternalHmacMiddleware struct {
	cfg InternalHmacConfig
}

func NewInternalHmacMiddleware(cfg InternalHmacConfig) *InternalHmacMiddleware {
	return &InternalHmacMiddleware{cfg: cfg}
}

func (m *InternalHmacMiddleware) Handle(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tsStr := r.Header.Get("X-Internal-Timestamp")
		sig := r.Header.Get("X-Internal-Signature")
		if tsStr == "" || sig == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		ts, err := strconv.ParseInt(tsStr, 10, 64)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		now := time.Now().Unix()
		if abs(now-ts) > m.cfg.AllowClockSkewSeconds {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		raw, err := io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		_ = r.Body.Close()
		r.Body = io.NopCloser(bytes.NewReader(raw))

		mac := hmac.New(sha256.New, []byte(m.cfg.Secret))
		_, _ = mac.Write([]byte(tsStr))
		_, _ = mac.Write([]byte("\n"))
		_, _ = mac.Write(raw)
		expect := hex.EncodeToString(mac.Sum(nil))

		if !hmac.Equal([]byte(expect), []byte(sig)) {
			logx.Errorf("internal hmac mismatch")
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

func abs(x int64) int64 {
	if x < 0 {
		return -x
	}
	return x
}
