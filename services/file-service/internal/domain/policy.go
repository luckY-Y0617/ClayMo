package domain

import (
	"strings"
)

type UploadPolicy struct {
	AutoMultipartThresholdBytes int64 // >= this size, auto -> multipart
	MinPartSizeBytes            int64 // lower bound for chunk size (S3: 5MB recommended)
	MaxParts                    int   // S3 hard limit: 10000
}

// DefaultPolicy returns a safe baseline if you want a fallback.
func DefaultPolicy() UploadPolicy {
	return UploadPolicy{
		AutoMultipartThresholdBytes: 10 * 1024 * 1024, // 10MB
		MinPartSizeBytes:            5 * 1024 * 1024,  // 5MB
		MaxParts:                    10000,
	}
}

// DecideMode decides final mode according to requested mode + file size.
// requested can be "auto|single|multipart" (case-insensitive). Others -> auto.
func (p UploadPolicy) DecideMode(fileSize int64, requested string) string {
	req := NormalizeMode(requested)

	// sanitize policy
	threshold := p.AutoMultipartThresholdBytes
	if threshold <= 0 {
		threshold = DefaultPolicy().AutoMultipartThresholdBytes
	}

	if req == ModeSingle || req == ModeMultipart {
		return req
	}

	if fileSize >= threshold {
		return ModeMultipart
	}
	return ModeSingle
}

// PlanMultipart calculates chunkSize and totalParts for multipart upload.
// Rules:
// - chunkSize >= MinPartSizeBytes
// - totalParts <= MaxParts
// - preferredChunkSize is an optional hint; if <=0, starts with MinPartSizeBytes
//
// ok=false means cannot plan (invalid policy or fileSize <=0).
func (p UploadPolicy) PlanMultipart(fileSize int64, preferredChunkSize int64) (chunkSize int64, totalParts int, ok bool) {
	if fileSize <= 0 {
		return 0, 0, false
	}

	minPart := p.MinPartSizeBytes
	if minPart <= 0 {
		minPart = DefaultPolicy().MinPartSizeBytes
	}

	maxParts := p.MaxParts
	if maxParts <= 0 {
		maxParts = DefaultPolicy().MaxParts
	}

	chunkSize = preferredChunkSize
	if chunkSize <= 0 {
		chunkSize = minPart
	}
	if chunkSize < minPart {
		chunkSize = minPart
	}

	// compute parts with ceil division
	totalParts = ceilDivInt64ToInt(fileSize, chunkSize)
	if totalParts <= 0 {
		return 0, 0, false
	}

	// adjust chunkSize upward until parts <= maxParts
	for totalParts > maxParts {
		// double chunkSize to reduce part count quickly
		chunkSize *= 2
		totalParts = ceilDivInt64ToInt(fileSize, chunkSize)
		if chunkSize <= 0 { // overflow guard
			return 0, 0, false
		}
	}

	if totalParts > maxParts {
		return 0, 0, false
	}
	return chunkSize, totalParts, true
}

// IsSupportedMode checks if mode is one of auto/single/multipart (case-insensitive).
func IsSupportedMode(mode string) bool {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case ModeAuto, ModeSingle, ModeMultipart:
		return true
	default:
		return false
	}
}

func ceilDivInt64ToInt(a, b int64) int {
	// b > 0 assumed by caller

	return int((a + b - 1) / b)
}
