import http from '@/utils/http'
import { normalizeModule, normalizeModuleList } from '@/utils/permissionNormalizer'

export const sysApi = {
  /**
   * 认证模块
   */
  auth: {
    login(data) {
      const { tenantId, ...loginData } = data
      // 如果提供了 tenantId，通过 header 传递（不写入 localStorage）
      const config = tenantId ? {
        headers: {
          '__tenant': tenantId
        }
      } : {}
      return http.post('/api/app/identity-auth/app-password-login', loginData, config)
    },
    refresh(data) {
      return http.post('/api/app/identity-auth/app-refresh', data)
    },
    register(data) {
      return http.post('/api/app/identity-auth/register', data)
    },
    sendVerificationCode(data) {
      return http.post('/api/app/identity-auth/send-verification-code', data)
    },
    logout(userId) {
      return http.post(`/api/app/identity-auth/logout/${userId}`)
    },
  },

  captcha: {
    getImageCaptcha() {
      return http.get('/api/app/captcha/image-captcha')
    }
  },

  sms: {
    sendVerificationCode(data) {
      return http.post('/api/app/security/sms/send-code', data)
    }
  },


  team: {
    getUserTeams() {
        return http.get('/api/app/teams/user')
      },
    getTeamMembers(teamId) {
      return http.get(`/api/app/teams/${teamId}/members`)
    },
  },


  user: {
    getUserList(params = {}) {
        return http.get('/api/app/users', { params })
      },
    getUserDetail(userId) {
      return http.get(`/api/app/users/${userId}`)
    },
    createUser(data) {
      return http.post('/api/app/users', data)
    },
    updateUser(userId, data) {
      return http.put(`/api/app/users/${userId}`, data)
    },
    deleteUser(userId) {
      return http.delete(`/api/app/users/${userId}`)
    },
    resetPassword(userId) {
      return http.post(`/api/app/users/${userId}/reset-password`)
    },
    activateUser(userId) {
      return http.post(`/api/app/users/${userId}/activate`)
    },
    deactivateUser(userId) {
      return http.post(`/api/app/users/${userId}/deactivate`)
    },
  },


  role: {
    getRoleList(params = {}) {
        return http.get('/api/app/roles', { params })
      },
      getRoleDetail(roleId) {
        return http.get(`/api/app/roles/${roleId}`)
      },
      getRolePermissions(roleId) {
        return http.get(`/api/app/roles/${roleId}/permissions`)
      },
      saveRolePermissions(roleId, permissionCodes) {
        return http.put(`/api/app/roles/${roleId}/permissions`, {
          permissionCodes,
        })
      },
      createRole(data) {
        return http.post('/api/app/roles', data)
      },
      updateRole(roleId, data) {
        return http.put(`/api/app/roles/${roleId}`, data)
      },
      deleteRole(roleId) {
        return http.delete(`/api/app/roles/${roleId}`)
      },
  },

  /**
   * 权限目录模块
   */
  permissionCatalog: {
    /**
     * 获取权限模块列表
     * 
     * @returns {Promise<import('@/types/permission').ModuleInfo[]>} 模块列表，按 order 排序
     */
    async getPermissionModules() {
      const response = await http.get('/api/app/permission-catalog/modules')
      return normalizeModuleList(response)
    },

    /**
     * 获取指定模块的权限结构
     * 
     * @param {string} moduleCode - 模块代码（如 'system', 'knowledge'）
     * @returns {Promise<import('@/types/permission').ModuleDto>} 模块结构（包含 groups 和 permissions）
     * @throws {Error} 当 moduleCode 为空时抛出错误
     */
    async getPermissionTree(moduleCode) {
      if (!moduleCode) {
        throw new Error('moduleCode is required')
      }
      
      const response = await http.get(`/api/app/permission-catalog/modules/${moduleCode}`)
      return normalizeModule(response)
    },
  },
}