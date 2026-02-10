import { defineStore } from 'pinia'
import type { DocumentNode } from '@/api/modules/knowledge'

interface DocumentTreeState {
  // 按 kbId 存储文档树
  documentsByKbId: Record<string, DocumentNode[]>

  // 按 kbId 存储展开的节点
  expandedKeysByKbId: Record<string, string[]>

  // 按 kbId 存储选中的节点
  selectedKeyByKbId: Record<string, string | null>

  // 按 kbId 存储加载状态
  loadingByKbId: Record<string, boolean>
}

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
  state: (): DocumentTreeState => ({
    documentsByKbId: {},
    expandedKeysByKbId: {},
    selectedKeyByKbId: {},
    loadingByKbId: {},
  }),

  getters: {
    /**
     * 获取指定知识库的文档树
     */
    getDocuments() {
      return (kbId: string): DocumentNode[] => this.documentsByKbId[kbId] || []
    },

    /**
     * 获取指定知识库的展开节点
     */
    getExpandedKeys() {
      return (kbId: string): string[] => this.expandedKeysByKbId[kbId] || []
    },

    /**
     * 获取指定知识库的选中节点
     */
    getSelectedKey() {
      return (kbId: string): string | null => this.selectedKeyByKbId[kbId] || null
    },

    /**
     * 获取指定知识库的加载状态
     */
    isLoading() {
      return (kbId: string): boolean => this.loadingByKbId[kbId] === true
    },
  },

  actions: {
    /**
     * 设置指定知识库的文档树
     */
    setDocuments(kbId: string, docs: DocumentNode[]) {
      if (!kbId) return
      this.documentsByKbId[kbId] = docs || []
    },

    /**
     * 添加文档到指定知识库
     */
    addDocument(kbId: string, doc: DocumentNode) {
      if (!kbId || !doc) return
      if (!this.documentsByKbId[kbId]) {
        this.documentsByKbId[kbId] = []
      }
      this.documentsByKbId[kbId].push(doc)
    },

    /**
     * 更新指定知识库中的文档
     */
    updateDocument(kbId: string, docId: string, updates: Partial<DocumentNode>) {
      if (!kbId || !docId) return

      const docs = this.documentsByKbId[kbId]
      if (!docs) return

      const updateDoc = (nodes: DocumentNode[]): boolean => {
        for (const doc of nodes) {
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
    deleteDocument(kbId: string, docId: string) {
      if (!kbId || !docId) return

      const docs = this.documentsByKbId[kbId]
      if (!docs) return

      const deleteDoc = (nodes: DocumentNode[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === docId) {
            nodes.splice(i, 1)
            return true
          }
          if (nodes[i].children && nodes[i].children!.length > 0) {
            if (deleteDoc(nodes[i].children!)) return true
          }
        }
        return false
      }
      deleteDoc(docs)
    },

    /**
     * 查找文档
     */
    findDocument(kbId: string, docId: string): DocumentNode | null {
      if (!kbId || !docId) return null

      const docs = this.documentsByKbId[kbId]
      if (!docs) return null

      const findDoc = (nodes: DocumentNode[]): DocumentNode | null => {
        for (const doc of nodes) {
          if (doc.id === docId) return doc
          if (doc.children && doc.children.length > 0) {
            const found = findDoc(doc.children)
            if (found) return found
          }
        }
        return null
      }
      return findDoc(docs)
    },

    /**
     * 设置指定知识库的展开节点
     */
    setExpandedKeys(kbId: string, keys: string[]) {
      if (!kbId) return
      this.expandedKeysByKbId[kbId] = keys || []
    },

    /**
     * 切换指定知识库中某个节点的展开状态
     */
    toggleExpand(kbId: string, key: string) {
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
     * 展开到指定节点（展开所有父节点）
     */
    expandToNode(kbId: string, docId: string) {
      if (!kbId || !docId) return

      const docs = this.documentsByKbId[kbId]
      if (!docs) return

      const path: string[] = []
      const findPath = (nodes: DocumentNode[], target: string): boolean => {
        for (const doc of nodes) {
          if (doc.id === target) {
            return true
          }
          if (doc.children && doc.children.length > 0) {
            path.push(doc.id)
            if (findPath(doc.children, target)) {
              return true
            }
            path.pop()
          }
        }
        return false
      }

      findPath(docs, docId)

      // 将路径上的所有节点添加到展开列表
      if (!this.expandedKeysByKbId[kbId]) {
        this.expandedKeysByKbId[kbId] = []
      }
      const keys = this.expandedKeysByKbId[kbId]
      for (const key of path) {
        if (!keys.includes(key)) {
          keys.push(key)
        }
      }
    },

    /**
     * 设置指定知识库的选中节点
     */
    setSelectedKey(kbId: string, key: string | null) {
      if (!kbId) return
      this.selectedKeyByKbId[kbId] = key
    },

    /**
     * 设置指定知识库的加载状态
     */
    setLoading(kbId: string, loading: boolean) {
      if (!kbId) return
      this.loadingByKbId[kbId] = loading
    },

    /**
     * 重置指定知识库的所有状态
     */
    resetScope(kbId: string) {
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

