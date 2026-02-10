import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import router from '@/router'
import { useUserStore } from '@/stores/user'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { extractErrorInfo, needsRelogin, isAuthError } from './error-codes'

let reloginDialogShowing = false

NProgress.configure({ showSpinner: false })

// Create axios instance
const service: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true, // Important for session cookie
})

// Request interceptor
service.interceptors.request.use(
  (config) => {
    NProgress.start()
    
    // Add X-Tenant-Id header if tenantId exists and not empty
    // Read from localStorage where Pinia persisted state is stored
    try {
      const userStore = localStorage.getItem('user')
      if (userStore) {
        const userData = JSON.parse(userStore)
        // Only add header if tenantId exists and is not empty string (Host uses empty string)
        if (userData.tenantId && userData.tenantId !== '') {
          config.headers['X-Tenant-Id'] = userData.tenantId
        }
      }
    } catch (error) {
      // Ignore parsing errors
    }
    
    return config
  },
  (error) => {
    NProgress.done()
    return Promise.reject(error)
  }
)

// Response interceptor
service.interceptors.response.use(
  (response: AxiosResponse) => {
    NProgress.done()
    return response.data
  },
  async (error) => {
    NProgress.done()

    const { response, config } = error
    
    // 提取错误信息（根据 error.code 映射）
    const errorInfo = extractErrorInfo(error)
    
    // 将错误信息附加到 error 对象上，方便业务代码使用
    error.errorInfo = errorInfo
    
    // 检查是否需要在拦截器中显示错误（默认显示）
    const showError = config?.showError !== false
    
    // 如果配置了自定义错误处理函数，调用它
    if (config?.errorHandler && typeof config.errorHandler === 'function') {
      config.errorHandler(error)
      return Promise.reject(error)
    }

    if (response && showError) {
      const { status } = response

      // 处理特殊 HTTP 状态码
      switch (status) {
        case 401:
          // 未授权 - 可能是 token 过期或未登录
          {
            // 登录接口返回 401（用户名密码错误等）不应在这里触发“重新登录”弹窗
            const requestUrl = (config?.url || '').toLowerCase()
            if (requestUrl.includes('/login')) {
              break
            }

            // 防止多个并发 401 反复弹窗
            if (reloginDialogShowing) {
              break
            }
            reloginDialogShowing = true

            const userStore = useUserStore()
            const message = needsRelogin(errorInfo.code) ? errorInfo.message : '登录已过期，请重新登录'

            ElMessageBox.confirm(message, '提示', {
              confirmButtonText: '重新登录',
              cancelButtonText: '取消',
              type: 'warning',
            })
              .then(() => {
                // 清理认证状态（包括 cookie）
                userStore.clearAuthState()
                router.push('/login')
              })
              .catch(() => {
                // 用户取消，也清理状态
                userStore.clearAuthState()
              })
              .finally(() => {
                reloginDialogShowing = false
              })
          }
          break
          
        case 403:
          // 权限不足
          ElMessage.error(isAuthError(errorInfo.code) ? errorInfo.message : '没有权限访问该资源')
          break
          
        case 404:
          ElMessage.error('请求的资源不存在')
          break
          
        case 500:
        case 502:
        case 503:
        case 504:
          // 服务器错误 - 如果有业务错误码，优先显示映射后的消息
          if (errorInfo.code) {
            ElMessage.error(errorInfo.message)
          } else {
            ElMessage.error('服务器错误，请稍后重试')
          }
          break
          
        default:
          // 其他错误 - 使用映射后的消息
          ElMessage.error(errorInfo.message)
      }
    } else if (!response && showError) {
      // 网络错误或请求超时
      ElMessage.error(errorInfo.message)
    }

    return Promise.reject(error)
  }
)

// 扩展 Axios 配置，支持自定义错误处理选项
export interface RequestConfig extends AxiosRequestConfig {
  // 是否在拦截器中显示错误提示（默认 true）
  showError?: boolean
  // 自定义错误处理函数
  errorHandler?: (error: any) => void
}

// Request methods
export function get<T = unknown>(url: string, params?: Record<string, unknown>, config?: RequestConfig): Promise<T> {
  return service.get(url, { params, ...config })
}

export function post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return service.post(url, data, config)
}

export function put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return service.put(url, data, config)
}

export function del<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
  return service.delete(url, config)
}

export default service

