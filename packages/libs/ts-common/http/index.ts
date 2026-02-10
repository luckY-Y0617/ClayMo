/**
 * @claymo/http - 统一 HTTP 客户端核心
 *
 * 提供基础的 HTTP 客户端封装，支持：
 * - 多服务路由
 * - Token 管理（注入式）
 * - 统一错误处理
 * - 请求/响应拦截器
 *
 * 各项目可基于此核心进行扩展
 */
import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

// ============ 类型定义 ============

export interface ServiceConfig {
  baseURL: string
  timeout?: number
}

export interface HttpClientOptions {
  /** 默认服务配置 */
  defaultService: string
  /** 服务配置映射 */
  services: Record<string, ServiceConfig>
  /** Token 获取函数 */
  getToken?: () => string | null
  /** Token 刷新函数 */
  refreshToken?: () => Promise<string | null>
  /** 租户 ID 获取函数 */
  getTenantId?: () => string | null
  /** 错误消息映射 */
  getErrorMessage?: (code: string) => string | undefined
  /** 是否显示错误提示（由调用方实现） */
  showErrorFn?: (message: string) => void
  /** 登出回调 */
  onLogout?: () => void
  /** 请求日志 */
  enableLog?: boolean
}

export interface RequestOptions extends AxiosRequestConfig {
  /** 目标服务 */
  service?: string
  /** 是否显示错误提示 */
  showError?: boolean
  /** 是否跳过 Token 注入 */
  skipAuth?: boolean
  /** 额外请求头 */
  extraHeaders?: Record<string, string>
}

export interface ExtendedConfig extends InternalAxiosRequestConfig {
  service?: string
  showError?: boolean
  _retry?: boolean
  skipAuth?: boolean
}

export interface NormalizedError {
  status?: number
  code: string | null
  message: string
  details?: string
  raw: unknown
}

// ============ 错误码常量 ============

export const ERROR_CODES = {
  TOKEN_EXPIRED: 'Identity:TokenExpired',
  SESSION_EXPIRED: 'Identity:SessionExpired',
  INVALID_TOKEN: 'Identity:InvalidToken',
  FORBIDDEN: 'Permission:Forbidden',
  ACCESS_DENIED: 'Permission:AccessDenied',
}

// ============ 工具函数 ============

let requestIdCounter = 0

function generateRequestId(): string {
  return `req_${Date.now()}_${++requestIdCounter}`
}

// ============ HTTP 客户端类 ============

export class HttpClient {
  private client: AxiosInstance
  private options: HttpClientOptions
  private isRefreshing = false
  private refreshQueue: Array<{
    resolve: (token: string | null) => void
    reject: (error: unknown) => void
  }> = []

  constructor(options: HttpClientOptions) {
    this.options = options

    // 创建 axios 实例
    const defaultServiceConfig = options.services[options.defaultService]
    this.client = axios.create({
      baseURL: defaultServiceConfig?.baseURL || '',
      timeout: defaultServiceConfig?.timeout || 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config: ExtendedConfig) => {
        // 动态设置 baseURL
        const serviceName = config.service || this.options.defaultService
        const serviceConfig = this.options.services[serviceName]
        if (serviceConfig) {
          config.baseURL = serviceConfig.baseURL
        }

        // 注入 Token
        if (!config.skipAuth && this.options.getToken) {
          const token = this.options.getToken()
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }

        // 注入租户 ID
        if (this.options.getTenantId) {
          const tenantId = (config.headers['X-Tenant-Id'] as string) || this.options.getTenantId()
          if (tenantId) {
            config.headers['X-Tenant-Id'] = tenantId
          }
        }

        // 日志
        if (this.options.enableLog) {
          const requestId = generateRequestId()
          ;(config as unknown as Record<string, unknown>).__requestId = requestId
          console.log(`[HTTP] ${serviceName}: ${config.method?.toUpperCase()} ${config.url}`)
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response.data,
      async (error: AxiosError) => {
        const config = error.config as ExtendedConfig | undefined
        const status = error.response?.status

        // Token 过期处理
        if (status === 401 && config && !config._retry && this.options.refreshToken) {
          return this.handleTokenRefresh(error)
        }

        // 规范化错误
        const normalized = this.normalizeError(error)

        // 显示错误提示
        if (config?.showError !== false && this.options.showErrorFn) {
          this.options.showErrorFn(normalized.message)
        }

        return Promise.reject(normalized)
      }
    )
  }

  private async handleTokenRefresh(error: AxiosError): Promise<unknown> {
    const config = error.config as ExtendedConfig

    if (this.isRefreshing) {
      // 等待刷新完成
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject })
      }).then((token) => {
        if (token && config) {
          config.headers.Authorization = `Bearer ${token}`
          return this.client.request(config)
        }
        return Promise.reject(error)
      })
    }

    this.isRefreshing = true
    config._retry = true

    try {
      const newToken = await this.options.refreshToken!()

      if (newToken) {
        // 通知队列中的请求
        this.refreshQueue.forEach(({ resolve }) => resolve(newToken))
        this.refreshQueue = []

        // 重试原请求
        config.headers.Authorization = `Bearer ${newToken}`
        return this.client.request(config)
      } else {
        throw new Error('Token refresh failed')
      }
    } catch (refreshError) {
      // 刷新失败，登出
      this.refreshQueue.forEach(({ reject }) => reject(refreshError))
      this.refreshQueue = []

      if (this.options.onLogout) {
        this.options.onLogout()
      }

      throw refreshError
    } finally {
      this.isRefreshing = false
    }
  }

  private normalizeError(error: AxiosError): NormalizedError {
    const response = error.response
    const data = response?.data as Record<string, unknown> | undefined

    let code: string | null = null
    let message = '请求失败'
    let details: string | undefined

    if (data) {
      // ABP 标准错误格式
      if (data.error && typeof data.error === 'object') {
        const abpError = data.error as Record<string, unknown>
        code = (abpError.code as string) || null
        message = (abpError.message as string) || message
        details = abpError.details as string
      } else {
        code = (data.code as string) || null
        message = (data.message as string) || message
      }
    } else if (error.message) {
      message = error.message
    }

    // 使用错误码映射
    if (code && this.options.getErrorMessage) {
      const mappedMessage = this.options.getErrorMessage(code)
      if (mappedMessage) {
        message = mappedMessage
      }
    }

    return {
      status: response?.status,
      code,
      message,
      details,
      raw: error,
    }
  }

  // ============ 请求方法 ============

  async get<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this.client.get(url, this.mergeOptions(options))
  }

  async post<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.client.post(url, data, this.mergeOptions(options))
  }

  async put<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.client.put(url, data, this.mergeOptions(options))
  }

  async patch<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.client.patch(url, data, this.mergeOptions(options))
  }

  async delete<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return this.client.delete(url, this.mergeOptions(options))
  }

  private mergeOptions(options?: RequestOptions): AxiosRequestConfig {
    if (!options) return {}

    const { service, showError, skipAuth, extraHeaders, ...axiosConfig } = options

    return {
      ...axiosConfig,
      service,
      showError,
      skipAuth,
      headers: {
        ...axiosConfig.headers,
        ...extraHeaders,
      },
    } as AxiosRequestConfig
  }

  /** 获取底层 axios 实例 */
  getAxiosInstance(): AxiosInstance {
    return this.client
  }
}

// ============ 工厂函数 ============

export function createHttpClient(options: HttpClientOptions): HttpClient {
  return new HttpClient(options)
}

export default HttpClient

