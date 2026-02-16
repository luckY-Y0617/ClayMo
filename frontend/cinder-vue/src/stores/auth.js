import { defineStore } from 'pinia'
import { sysApi } from '@/api/sys.api'
import { usePermissionStore } from './permission'
import { useTenantStore } from './tenant'
import {
  clearAuthLocalStorage,
  saveAuthToLocalStorage,
  loadAuthFromLocalStorage,
} from '@/utils/authStorage'
import { resetAllBusinessContext } from '@/utils/sessionOrchestrator'

/**
 * 认证 Store
 * 
 * 职责：
 * - 持有认证凭证（token、refreshToken、user 等）
 * - 提供 login / refresh / logout 方法
 * - 发出会话变化事件（通过 orchestrator 协调清理）
 * 
 * 不负责：
 * - 其他业务 Store 的清理（由 sessionOrchestrator 统一协调）
 */
export const useAuthStore = defineStore('auth', {
  state: () => {
    const saved = loadAuthFromLocalStorage()
    return {
      token: saved.token || '',
      refreshToken: saved.refreshToken || '',
      expireAt: saved.expireAt || null,
      user: saved.user || null,
      loginAt: saved.loginAt || null,
      permissions: saved.permissions || [],
    }
  },

  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user,
  },

  actions: {
    /**
     * 登录
     * resolve 时：token 已经在 localStorage
     */
    async login(payload) {
      const res = await sysApi.auth.login(payload)
      const loginAt = Date.now()

      // 1️⃣ 统一整理 auth 快照
      const authSnapshot = {
        token: res.accessToken,
        refreshToken: res.refreshToken,
        expireAt: res.expireAt,
        user: res.user,
        loginAt,
        permissions: Array.isArray(res.permissionCodes)
          ? res.permissionCodes
          : [],
      }

      // 2️⃣ 先写入 localStorage（关键）
      saveAuthToLocalStorage(authSnapshot)

      // 3️⃣ 再同步 Pinia state
      this.token = authSnapshot.token
      this.refreshToken = authSnapshot.refreshToken
      this.expireAt = authSnapshot.expireAt
      this.user = authSnapshot.user
      this.loginAt = authSnapshot.loginAt
      this.permissions = authSnapshot.permissions

      // 4️⃣ 初始化权限上下文
      if (this.permissions.length > 0) {
        const permissionStore = usePermissionStore()
        permissionStore.setPermissions(this.permissions)
      }

      // 5️⃣ 初始化租户上下文（以服务端返回为准）
      const tenantId = res.user?.tenantId || res.tenantId
      if (tenantId) {
        const tenantStore = useTenantStore()
        tenantStore.setTenant(tenantId) // 默认 persist=true
      }
    },

    /**
     * 刷新 Token
     * resolve true 时：新 token 已落盘
     */
    async tryRefreshToken() {
      if (!this.refreshToken) return false

      try {
        const res = await sysApi.auth.refresh({
          refreshToken: this.refreshToken,
        })

        const authSnapshot = {
          token: res.accessToken,
          refreshToken: res.refreshToken,
          expireAt: res.expireAt || this.expireAt,
          user: res.user || this.user,
          loginAt: this.loginAt, // 保持原登录时间
          permissions: Array.isArray(res.permissionCodes)
            ? res.permissionCodes
            : this.permissions,
        }

        // 1️⃣ 先落盘
        saveAuthToLocalStorage(authSnapshot)

        // 2️⃣ 再同步 state
        this.token = authSnapshot.token
        this.refreshToken = authSnapshot.refreshToken
        this.expireAt = authSnapshot.expireAt
        this.user = authSnapshot.user
        this.permissions = authSnapshot.permissions

        // 3️⃣ 更新权限
        if (res.permissionCodes) {
          const permissionStore = usePermissionStore()
          permissionStore.setPermissions(authSnapshot.permissions)
        }

        // 4️⃣ 保持 tenant 一致
        const tenantId = res.user?.tenantId || res.tenantId
        if (tenantId) {
          const tenantStore = useTenantStore()
          tenantStore.setTenant(tenantId)
        }

        return true
      } catch {
        this.reset()
        return false
      }
    },

    /**
     * 重置认证状态（仅清理自身）
     */
    reset() {
      this.token = ''
      this.refreshToken = ''
      this.expireAt = null
      this.user = null
      this.loginAt = null
      this.permissions = []
    },

    /**
     * 统一登出
     * 
     * 职责：
     * - 清空 localStorage
     * - 重置自身状态
     * - 触发会话清理（通过 orchestrator）
     * - 多标签页同步
     */
    async logout(reason = 'manual') {
      // 1️⃣ 清空 localStorage
      clearAuthLocalStorage()

      // 2️⃣ 重置自身状态
      this.reset()

      // 3️⃣ 通过 orchestrator 重置所有业务上下文
      await resetAllBusinessContext()

      // 4️⃣ 多标签页同步
      localStorage.setItem('auth.logout_at', Date.now().toString())
      setTimeout(() => {
        localStorage.removeItem('auth.logout_at')
      }, 1000)

      return reason
    },
  },
})
