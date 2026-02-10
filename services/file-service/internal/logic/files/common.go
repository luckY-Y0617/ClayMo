package files

import (
	"database/sql"
	"fmt"
	"path"
	"regexp"
	"strings"
	"time"
	"unicode"
)

const (
	DispInline     = "inline"
	DispAttachment = "attachment"
)

// HitType 命中类型常量
const (
	HitTypeNone       = ""           // 新建
	HitTypeIdempotent = "idempotent" // 幂等命中
	HitTypeDedup      = "dedup"      // 秒传命中
)

// 文件名安全字符：字母、数字、点、下划线、横线
var filenameSafeChars = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

// sanitizeFileName 对文件名进行严格清理，防止路径穿越和注入
// 1. 移除控制字符
// 2. 移除路径穿越字符 (../, ..\, /, \)
// 3. 只保留安全字符
// 4. 限制长度
// 5. 确保有效文件名
func sanitizeFileName(name string) string {
	// 1. 基础清理
	name = strings.TrimSpace(name)
	if name == "" {
		return "file"
	}

	// 2. 移除控制字符和不可打印字符
	var cleaned strings.Builder
	for _, r := range name {
		if unicode.IsPrint(r) && !unicode.IsControl(r) {
			cleaned.WriteRune(r)
		}
	}
	name = cleaned.String()

	// 3. 移除路径穿越攻击向量
	// 处理 ../ 和 ..\
	name = strings.ReplaceAll(name, "../", "")
	name = strings.ReplaceAll(name, "..\\", "")
	name = strings.ReplaceAll(name, "..", "")
	// 移除路径分隔符
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\\", "_")

	// 4. 提取扩展名（在替换特殊字符之前）
	ext := path.Ext(name)
	base := strings.TrimSuffix(name, ext)

	// 5. 替换不安全字符为下划线
	base = filenameSafeChars.ReplaceAllString(base, "_")
	ext = filenameSafeChars.ReplaceAllString(ext, "_")

	// 6. 清理连续下划线
	for strings.Contains(base, "__") {
		base = strings.ReplaceAll(base, "__", "_")
	}
	base = strings.Trim(base, "_")

	// 7. 确保 base 不为空
	if base == "" {
		base = "file"
	}

	// 8. 限制长度（总长度 <= 200，base <= 160，ext <= 40）
	const maxTotal = 200
	const maxBase = 160
	const maxExt = 40

	if len(ext) > maxExt {
		ext = ext[:maxExt]
	}
	if len(base) > maxBase {
		base = base[:maxBase]
	}
	if len(base)+len(ext) > maxTotal {
		base = base[:maxTotal-len(ext)]
	}

	// 9. 重新组合
	if ext != "" && !strings.HasPrefix(ext, ".") && ext != "_" {
		return base + "." + strings.TrimPrefix(ext, ".")
	}
	return base + ext
}

// ==================== 时间工具函数 ====================

// nowMs 返回当前时间的毫秒时间戳
func nowMs() int64 {
	return time.Now().UnixMilli()
}

// timeNow 返回当前时间
func timeNow() time.Time {
	return time.Now()
}

// msToSeconds 毫秒转秒（用于响应）
func msToSeconds(ms int64) int64 {
	return ms / 1000
}

// secondsToMs 秒转毫秒（用于存储）
func secondsToMs(s int64) int64 {
	return s * 1000
}

// expiresAtFromDuration 根据 duration 计算过期时间（毫秒）
func expiresAtFromDuration(d time.Duration) int64 {
	return nowMs() + d.Milliseconds()
}

// ==================== 其他工具函数 ====================

func stableContentUrl(fileId string) string {
	return fmt.Sprintf("/api/files/%s/content", fileId)
}

func stableDownloadUrl(fileId string) string {
	return fmt.Sprintf("/api/files/%s/download", fileId)
}

func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}

func ceilDiv(a, b int64) int64 {
	if b <= 0 {
		return 0
	}
	return (a + b - 1) / b
}

// buildObjectKey generates storage object key
// 格式: {tenant}/{biz_type}/{YYYY-MM}/{session_id}/{sanitized_filename}
// 每个 session 有唯一的 objectKey，避免并发覆盖
func buildObjectKey(tenantId, ownerId, bizType, sessionId, fileName string) string {
	if bizType == "" {
		bizType = "default"
	}
	yearMonth := time.Now().Format("2006-01")
	safeName := sanitizeFileName(fileName)
	return fmt.Sprintf("%s/%s/%s/%s/%s", tenantId, bizType, yearMonth, sessionId, safeName)
}
