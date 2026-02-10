package domain

import "strings"

// ---------- File status ----------
const (
	FileUploading  = "Uploading"
	FileAvailable  = "Available"
	FileProcessing = "Processing"
	FileFailed     = "Failed"
	FileDeleted    = "Deleted"
	FileAborted    = "Aborted"
)

// ---------- Upload mode ----------
const (
	ModeAuto      = "auto"
	ModeSingle    = "single"
	ModeMultipart = "multipart"
)

// ---------- Transcode task status ----------
const (
	TaskQueued  = "Queued"
	TaskRunning = "Running"
	TaskSuccess = "Success"
	TaskFailed  = "Failed"
)

// NormalizeMode normalizes user input mode to canonical values:
// "", "AUTO" -> "auto"; invalid -> "auto".
func NormalizeMode(mode string) string {
	m := strings.ToLower(strings.TrimSpace(mode))
	switch m {
	case ModeSingle, ModeMultipart, ModeAuto:
		return m
	default:
		return ModeAuto
	}
}

func IsValidFileStatus(s string) bool {
	switch strings.TrimSpace(s) {
	case FileUploading, FileAvailable, FileProcessing, FileFailed, FileDeleted, FileAborted:
		return true
	default:
		return false
	}
}

// CanTransitFileStatus defines a minimal state machine to prevent invalid transitions.
// You can adjust later based on your product rules.
func CanTransitFileStatus(from, to string) bool {
	from = strings.TrimSpace(from)
	to = strings.TrimSpace(to)
	if from == to {
		return true
	}
	// once deleted, no transitions (soft delete terminal)
	if from == FileDeleted {
		return false
	}
	// aborted is terminal from upload perspective
	if from == FileAborted {
		return false
	}

	switch from {
	case FileUploading:
		// upload complete -> available or processing; or failed; or aborted; or deleted
		return to == FileAvailable || to == FileProcessing || to == FileFailed || to == FileAborted || to == FileDeleted
	case FileAvailable:
		// available -> processing (e.g., manual transcode), or deleted
		return to == FileProcessing || to == FileDeleted
	case FileProcessing:
		// processing -> available (success) or failed; or deleted
		return to == FileAvailable || to == FileFailed || to == FileDeleted
	case FileFailed:
		// failed -> processing (retry) or deleted
		return to == FileProcessing || to == FileDeleted
	default:
		return false
	}
}

func IsValidTaskStatus(s string) bool {
	switch strings.TrimSpace(s) {
	case TaskQueued, TaskRunning, TaskSuccess, TaskFailed:
		return true
	default:
		return false
	}
}
