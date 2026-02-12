import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { useAuthStore } from '@/stores/auth'

// NProgress 配置
NProgress.configure({ showSpinner: false })

export function setupGuards(router: Router): void {
  // 路由开始
  router.beforeEach(async (to, _from, next) => {
    // 开始进度条
    NProgress.start()

    // 设置页面标题
    const title = to.meta.title as string | undefined
    document.title = title ? `${title} - ClayMo` : 'ClayMo'

    const authStore = useAuthStore()

    // 需要认证的路由
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }

    // 访客路由（已登录不能访问）
    if (to.meta.guest && authStore.isAuthenticated) {
      next({ name: 'Home' })
      return
    }

    // 权限检查
    const requiredPermissions = to.meta.permissions as string[] | undefined
    if (requiredPermissions && requiredPermissions.length > 0) {
      const { usePermissionStore } = await import('@/stores/permission')
      const permissionStore = usePermissionStore()

      const requireAll = to.meta.requireAllPermissions ?? false
      const hasPermission = requireAll
        ? permissionStore.hasAllPermissions(requiredPermissions)
        : permissionStore.hasAnyPermission(requiredPermissions)

      if (!hasPermission) {
        next({ name: 'Forbidden' })
        return
      }
    }

    next()
  })

  // 路由结束
  router.afterEach(() => {
    // 结束进度条
    NProgress.done()
  })
}

// 扩展路由元信息类型
declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题 */
    title?: string
    /** 需要认证 */
    requiresAuth?: boolean
    /** 访客页面（已登录不能访问） */
    guest?: boolean
    /** 需要的权限 */
    permissions?: string[]
    /** 是否需要所有权限（默认任意一个） */
    requireAllPermissions?: boolean
  }
}

