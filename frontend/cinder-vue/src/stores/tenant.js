import { defineStore } from 'pinia'
import { resetKnowledgeContext } from '@/utils/sessionOrchestrator'

/**
 * 租户 Store
 * 
 * 注意：tenantId 只在登录成功后从服务器返回时写入 localStorage
 * 登录前用户选择的租户不写入 localStorage，仅作为登录请求的 header
 */
export const useTenantStore = defineStore('tenant', {
  state: () => ({
    // 从 localStorage 恢复（登录成功后服务器返回的 tenantId）
    tenantId: localStorage.getItem('tenantId') || '',
  }),
  actions: {
    /**
     * 设置租户ID
     * @param {string} id - 租户ID
     * @param {boolean} persist - 是否持久化到 localStorage（默认 true）
     *                             登录前选择租户时设为 false，登录成功后设为 true
     */
    async setTenant(id, persist = true) {
      const oldValue = this.tenantId
      
      this.tenantId = id
      if (persist) {
        if (id) {
          localStorage.setItem('tenantId', id)
        } else {
          localStorage.removeItem('tenantId')
        }
      }
      
      // 切换租户时，通过 orchestrator 重置知识库相关缓存
      if (oldValue !== id && persist) {
        await resetKnowledgeContext()
      }
    },
  },
})
