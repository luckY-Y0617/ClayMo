import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CurrentUser } from '@/types'
import { adminLogin, adminLogout, getCurrentUser } from '@/api/auth'
import { getDeviceInfo } from '@/utils/device'
import router from '@/router'

export const useUserStore = defineStore(
  'user',
  () => {
    const currentUser = ref<CurrentUser | null>(null)
    const tenantId = ref<string>('')
    const isLoggedIn = computed(() => !!currentUser.value)

    const hasPermission = (permission: string): boolean => {
      if (!currentUser.value) return false
      if (!currentUser.value.permissions || !Array.isArray(currentUser.value.permissions)) {
        return false
      }
      if (currentUser.value.permissions.includes('*')) {
        return true
      }
      return currentUser.value.permissions.includes(permission)
    }

    const hasAnyPermission = (permissions: string[]): boolean => {
      return permissions.some((p) => hasPermission(p))
    }

    const hasAllPermissions = (permissions: string[]): boolean => {
      return permissions.every((p) => hasPermission(p))
    }

    const setTenantId = (id: string) => {
      tenantId.value = id
    }

    const login = async (username: string, password: string, selectedTenantId: string) => {
      setTenantId(selectedTenantId)
      
      const deviceInfo = getDeviceInfo()
      
      await adminLogin({
        userName: username,
        password,
        ...deviceInfo,
      })
      
      await fetchCurrentUser()
      // If user selected a specific tenant, keep it
      // If user selected Host (empty string), check if server returned a tenantId
      if (selectedTenantId === '' && currentUser.value?.tenantId) {
        // Server returned a tenant, update to it
        setTenantId(currentUser.value.tenantId)
      } else if (selectedTenantId !== '') {
        // User selected a specific tenant, keep their selection
        // But validate against server response if needed
        setTenantId(selectedTenantId)
      }
    }

    const clearAuthState = () => {
      currentUser.value = null
      tenantId.value = ''
      
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      
      // 清理所有 cookie（考虑 domain 和 secure 属性）
      const cookies = document.cookie.split(';')
      cookies.forEach(cookie => {
        const [name] = cookie.split('=')
        const cookieName = name.trim()
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
        const rootDomain = window.location.hostname.split('.').slice(-2).join('.')
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${rootDomain}`
      })
    }

    const logout = async () => {
      try {
        await adminLogout()
      } finally {
        clearAuthState()
        router.push('/login')
      }
    }

    const fetchCurrentUser = async () => {
      try {
        currentUser.value = await getCurrentUser()
      } catch {
        currentUser.value = null
        throw new Error('获取用户信息失败')
      }
    }

    return {
      currentUser,
      tenantId,
      isLoggedIn,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      setTenantId,
      login,
      logout,
      clearAuthState,
      fetchCurrentUser,
    }
  },
  {
    persist: {
      paths: ['currentUser', 'tenantId'],
    },
  }
)

