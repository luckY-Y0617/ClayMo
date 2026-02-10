/**
 * 权限 Store
 */
import { defineStore } from 'pinia'
import { kbApi } from '@/api'
import { KbMemberRole } from '@/api/modules/knowledge'

/** 角色能力映射 */
const KB_ROLE_CAPABILITIES: Record<number, string[]> = {
  [KbMemberRole.Owner]: [
    'kb.view',
    'kb.edit',
    'kb.delete',
    'kb.members.manage',
    'doc.create',
    'doc.edit',
    'doc.delete',
    'doc.move',
    'doc.view',
    'comment.view',
    'comment.create',
    'comment.delete',
    'comment.like',
    'version.restore',
  ],
  [KbMemberRole.Admin]: [
    'kb.view',
    'kb.edit',
    'kb.members.manage',
    'doc.create',
    'doc.edit',
    'doc.delete',
    'doc.move',
    'doc.view',
    'comment.view',
    'comment.create',
    'comment.delete',
    'comment.like',
    'version.restore',
  ],
  [KbMemberRole.Editor]: [
    'kb.view',
    'doc.create',
    'doc.edit',
    'doc.move',
    'doc.view',
    'comment.view',
    'comment.create',
    'comment.like',
    'version.restore',
  ],
  [KbMemberRole.Viewer]: ['kb.view', 'doc.view', 'comment.view', 'comment.like'],
}

interface ScopedCapability {
  role: number | null
  isActiveMember: boolean
  caps: Record<string, boolean>
}

export interface PermissionState {
  permissions: string[]
  initialized: boolean
  // 资源级权限（按 resourceType:resourceId 存储）
  scopedCapabilities: Record<string, ScopedCapability>
  scopedLoading: Record<string, boolean>
  scopedInflight: Record<string, Promise<ScopedCapability | null>>
}

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    permissions: [],
    initialized: false,
    scopedCapabilities: {},
    scopedLoading: {},
    scopedInflight: {},
  }),

  getters: {
    /**
     * 检查是否拥有某个全局权限
     */
    hasPermission: (state) => (permission: string) => {
      return state.permissions.includes(permission)
    },

    /**
     * 检查是否拥有任意一个权限
     */
    hasAnyPermission: (state) => (permissions: string[]) => {
      return permissions.some((p) => state.permissions.includes(p))
    },

    /**
     * 检查是否拥有所有权限
     */
    hasAllPermissions: (state) => (permissions: string[]) => {
      return permissions.every((p) => state.permissions.includes(p))
    },

    /**
     * 检查全局权限（别名）
     */
    hasGlobalPermission: (state) => (permission: string) => {
      return state.permissions.includes(permission)
    },
  },

  actions: {
    setPermissions(permissions: string[]) {
      this.permissions = permissions
      this.initialized = true
    },

    /**
     * 设置资源级角色（从上下文中获取）
     */
    setScopedRole(
      resourceType: string,
      resourceId: string,
      role: number,
      isActiveMember = true
    ) {
      const key = `${resourceType}:${resourceId}`
      const caps = KB_ROLE_CAPABILITIES[role] || []
      this.scopedCapabilities[key] = {
        role,
        isActiveMember,
        caps: caps.reduce(
          (acc, cap) => {
            acc[cap] = true
            return acc
          },
          {} as Record<string, boolean>
        ),
      }
    },

    /**
     * 检查资源级能力
     */
    hasScopedCapability(resourceType: string, resourceId: string, capability: string): boolean {
      const key = `${resourceType}:${resourceId}`
      const scoped = this.scopedCapabilities[key]
      if (!scoped) return false
      return scoped.caps[capability] === true
    },

    /**
     * 批量预加载资源级权限
     */
    async batchEnsureScopedCapabilities(resourceType: string, resourceIds: string[]) {
      if (resourceType !== 'kb') return

      try {
        const results = await kbApi.capabilities.getBatchKbCapabilities(resourceIds)
        for (const item of results) {
          if (item.knowledgeBaseId) {
            const key = `${resourceType}:${item.knowledgeBaseId}`
            const role =
              typeof item.role === 'number'
                ? item.role
                : typeof item.role === 'string'
                  ? KbMemberRole[item.role as keyof typeof KbMemberRole]
                  : null
            this.scopedCapabilities[key] = {
              role: role ?? null,
              isActiveMember: item.isActiveMember,
              caps: item.caps || {},
            }
          }
        }
      } catch (error) {
        console.warn('[permission] 批量加载权限失败:', error)
      }
    },

    // ===== 知识库权限快捷方法 =====

    canViewKb(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'kb.view')
    },

    canEditKb(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'kb.edit')
    },

    canManageKbMembers(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'kb.members.manage')
    },

    canCreateDoc(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'doc.create')
    },

    canEditDoc(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'doc.edit')
    },

    canDeleteDoc(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'doc.delete')
    },

    canMoveDoc(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'doc.move')
    },

    canViewComment(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'comment.view')
    },

    canCreateComment(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'comment.create')
    },

    canDeleteComment(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'comment.delete')
    },

    canLikeComment(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'comment.like')
    },

    canRestoreVersion(kbId: string): boolean {
      return this.hasScopedCapability('kb', kbId, 'version.restore')
    },

    reset() {
      this.permissions = []
      this.initialized = false
      this.scopedCapabilities = {}
      this.scopedLoading = {}
      this.scopedInflight = {}
    },
  },

  persist: {
    key: 'permission',
    storage: localStorage,
    paths: ['permissions', 'initialized'],
  },
})

