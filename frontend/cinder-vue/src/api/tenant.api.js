import http from '@/utils/http'

export const tenantApi = {
  listTenants(data) {
    return http.get('/api/app/tenant', data)
  }
}