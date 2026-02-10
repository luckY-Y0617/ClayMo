import type { AxiosRequestConfig } from 'axios'

// ============ 网关前缀常量 ============

/** 主服务 API 前缀（后端 ABP 服务） */
export const API = '/api'

/** 文件服务前缀（Go 文件服务） */
export const FS = '/fs'

/** 文件服务超时时间（5分钟，用于大文件上传下载） */
export const FS_TIMEOUT = 300000

// ============ 请求配置类型 ============

/** 扩展的请求配置 */
export interface RequestConfig extends AxiosRequestConfig {
  /** 是否显示错误提示（默认 true） */
  showError?: boolean
  /** 自定义错误处理 */
  errorHandler?: (error: unknown) => void
}

/**
 * 前端内部使用的会话状态码
 * 注意：这与 @claymo/error-codes 中的业务错误码不同
 * 业务错误码用于后端返回的错误，这里是前端会话管理
 */
export const ERROR_CODES = {
  ACCESS_TOKEN_EXPIRED: 'ACCESS_TOKEN_EXPIRED',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_REVOKED: 'SESSION_REVOKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
