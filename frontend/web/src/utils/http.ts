import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { type NormalizedError } from '@claymo/ts-common'
import { ERROR_CODES, type RequestConfig } from '@/types/api'
import type { ApiError } from '@/types'
import { getErrorMessage } from '@claymo/error-codes'
import { normalizeAbpErrorBody } from '@claymo/ts-common/errors'

// 重新导出网关前缀常量，方便 API 模块使用
export { API, FS, FS_TIMEOUT } from '@/types/api'

// Token 和租户信息的直接获取（避免循环依赖）
// 从 localStorage 直接读取持久化的 store 状态

const AUTH_STORAGE_KEY = 'auth'
const TENANT_STORAGE_KEY = 'tenant'

interface StoredAuthState {
  token?: string
  refreshToken?: string
  userId?: string
}

interface StoredTenantState {
  tenantId?: string
}

/**
 * 同步获取 token（直接从 localStorage 读取）
 */
function getTokenSync(): string | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as StoredAuthState
      return parsed?.token || null
    }
  } catch {
    // ignore parse errors
  }
  return null
}

/**
 * 同步获取租户 ID（直接从 localStorage 读取）
 */
function getTenantIdSync(): string | null {
  try {
    const stored = localStorage.getItem(TENANT_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as StoredTenantState
      return parsed?.tenantId || null
    }
  } catch {
    // ignore parse errors
  }
  return null
}

// 延迟导入 stores 的函数（用于响应拦截器的异步操作）
let _authStore: ReturnType<typeof import('@/stores/auth').useAuthStore> | null = null

async function getAuthStore() {
  if (!_authStore) {
    const { useAuthStore } = await import('@/stores/auth')
    _authStore = useAuthStore()
  }
  return _authStore
}

/**
 * 注册已初始化的 auth store（在 main.ts 中调用）
 */
export function registerAuthStore(
  store: ReturnType<typeof import('@/stores/auth').useAuthStore>
) {
  _authStore = store
}

/** 扩展 AxiosRequestConfig，添加自定义属性 */
interface ExtendedConfig extends InternalAxiosRequestConfig {
  showError?: boolean
  _retry?: boolean
  /** 标记为 token 刷新期间的请求，静默处理错误 */
  _isRefreshRetry?: boolean
}

/** 小工具：生成 request id */
function genRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** 统一解析错误结构 */
function normalizeError(error: AxiosError): NormalizedError {
  const res = error?.response
  const data = res?.data as Record<string, unknown> | undefined

  // 优先处理 ABP 框架标准错误格式
  if (data?.error) {
    const apiError = data.error as ApiError

    const normalized = normalizeAbpErrorBody(
      apiError,
      {
        getErrorMessage,
      },
      {
        defaultMessage: '请求失败',
      }
    )

    return {
      status: res?.status,
      code: normalized.code || null,
      message: normalized.message,
      details: normalized.details,
      raw: error,
    }
  }

  // 兼容其他后端格式
  const code = (data?.code || data?.errorCode || data?.errCode) as string | null
  const rawMsg = (data?.message || data?.errorMessage || data?.msg || error?.message) as string
  return {
    status: res?.status,
    code,
    message: getErrorMessage(code, rawMsg),
    raw: error,
  }
}

function isRefreshRequest(config?: ExtendedConfig): boolean {
  const url = config?.url || ''
  return url.includes('/refresh-token') || url.includes('/auth/refresh')
}

/** 是否应直接登出 */
function shouldLogoutDirectly(error: AxiosError): boolean {
  const { status, code } = normalizeError(error)
  if (!status) return false

  if (status === 401) {
    return (
      code === ERROR_CODES.SESSION_REVOKED ||
      code === ERROR_CODES.ACCOUNT_DISABLED ||
      code === ERROR_CODES.REFRESH_TOKEN_EXPIRED
    )
  }

  return code === ERROR_CODES.SESSION_REVOKED || code === ERROR_CODES.ACCOUNT_DISABLED
}

/** 队列项类型 */
interface QueueItem {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
  config: ExtendedConfig
}

/**
 * 创建 HTTP 客户端
 */
function createHttpClient(options: { unwrapData?: boolean; timeout?: number } = {}) {
  const { unwrapData = true, timeout = 15000 } = options

  const client: AxiosInstance = axios.create({
    timeout,
    withCredentials: true,
  })

  // ===== Request interceptor =====
  client.interceptors.request.use(
    (config: ExtendedConfig) => {
      // 生成 requestId
      config.headers = config.headers || {}
      if (!config.headers['X-Request-Id']) {
        config.headers['X-Request-Id'] = genRequestId()
      }

      if (import.meta.env.DEV) {
        console.log(
          `[HTTP] ${String(config.method).toUpperCase()} ${config.url}`
        )
      }

      // access token - 直接从 localStorage 读取，避免 store 初始化问题
      const token = getTokenSync()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // tenant - 直接从 localStorage 读取
      const tenantId = (config.headers['X-Tenant-Id'] as string) || getTenantIdSync()
      if (tenantId) {
        config.headers['X-Tenant-Id'] = tenantId
      }

      return config
    },
    (error) => Promise.reject(error)
  )

  // ===== Response interceptor =====
  let isRefreshing = false
  let queue: QueueItem[] = []

  function flushQueueWithError(err: unknown): void {
    queue.forEach(({ reject }) => reject(err))
    queue = []
  }

  async function flushQueueWithToken(): Promise<void> {
    const auth = await getAuthStore()
    const token = auth.token
    const copied = queue
    queue = []

    for (const item of copied) {
      const { resolve, reject, config } = item
      try {
        config.headers = config.headers || {}
        config.headers.Authorization = token ? `Bearer ${token}` : undefined
        // 标记为刷新重试请求，失败时静默处理
        config._isRefreshRetry = true
        const res = await client(config)
        resolve(res)
      } catch (e) {
        reject(e)
      }
    }
  }

  client.interceptors.response.use(
    (response) => (unwrapData ? response.data : response),
    async (error: AxiosError) => {
      const auth = await getAuthStore()
      const originalConfig = (error?.config as ExtendedConfig) || {}

      // refresh 接口自己失败
      if (isRefreshRequest(originalConfig)) {
        return Promise.reject(error)
      }

      // 直接登出场景
      if (shouldLogoutDirectly(error)) {
        const { code } = normalizeError(error)
        let reason = 'server_revoke'
        if (code === ERROR_CODES.ACCOUNT_DISABLED) reason = 'account_disabled'
        if (code === ERROR_CODES.SESSION_REVOKED) reason = 'server_revoke'
        await auth.logout(reason)
        return Promise.reject(error)
      }

      // 处理 401
      const { status } = normalizeError(error)
      if (status === 401) {
        // 已重试过一次还是 401，静默登出
        if (originalConfig._retry) {
          await auth.logout('expired')
          return Promise.reject(error)
        }
        originalConfig._retry = true

        // 正在刷新中，加入队列等待
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            queue.push({ resolve, reject, config: originalConfig })
          })
        }

        isRefreshing = true
        try {
          const ok = await auth.tryRefreshToken()
          if (!ok) {
            flushQueueWithError(error)
            await auth.logout('expired')
            return Promise.reject(error)
          }

          await flushQueueWithToken()

          // 重试原始请求，标记为刷新重试
          originalConfig.headers = originalConfig.headers || {}
          originalConfig.headers.Authorization = `Bearer ${auth.token}`
          originalConfig._isRefreshRetry = true
          return client(originalConfig)
        } catch (e) {
          flushQueueWithError(e)
          await auth.logout('expired')
          return Promise.reject(e)
        } finally {
          isRefreshing = false
        }
      }

      // 其他错误
      const n = normalizeError(error)

      // 刷新重试期间的请求失败，静默处理不显示错误
      // 这实现了真正的"无感刷新"
      const isSilentRetry = originalConfig._isRefreshRetry === true
      
      if (!isSilentRetry) {
        console.error('请求错误:', {
          status: n.status,
          code: n.code,
          message: n.message,
          url: originalConfig?.url,
        })
      }

      const showError = originalConfig?.showError !== false && !isSilentRetry

      if (showError) {
        switch (n.status) {
          case 403:
            ElMessage.error(n.message || '没有权限访问该资源')
            break
          case 404:
            ElMessage.error(n.message || '请求的资源不存在')
            break
          case 500:
          case 502:
          case 503:
          case 504:
            ElMessage.error(n.message || '服务器错误，请稍后重试')
            break
          default:
            ElMessage.error(n.message)
        }
      }

      // 附加错误信息
      ;(error as AxiosError & { errorInfo?: NormalizedError }).errorInfo = n

      return Promise.reject(error)
    }
  )

  return client
}

/** 主 HTTP 客户端 */
export const http = createHttpClient({ unwrapData: true })

export default http

/** 请求方法简写 */
export function get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
  return http.get(url, config)
}

export function post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return http.post(url, data, config)
}

export function put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return http.put(url, data, config)
}

export function del<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
  return http.delete(url, config)
}
