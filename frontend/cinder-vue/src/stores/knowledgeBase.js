import { defineStore } from 'pinia'

/**
 * KnowledgeBaseStore - 知识库缓存
 * 
 * 职责：
 * - 缓存知识库列表
 * - 维护当前知识库 ID
 * - 提供知识库查找和基本 CRUD 操作
 */
export const useKnowledgeBaseStore = defineStore('knowledgeBase', {
  state: () => ({
    bases: [], // 知识库列表
    currentBaseId: null, // 当前知识库 ID
    loading: false,
  }),

  getters: {
    /**
     * 推导当前知识库对象
     */
    currentBase: (state) => {
      if (!state.currentBaseId) return null
      return state.bases.find(b => b.id === state.currentBaseId) || null
    },

    /**
     * 根据 ID 查找知识库
     */
    findBaseById: (state) => (id) => {
      return state.bases.find(b => b.id === id) || null
    },
  },

  actions: {
    /**
     * 设置当前知识库 ID
     */
    setCurrentBaseId(id) {
      this.currentBaseId = id
    },

    /**
     * 设置知识库列表
     */
    setBases(bases) {
      this.bases = bases || []
    },

    /**
     * 添加知识库
     */
    addBase(base) {
      if (!base || !base.id) return
      
      const existing = this.bases.find(b => b.id === base.id)
      if (!existing) {
        this.bases.push(base)
      }
    },

    /**
     * 更新知识库（只更新 bases 数组）
     */
    updateBase(id, updates) {
      const index = this.bases.findIndex(b => b.id === id)
      if (index !== -1) {
        this.bases[index] = { ...this.bases[index], ...updates }
      }
    },

    /**
     * 删除知识库
     */
    deleteBase(id) {
      this.bases = this.bases.filter(b => b.id !== id)
      
      // 如果删除的是当前知识库，清空 currentBaseId
      if (this.currentBaseId === id) {
        this.currentBaseId = null
      }
    },
  },
})

