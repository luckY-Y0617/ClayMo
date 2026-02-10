export interface AbpValidationError {
  message: string
  members?: string[]
}

export interface AbpErrorBody {
  code?: string
  message?: string
  details?: string
  data?: Record<string, unknown>
  validationErrors?: AbpValidationError[]
}

export interface NormalizeAbpErrorOptions {
  /** 当后端 message 为通用内部错误时，优先使用 details */
  preferDetailsWhenGeneric?: boolean
  /** 当 message 为通用内部错误且 details 为空时，是否回退到展示 code */
  fallbackToCodeWhenGeneric?: boolean
  /** 默认兜底文案 */
  defaultMessage?: string
  /** 判定哪些 message 属于“通用内部错误” */
  isGenericInternalError?: (rawMessage?: string) => boolean
}

export interface NormalizedAbpError {
  code?: string
  message: string
  details?: string
}

const defaultIsGenericInternalError = (rawMessage?: string) =>
  rawMessage === 'An internal error occurred during your request!' ||
  rawMessage === 'Internal Server Error'

/**
 * 归一化 ABP 标准错误体（data.error）
 *
 * - 优先通过 getErrorMessage(code, rawMessage) 做映射/本地化
 * - 当 rawMessage 为通用内部错误时：优先使用 details；否则可回退展示 code
 * - validationErrors 优先展示第一条
 */
export function normalizeAbpErrorBody(
  error: AbpErrorBody | undefined,
  deps: {
    getErrorMessage?: (code: string | null | undefined, rawMessage?: string) => string
  } = {},
  options: NormalizeAbpErrorOptions = {}
): NormalizedAbpError {
  const code = error?.code
  const rawMessage = error?.message
  const details = error?.details

  const {
    preferDetailsWhenGeneric = true,
    fallbackToCodeWhenGeneric = true,
    defaultMessage = '操作失败，请稍后重试',
    isGenericInternalError = defaultIsGenericInternalError,
  } = options

  const getErrorMessage =
    deps.getErrorMessage ||
    ((c: string | null | undefined, m?: string) => (m && String(m)) || (c && String(c)) || defaultMessage)

  let message = getErrorMessage(code, rawMessage)

  const generic = isGenericInternalError(rawMessage)
  if (generic) {
    if (preferDetailsWhenGeneric && typeof details === 'string' && details.trim()) {
      message = details
    } else if (fallbackToCodeWhenGeneric && code) {
      message = getErrorMessage(code, code)
    }
  }

  const v = error?.validationErrors
  if (Array.isArray(v) && v.length) {
    const first = v[0]
    if (first?.message) {
      message = first.message
    }
  }

  return {
    code,
    message: message || defaultMessage,
    details,
  }
}

