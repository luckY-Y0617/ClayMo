package files

import (
	"encoding/json"

	"github.com/google/uuid"
)

func newEventId() string { return uuid.NewString() }

func mustJson(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		// JSON 编码失败通常是开发错误（例如 map 里放了 channel/function）
		panic(err)
	}
	return string(b)
}
