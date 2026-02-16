import { defineStore } from 'pinia'
import { kbApi } from '@/api/kb.api'
import { normalizeKbContext } from '@/utils/kbContextMapper'

/**
 * 知识库上下文 Store
 * 
 * 职责：
 * - 缓存每个知识库的上下文数据（权限、成员信息等）
 * - 并发请求去重
 * - 提供刷新与失效能力
 * 
 * 不包含：
 * - currentKbId（不依赖它做业务判断，由页面组件管理）
 * - 数据转换逻辑（已下沉到 mapper 层）
 */
export const useKbContextStore = defineStore('kbContext', {
  state: () => ({
    contextByKbId: {}, // 按 kbId 缓存的上下文数据
    loadingByKbId: {}, // 加载状态
    errorByKbId: {}, // 错误信息
    inflightByKbId: {}, // 进行中的请求（用于去重）
  }),

  getters: {
    /**
     * 获取指定知识库的上下文
     */
    getContext: (state) => (kbId) => {
      return state.contextByKbId[kbId] || null
    },

    /**
     * 检查指定知识库是否正在加载
     */
    isLoading: (state) => (kbId) => {
      return state.loadingByKbId[kbId] === true
    },

    /**
     * 获取指定知识库的错误信息
     */
    getError: (state) => (kbId) => {
      return state.errorByKbId[kbId] || null
    },
  },

  actions: {
    /**
     * 使指定知识库的上下文失效（用于刷新）
     */
    invalidateContext(kbId) {
      if (!kbId) return
      delete this.contextByKbId[kbId]
      delete this.errorByKbId[kbId]
    },

    /**
     * 重置所有上下文（登出/切租户/切团队时调用）
     */
    reset() {
      this.contextByKbId = {}
      this.loadingByKbId = {}
      this.errorByKbId = {}
      this.inflightByKbId = {}
    },

    /**
     * 加载知识库上下文
     * @param {string} kbId - 知识库 ID
     * @param {Object} options - 选项
     * @param {boolean} options.force - 是否强制刷新
     */
    async loadContext(kbId, { force = false } = {}) {
      if (!kbId) throw new Error('kbId is required')

      // 如果已有缓存且不强制刷新，直接返回
      if (!force && this.contextByKbId[kbId]) {
        return this.contextByKbId[kbId]
      }

      // 如果已有进行中的请求，返回该 Promise（并发去重）
      if (this.inflightByKbId[kbId]) {
        return this.inflightByKbId[kbId]
      }

      const promise = (async () => {
        try {
          this.loadingByKbId[kbId] = true
          this.errorByKbId[kbId] = null

          // 调用 API 获取原始数据
          const rawContext = await kbApi.kb.getContext(kbId)
          
          // 使用 mapper 规范化数据
          const normalized = normalizeKbContext(rawContext)
          
          // 缓存规范化后的数据
          this.contextByKbId[kbId] = normalized
          
          return normalized
        } catch (error) {
          this.errorByKbId[kbId] = error
          throw error
        } finally {
          delete this.inflightByKbId[kbId]
          this.loadingByKbId[kbId] = false
        }
      })()

      this.inflightByKbId[kbId] = promise
      return promise
    },
  },
})


