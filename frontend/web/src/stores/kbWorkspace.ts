import { defineStore } from 'pinia'
import { kbApi } from '@/api'
import type { KnowledgeBase, KbContext, Tag } from '@/api/modules/knowledge'
import { usePermissionStore } from '@/stores/permission'

/**
 * 角色枚举映射
 */
const ROLE_ENUM = ['Owner', 'Admin', 'Editor', 'Viewer'] as const
const ROLE_LABEL_MAP: Record<string, string> = {
  Owner: '所有者',
  Admin: '管理员',
  Editor: '编辑者',
  Viewer: '查看者',
}

/**
 * 可见性枚举映射
 */
const VISIBILITY_ENUM = ['私密', '团队', '公开'] as const

/** 规范化后的上下文数据 */
export interface NormalizedKbContext {
  knowledgeBase: KnowledgeBase | null
  membership: {
    isMember: boolean
    role: string | null
    roleLabel: string | null
    isActive: boolean
    joinedTime?: string | null
  }
  _raw?: KbContext
}

/**
 * 规范化知识库上下文数据
 */
function normalizeKbContext(raw: KbContext | null): NormalizedKbContext | null {
  if (!raw) return null

  // 转换角色枚举：0=Owner, 1=Admin, 2=Editor, 3=Viewer
  const roleIndex = raw.currentUserRole
  const role =
    typeof roleIndex === 'number' && roleIndex >= 0 && roleIndex < ROLE_ENUM.length
      ? ROLE_ENUM[roleIndex]
      : null

  // 转换可见性枚举：0=私密, 1=团队, 2=公开
  let visibility = raw.knowledgeBase?.visibility
  if (typeof visibility === 'number' && visibility >= 0 && visibility <= 2) {
    visibility = VISIBILITY_ENUM[visibility] as unknown as typeof visibility
  }

  // 规范化知识库信息
  const knowledgeBase = raw.knowledgeBase
    ? {
        ...raw.knowledgeBase,
        visibility,
      }
    : null

  // 规范化成员信息
  const membership = raw.membership || {
    isMember: false,
    role,
    roleLabel: role ? ROLE_LABEL_MAP[role] : null,
    isActive: true,
    joinedTime: null,
  }

  return {
    knowledgeBase,
    membership: {
      isMember: membership.isMember ?? false,
      role,
      roleLabel: role ? ROLE_LABEL_MAP[role] : null,
      isActive: membership.isActive ?? true,
      joinedTime: membership.joinedTime ?? null,
    },
    _raw: raw,
  }
}

interface KbWorkspaceState {
  // 知识库列表
  bases: KnowledgeBase[]
  currentBaseId: string | null
  tags: Tag[]
  tagsLoading: boolean

  // 上下文缓存
  contextByKbId: Record<string, NormalizedKbContext>
  loadingByKbId: Record<string, boolean>
  errorByKbId: Record<string, Error | null>
  inflightByKbId: Record<string, Promise<NormalizedKbContext>>
}

/**
 * 知识库工作区 Store - 统一知识库相关状态管理
 *
 * 职责：
 * - 缓存知识库列表和当前知识库 ID
 * - 管理知识库标签
 * - 缓存每个知识库的上下文数据（成员信息等）
 * - 提供知识库和标签的 CRUD 操作
 * - 提供上下文数据的加载和缓存
 */
export const useKbWorkspaceStore = defineStore('kbWorkspace', {
  state: (): KbWorkspaceState => ({
    bases: [],
    currentBaseId: null,
    tags: [],
    tagsLoading: false,

    contextByKbId: {},
    loadingByKbId: {},
    errorByKbId: {},
    inflightByKbId: {},
  }),

  getters: {
    /**
     * 推导当前知识库对象
     */
    currentBase(): KnowledgeBase | null {
      if (!this.currentBaseId) return null
      return this.bases.find((b) => b.id === this.currentBaseId) || null
    },

    /**
     * 根据 ID 查找知识库
     */
    findBaseById() {
      return (id: string) => this.bases.find((b) => b.id === id) || null
    },

    /**
     * 根据 ID 查找标签
     */
    findTagById() {
      return (id: string) => this.tags.find((tag) => tag.id === id)
    },

    /**
     * 根据名称查找标签（支持 name 或 slug）
     */
    findTagByName() {
      return (name: string) => this.tags.find((tag) => tag.name === name || tag.slug === name)
    },

    /**
     * 获取按使用次数排序的标签
     */
    sortedTags(): Tag[] {
      return [...this.tags].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    },

    /**
     * 获取指定知识库的上下文
     */
    getContext() {
      return (kbId: string) => this.contextByKbId[kbId] || null
    },

    /**
     * 检查指定知识库是否正在加载上下文
     */
    isContextLoading() {
      return (kbId: string) => this.loadingByKbId[kbId] === true
    },

    /**
     * 获取指定知识库的上下文错误信息
     */
    getContextError() {
      return (kbId: string) => this.errorByKbId[kbId] || null
    },
  },

  actions: {
    /**
     * 设置当前知识库 ID
     */
    setCurrentBaseId(id: string | null) {
      this.currentBaseId = id
    },

    /**
     * 设置知识库列表
     */
    setBases(bases: KnowledgeBase[]) {
      this.bases = bases || []
    },

    /**
     * 添加知识库
     */
    addBase(base: KnowledgeBase) {
      if (!base?.id) return
      const existing = this.bases.find((b) => b.id === base.id)
      if (!existing) {
        this.bases.push(base)
      }
    },

    /**
     * 更新知识库
     */
    updateBase(id: string, updates: Partial<KnowledgeBase>) {
      const index = this.bases.findIndex((b) => b.id === id)
      if (index !== -1) {
        this.bases[index] = { ...this.bases[index], ...updates }
      }
    },

    /**
     * 删除知识库
     */
    deleteBase(id: string) {
      this.bases = this.bases.filter((b) => b.id !== id)
      if (this.currentBaseId === id) {
        this.currentBaseId = null
      }
    },

    /**
     * 设置标签列表
     */
    setTags(tags: Tag[]) {
      this.tags = tags || []
    },

    /**
     * 添加标签
     */
    addTag(tag: Tag) {
      if (!tag?.id) return
      const existing = this.tags.find((t) => t.id === tag.id || t.name === tag.name)
      if (!existing) {
        this.tags.push(tag)
      }
    },

    /**
     * 更新标签
     */
    updateTag(tagId: string, updates: Partial<Tag>) {
      const index = this.tags.findIndex((t) => t.id === tagId)
      if (index !== -1) {
        this.tags[index] = { ...this.tags[index], ...updates }
      }
    },

    /**
     * 删除标签
     */
    removeTag(tagId: string) {
      this.tags = this.tags.filter((t) => t.id !== tagId)
    },

    /**
     * 使指定知识库的上下文失效（用于刷新）
     */
    invalidateContext(kbId: string) {
      if (!kbId) return
      delete this.contextByKbId[kbId]
      delete this.errorByKbId[kbId]
    },

    /**
     * 重置所有上下文（登出/切租户/切团队时调用）
     */
    resetContext() {
      this.contextByKbId = {}
      this.loadingByKbId = {}
      this.errorByKbId = {}
      this.inflightByKbId = {}
    },

    /**
     * 加载知识库上下文
     */
    async loadContext(
      kbId: string,
      { force = false } = {}
    ): Promise<NormalizedKbContext | null> {
      if (!kbId) throw new Error('kbId is required')

      // 如果已有缓存且不强制刷新，直接返回
      if (!force && this.contextByKbId[kbId]) {
        return this.contextByKbId[kbId]
      }

      // 如果已有进行中的请求，返回该 Promise（并发去重）
      if (kbId in this.inflightByKbId) {
        return this.inflightByKbId[kbId]
      }

      const promise = (async (): Promise<NormalizedKbContext> => {
        try {
          this.loadingByKbId[kbId] = true
          this.errorByKbId[kbId] = null

          // 调用 API 获取原始数据
          // 注意：由于 http 客户端配置了 unwrapData: true，响应拦截器会返回 response.data
          // 需要通过 unknown 中转来满足 TypeScript 类型检查
          const rawContext = (await kbApi.kb.getContext(kbId)) as unknown as KbContext

          // 使用 mapper 规范化数据
          const normalized = normalizeKbContext(rawContext)

          // 将角色信息设置到 permissionStore
          const permissionStore = usePermissionStore()
          const role = rawContext.currentUserRole
          if (role !== undefined && role !== null) {
            permissionStore.setScopedRole('kb', kbId, role, true)
          }

          // 缓存规范化后的数据
          if (normalized) {
            this.contextByKbId[kbId] = normalized
          }

          return normalized!
        } catch (error) {
          this.errorByKbId[kbId] = error as Error
          throw error
        } finally {
          delete this.inflightByKbId[kbId]
          this.loadingByKbId[kbId] = false
        }
      })()

      this.inflightByKbId[kbId] = promise
      return promise
    },

    /**
     * 批量加载知识库上下文
     */
    async loadBatchContexts(
      kbIds: string[],
      { force = false } = {}
    ): Promise<Record<string, NormalizedKbContext | null>> {
      if (!Array.isArray(kbIds) || kbIds.length === 0) return {}

      // 批量获取权限
      const permissionStore = usePermissionStore()
      try {
        await permissionStore.batchEnsureScopedCapabilities('kb', kbIds)
        if (import.meta.env.DEV) {
          console.log(`[kbWorkspace] 批量预加载 ${kbIds.length} 个知识库的权限`)
        }
      } catch (error) {
        console.warn('[kbWorkspace] 批量权限预加载失败:', error)
      }

      // 批量加载上下文
      const results: Record<string, NormalizedKbContext | null> = {}
      const promises = kbIds.map((kbId) =>
        this.loadContext(kbId, { force })
          .then((context) => {
            results[kbId] = context
          })
          .catch((error) => {
            console.warn(`[kbWorkspace] 加载上下文失败 ${kbId}:`, error)
            results[kbId] = null
          })
      )

      await Promise.allSettled(promises)
      return results
    },

    /**
     * 重置所有状态
     */
    reset() {
      this.bases = []
      this.currentBaseId = null
      this.tags = []
      this.tagsLoading = false
      this.resetContext()
    },
  },
})

