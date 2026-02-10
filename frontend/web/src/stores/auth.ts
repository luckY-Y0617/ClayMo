/**
 * 认证 Store
 */
import { defineStore } from 'pinia'
import { authApi, type LoginParams } from '@/api/modules/auth'
import { usePermissionStore } from './permission'
import { useTeamStore } from './team'
import type { UserInfo, AuthState } from '@/types'
import router from '@/router'

const AUTH_STORAGE_KEY = 'auth'

/** 从 localStorage 加载认证状态 */
function loadAuthFromLocalStorage(): Partial<AuthState> {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

/** 保存认证状态到 localStorage */
function saveAuthToLocalStorage(state: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
}

/** 清除认证相关的 localStorage */
function clearAuthLocalStorage(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem('permission')
  localStorage.removeItem('team')
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    const saved = loadAuthFromLocalStorage()
    return {
      token: saved.token || '',
      expireAt: saved.expireAt || null,
      user: saved.user || null,
      loginAt: saved.loginAt || null,
    }
  },

  getters: {
    /** 是否已认证 */
    isAuthenticated: (state) => !!state.token,
    /** 当前用户 */
    currentUser: (state) => state.user,
    /** Token 是否已过期 */
    isTokenExpired: (state) => {
      if (!state.expireAt) return false
      // 提前 5 分钟认为过期，留出刷新缓冲时间
      return Date.now() > state.expireAt - 5 * 60 * 1000
    },
    /** Token 是否有效（已认证且未过期） */
    isTokenValid(): boolean {
      return this.isAuthenticated && !this.isTokenExpired
    },
  },

  actions: {
    /**
     * 登录
     */
    async login(payload: LoginParams): Promise<void> {
      const res = await authApi.login(payload)
      const loginAt = Date.now()

      const authSnapshot: AuthState = {
        token: res.accessToken,
        expireAt: res.accessTokenExpiresAtUtc
          ? new Date(res.accessTokenExpiresAtUtc).getTime()
          : null,
        user: null,
        loginAt,
      }

      saveAuthToLocalStorage(authSnapshot)

      this.token = authSnapshot.token
      this.expireAt = authSnapshot.expireAt
      this.loginAt = authSnapshot.loginAt

      await this.fetchCurrentUser()
    },

    /**
     * 获取当前用户信息
     */
    async fetchCurrentUser(): Promise<UserInfo> {
      const userInfo = await authApi.getCurrentUser()

      this.user = userInfo

      // 直接使用当前 state 保存，避免额外的 localStorage 读取
      saveAuthToLocalStorage({
        token: this.token,
        expireAt: this.expireAt,
        user: userInfo,
        loginAt: this.loginAt,
      })

      // 初始化权限上下文
      const permissionStore = usePermissionStore()
      permissionStore.setPermissions(userInfo.permissions || [])

      // 初始化团队上下文
      const teamStore = useTeamStore()
      teamStore.setTeams(userInfo.teams || [])

      return userInfo
    },

    /**
     * 刷新 Token
     */
    async tryRefreshToken(): Promise<boolean> {
      try {
        const res = await authApi.refresh()

        const authSnapshot: AuthState = {
          token: res.accessToken,
          expireAt: res.accessTokenExpiresAtUtc
            ? new Date(res.accessTokenExpiresAtUtc).getTime()
            : this.expireAt,
          user: this.user,
          loginAt: this.loginAt,
        }

        saveAuthToLocalStorage(authSnapshot)

        this.token = authSnapshot.token
        this.expireAt = authSnapshot.expireAt

        try {
          await this.fetchCurrentUser()
        } catch (error) {
          console.warn('刷新用户信息失败:', error)
        }

        return true
      } catch {
        this.reset()
        return false
      }
    },

    /**
     * 重置认证状态
     */
    reset(): void {
      this.token = ''
      this.expireAt = null
      this.user = null
      this.loginAt = null
    },

    /**
     * 登出
     */
    async logout(reason = 'manual'): Promise<string> {
      clearAuthLocalStorage()
      this.reset()

      // 重置业务上下文
      const permissionStore = usePermissionStore()
      const teamStore = useTeamStore()

      permissionStore.reset()
      teamStore.reset()

      // 多标签页同步
      localStorage.setItem('auth.logout_at', Date.now().toString())
      setTimeout(() => {
        localStorage.removeItem('auth.logout_at')
      }, 1000)

      // 跳转到登录页
      if (router.currentRoute.value.name !== 'Login') {
        router.replace({ name: 'Login', query: { reason } })
      }

      return reason
    },
  },
})

