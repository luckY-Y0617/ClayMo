import { defineStore } from 'pinia'

/**
 * 文档树 Store - 按知识库 ID 作用域化
 * 
 * 职责：
 * - 缓存每个知识库的文档树结构
 * - 维护展开/选中状态（按 kbId 隔离）
 * 
 * 设计：
 * - 所有状态按 kbId 分组存储，避免不同知识库的状态混淆
 * - 提供 reset() 和 resetScope(kbId) 方法用于清理
 */
export const useDocumentTreeStore = defineStore('documentTree', {
  state: () => ({
    // 按 kbId 存储文档树
    documentsByKbId: {}, // { [kbId]: [] }
    
    // 按 kbId 存储展开的节点
    expandedKeysByKbId: {}, // { [kbId]: [] }
    
    // 按 kbId 存储选中的节点
    selectedKeyByKbId: {}, // { [kbId]: string }
    
    // 按 kbId 存储加载状态
    loadingByKbId: {}, // { [kbId]: boolean }
  }),

  getters: {
    /**
     * 获取指定知识库的文档树
     */
    getDocuments: (state) => (kbId) => {
      return state.documentsByKbId[kbId] || []
    },

    /**
     * 获取指定知识库的展开节点
     */
    getExpandedKeys: (state) => (kbId) => {
      return state.expandedKeysByKbId[kbId] || []
    },

    /**
     * 获取指定知识库的选中节点
     */
    getSelectedKey: (state) => (kbId) => {
      return state.selectedKeyByKbId[kbId] || null
    },

    /**
     * 获取指定知识库的加载状态
     */
    isLoading: (state) => (kbId) => {
      return state.loadingByKbId[kbId] === true
    },
  },

  actions: {
    /**
     * 设置指定知识库的文档树
     */
    setDocuments(kbId, docs) {
      if (!kbId) return
      this.documentsByKbId[kbId] = docs || []
    },

    /**
     * 添加文档到指定知识库
     */
    addDocument(kbId, doc) {
      if (!kbId || !doc) return
      if (!this.documentsByKbId[kbId]) {
        this.documentsByKbId[kbId] = []
      }
      this.documentsByKbId[kbId].push(doc)
    },

    /**
     * 更新指定知识库中的文档
     */
    updateDocument(kbId, docId, updates) {
      if (!kbId || !docId) return
      
      const docs = this.documentsByKbId[kbId]
      if (!docs) return

      const updateDoc = (docs) => {
        for (let doc of docs) {
          if (doc.id === docId) {
            Object.assign(doc, updates)
            return true
          }
          if (doc.children && doc.children.length > 0) {
            if (updateDoc(doc.children)) return true
          }
        }
        return false
      }
      updateDoc(docs)
    },

    /**
     * 删除指定知识库中的文档
     */
    deleteDocument(kbId, docId) {
      if (!kbId || !docId) return
      
      const docs = this.documentsByKbId[kbId]
      if (!docs) return

      const deleteDoc = (docs) => {
        for (let i = 0; i < docs.length; i++) {
          if (docs[i].id === docId) {
            docs.splice(i, 1)
            return true
          }
          if (docs[i].children && docs[i].children.length > 0) {
            if (deleteDoc(docs[i].children)) return true
          }
        }
        return false
      }
      deleteDoc(docs)
    },

    /**
     * 设置指定知识库的展开节点
     */
    setExpandedKeys(kbId, keys) {
      if (!kbId) return
      this.expandedKeysByKbId[kbId] = keys || []
    },

    /**
     * 切换指定知识库中某个节点的展开状态
     */
    toggleExpand(kbId, key) {
      if (!kbId || !key) return
      
      if (!this.expandedKeysByKbId[kbId]) {
        this.expandedKeysByKbId[kbId] = []
      }
      
      const keys = this.expandedKeysByKbId[kbId]
      const index = keys.indexOf(key)
      if (index > -1) {
        keys.splice(index, 1)
      } else {
        keys.push(key)
      }
    },

    /**
     * 设置指定知识库的选中节点
     */
    setSelectedKey(kbId, key) {
      if (!kbId) return
      this.selectedKeyByKbId[kbId] = key
    },

    /**
     * 设置指定知识库的加载状态
     */
    setLoading(kbId, loading) {
      if (!kbId) return
      this.loadingByKbId[kbId] = loading
    },

    /**
     * 重置指定知识库的所有状态
     */
    resetScope(kbId) {
      if (!kbId) return
      delete this.documentsByKbId[kbId]
      delete this.expandedKeysByKbId[kbId]
      delete this.selectedKeyByKbId[kbId]
      delete this.loadingByKbId[kbId]
    },

    /**
     * 重置所有知识库的状态（登出/切租户/切团队时调用）
     */
    reset() {
      this.documentsByKbId = {}
      this.expandedKeysByKbId = {}
      this.selectedKeyByKbId = {}
      this.loadingByKbId = {}
    },
  },
})

