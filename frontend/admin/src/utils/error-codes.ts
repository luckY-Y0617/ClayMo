// ===== 从共享包重导出 =====
export { ERROR_CODE_MAP, getErrorMessage, isKnownErrorCode } from '@claymo/error-codes'

// ===== 从 ts-common 共享错误归一化 =====
import { normalizeAbpErrorBody } from '@claymo/ts-common/errors'

// ===== Admin 专用辅助函数 =====

/** 判断是否为认证错误 */
export function isAuthError(errorCode?: string): boolean {
  if (!errorCode) return false
  return errorCode.startsWith('Identity:') || errorCode === 'Permission:Forbidden'
}

/** 判断是否需要重新登录 */
export function needsRelogin(errorCode?: string): boolean {
  if (!errorCode) return false
  const reloginCodes = [
    'Identity:TokenExpired',
    'Identity:SessionExpired',
    'Identity:InvalidToken',
  ]
  return reloginCodes.includes(errorCode)
}

/** 错误响应接口定义 */
export interface ApiErrorResponse {
  error: {
    code?: string
    message?: string
    details?: string
    data?: Record<string, unknown>
    validationErrors?: Array<{
      message: string
      members: string[]
    }>
  }
}

/** 从 Axios 错误响应中提取结构化信息 */
export function extractErrorInfo(error: unknown): {
  code?: string
  message: string
  details?: string
} {
  const axiosError = error as {
    response?: { data?: { error?: ApiErrorResponse['error']; message?: string } }
    message?: string
  }

  // 标准 ABP 错误格式：{ error: { code, message, details, validationErrors } }
  if (axiosError?.response?.data?.error) {
    const apiError = axiosError.response.data.error
    const { getErrorMessage } = await_free_getErrorMessage()

    const normalized = normalizeAbpErrorBody(
      apiError,
      {
        getErrorMessage,
      },
      {
        defaultMessage: '操作失败，请稍后重试',
      }
    )

    return normalized
  }

  // 简单错误格式：{ message }
  if (axiosError?.response?.data?.message) {
    return {
      message: axiosError.response.data.message,
    }
  }

  // Axios 网络错误
  if (axiosError?.message) {
    if (axiosError.message.includes('timeout')) {
      return { message: '请求超时，请稍后重试' }
    }
    if (axiosError.message.includes('Network Error')) {
      return { message: '网络错误，请检查网络连接' }
    }
  }

  // 默认错误
  return { message: '操作失败，请稍后重试' }
}

/**
 * 内部辅助：同步获取 getErrorMessage 引用
 * 由于从共享包重导出的 getErrorMessage 在模块顶层已绑定，
 * 此处直接引用即可（避免在 extractErrorInfo 中再次动态导入）。
 */
function await_free_getErrorMessage() {
  // 直接从模块缓存取
  return { getErrorMessage: _getErrorMessage }
}

// 模块级引用
import { getErrorMessage as _getErrorMessage } from '@claymo/error-codes'
