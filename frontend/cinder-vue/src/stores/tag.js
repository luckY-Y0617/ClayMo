import { defineStore } from 'pinia'

/**
 * TagStore - 标签领域缓存
 * 
 * 职责：
 * - 缓存当前知识库的标签列表
 * - 提供标签查找和基本 CRUD 操作
 * 
 * 不包含：
 * - 筛选状态（应由页面组件管理）
 * - 使用统计（应由后端统计或 localStorage 管理）
 */
export const useTagStore = defineStore('tag', {
  state: () => ({
    tags: [], // 所有标签列表
    loading: false,
  }),

  getters: {
    /**
     * 根据 ID 查找标签
     */
    findTagById: (state) => (id) => {
      return state.tags.find(tag => tag.id === id)
    },

    /**
     * 根据名称查找标签（支持 name 或 slug）
     */
    findTagByName: (state) => (name) => {
      return state.tags.find(tag => tag.name === name || tag.slug === name)
    },

    /**
     * 获取按使用次数排序的标签（可选）
     * 注意：usageCount 应由后端维护
     */
    sortedTags: (state) => {
      return [...state.tags].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    },
  },

  actions: {
    /**
     * 设置标签列表
     */
    setTags(tags) {
      this.tags = tags || []
    },

    /**
     * 添加标签
     */
    addTag(tag) {
      if (!tag || !tag.id) return
      
      const existing = this.tags.find(t => t.id === tag.id || t.name === tag.name)
      if (!existing) {
        this.tags.push(tag)
      }
    },

    /**
     * 更新标签
     */
    updateTag(tagId, updates) {
      const index = this.tags.findIndex(t => t.id === tagId)
      if (index !== -1) {
        this.tags[index] = { ...this.tags[index], ...updates }
      }
    },

    /**
     * 删除标签
     */
    removeTag(tagId) {
      this.tags = this.tags.filter(t => t.id !== tagId)
    },
  },
})

