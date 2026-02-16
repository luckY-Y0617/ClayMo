import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

// upload-service 专用实例（端口 8889）
export const uploadHttp = axios.create({
  baseURL: 'http://localhost:8889/fs',
  timeout: 30000, // 上传可能需要较长时间
})

uploadHttp.interceptors.request.use(
  (config) => {
    const auth = useAuthStore()
    const tenant = useTenantStore()

    config.headers = config.headers || {}

    // Authorization Token（直接使用 access token）
    if (auth.token) {
      config.headers.Authorization = `Bearer ${auth.token}`
    }

    // 多租户 header（按你现有约定）
    const tenantId = config.headers['__tenant'] || tenant.tenantId
    if (tenantId) {
      config.headers['__tenant'] = tenantId
    }

    return config
  },
  (error) => Promise.reject(error)
)

uploadHttp.interceptors.response.use(
  (resp) => resp.data,
  (error) => Promise.reject(error)
)
