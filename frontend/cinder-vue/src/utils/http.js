import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import router from '@/router'

// 创建唯一的 axios 实例
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15000,
})

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    const auth = useAuthStore()
    const tenant = useTenantStore()

    // Token
    if (auth.token) {
      config.headers.Authorization = `Bearer ${auth.token}`
    }

    // 多租户
    // 优先使用请求配置中的临时 tenantId（用于登录请求）
    // 如果没有，则使用 store 中的 tenantId（登录成功后从服务器返回的）
    const tenantId = config.headers?.['__tenant'] || tenant.tenantId
    if (tenantId) {
      config.headers['__tenant'] = tenantId
    }

    // 上传 Token（临时存储在 config 中，请求完成后清除）
    if (config.uploadToken) {
      config.headers['X-Upload-Token'] = config.uploadToken
      // 清除临时存储，避免污染其他请求
      delete config.uploadToken
    }

    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
let isRefreshing = false
let pendingQueue = []

/**
 * 后端错误码定义（根据实际后端返回的错误码调整）
 */
const ERROR_CODES = {
  ACCESS_TOKEN_EXPIRED: 'ACCESS_TOKEN_EXPIRED',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_REVOKED: 'SESSION_REVOKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
}

/**
 * 检查错误码是否需要直接登出（不尝试刷新）
 */
function shouldLogoutDirectly(error) {
  if (!error.response) return false
  
  const errorCode = error.response.data?.code || error.response.data?.errorCode
  const status = error.response.status
  
  // 401 状态码需要尝试刷新，其他情况根据错误码判断
  if (status === 401) {
    // 检查是否是特定的错误码，这些错误码表示会话已被服务器吊销
    if (errorCode === ERROR_CODES.SESSION_REVOKED || 
        errorCode === ERROR_CODES.ACCOUNT_DISABLED ||
        errorCode === ERROR_CODES.REFRESH_TOKEN_EXPIRED) {
      return true
    }
    // 其他 401 错误尝试刷新
    return false
  }
  
  // 其他状态码的错误码检查
  if (errorCode === ERROR_CODES.SESSION_REVOKED || 
      errorCode === ERROR_CODES.ACCOUNT_DISABLED) {
    return true
  }
  
  return false
}

/**
 * 统一登出处理
 */
async function handleLogout(auth, reason = 'expired') {
  await auth.logout(reason)
  // 如果当前不在登录页，则跳转
  if (router.currentRoute.value.name !== 'Login') {
    router.replace({
      name: 'Login',
      query: { reason },
    })
  }
}

http.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const auth = useAuthStore()
    const originalConfig = error.config

    // 跳过刷新 token 接口本身的错误处理，避免死循环
    if (originalConfig?.url?.includes('/refresh-token')) {
      return Promise.reject(error)
    }

    // 检查是否需要直接登出（不尝试刷新）
    if (shouldLogoutDirectly(error)) {
      const errorCode = error.response?.data?.code || error.response?.data?.errorCode
      let reason = 'server_revoke'
      
      if (errorCode === ERROR_CODES.ACCOUNT_DISABLED) {
        reason = 'account_disabled'
      } else if (errorCode === ERROR_CODES.SESSION_REVOKED) {
        reason = 'server_revoke'
      }
      
      handleLogout(auth, reason)
      return Promise.reject(error)
    }

    // 处理 401 错误（Token 过期/无效）
    if (error.response && error.response.status === 401) {
      // 避免重复刷新
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const ok = await auth.tryRefreshToken()
          if (ok) {
            // 刷新成功，重放排队中的请求
            pendingQueue.forEach((cb) => cb())
            pendingQueue = []
            // 更新原始请求的 Authorization header
            originalConfig.headers.Authorization = `Bearer ${auth.token}`
            return http(originalConfig)
          } else {
            // 刷新失败，清理登录状态
            pendingQueue = []
            handleLogout(auth, 'expired')
            return Promise.reject(error)
          }
        } catch (e) {
          // 刷新过程中出错
          pendingQueue = []
          handleLogout(auth, 'expired')
          return Promise.reject(error)
        } finally {
          isRefreshing = false
        }
      } else {
        // 正在刷新中，将当前请求加入队列
        return new Promise((resolve, reject) => {
          pendingQueue.push(async () => {
            try {
              originalConfig.headers.Authorization = `Bearer ${auth.token}`
              const res = await http(originalConfig)
              resolve(res)
            } catch (err) {
              reject(err)
            }
          })
        })
      }
    }

    // 其他错误统一处理
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.errorMessage || 
                        error.message || 
                        '请求失败'
    console.error('请求错误:', errorMessage)
    return Promise.reject(error)
  }
)

export default http
