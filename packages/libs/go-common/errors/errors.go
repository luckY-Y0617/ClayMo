package errors

import "net/http"

// Error is a typed error carrying HTTP status code and stable business code.
type Error struct {
	HTTPCode int
	Code     string
	Message  string
}

func (e *Error) Error() string { return e.Code + ": " + e.Message }

func New(httpCode int, code, msg string) *Error {
	return &Error{HTTPCode: httpCode, Code: code, Message: msg}
}

var (
	ErrBadRequest   = New(http.StatusBadRequest, "BadRequest", "bad request")
	ErrUnauthorized = New(http.StatusUnauthorized, "Unauthorized", "unauthorized")
	ErrForbidden    = New(http.StatusForbidden, "Forbidden", "forbidden")
	ErrNotFound     = New(http.StatusNotFound, "NotFound", "not found")
	ErrConflict     = New(http.StatusConflict, "Conflict", "conflict")
	ErrInternal     = New(http.StatusInternalServerError, "InternalError", "internal error")

	// domain-specific examples (you can add more later)
	ErrInvalidMode           = New(http.StatusBadRequest, "Upload:InvalidMode", "invalid upload mode")
	ErrInvalidPartNumber     = New(http.StatusBadRequest, "Upload:InvalidPartNumber", "invalid part number")
	ErrTransformNotSupported = New(http.StatusBadRequest, "Content:TransformNotSupported", "image transform not supported yet")
)

