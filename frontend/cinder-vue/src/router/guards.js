import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import { useTeamStore } from '@/stores/team'

/**
 * 路由权限守卫
 * 
 * 在路由配置中通过 meta 字段声明权限需求：
 * - requiredPermissions?: string[] - 进入该路由至少需要哪些权限
 * - requireAll?: boolean - 默认 false，表示 hasAny；true 表示 hasAll
 * 
 * @example
 * {
 *   path: '/system/users',
 *   component: UserManagement,
 *   meta: {
 *     requiredPermissions: ['system.users.view', 'system.users.manage'],
 *     requireAll: false, // 有任意一个权限即可访问
 *   }
 * }
 */
export function setupPermissionGuard(router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    const permissionStore = usePermissionStore()
    const teamStore = useTeamStore()

    // 定义不需要登录即可访问的路由
    const publicRoutes = ['/login', '/register']
    const isPublicRoute = publicRoutes.includes(to.path)

    // 如果不是公开路由，检查是否已登录
    if (!isPublicRoute && !authStore.token) {
      // 未登录且访问需要登录的页面，重定向到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath }, // 保存原始路径，登录后可以跳转回来
      })
      return
    }

    // 如果已登录但访问登录/注册页，重定向到首页
    if (isPublicRoute && authStore.token) {
      next({ path: '/' })
      return
    }

    // 支持单个权限码（permission）或权限数组（requiredPermissions）
    const permission = to.meta?.permission
    const requiredPermissions = to.meta?.requiredPermissions

    // 如果路由没有配置任何权限要求，则视为不需要权限，直接放行
    if (!permission && (!requiredPermissions || requiredPermissions.length === 0)) {
      next()
      return
    }

    // 检查是否已登录（这里应该已经登录了，但为了安全再次检查）
    if (!authStore.token) {
      // 未登录，重定向到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath }, // 保存原始路径，登录后可以跳转回来
      })
      return
    }

    // 已登录：确保团队上下文加载（只加载一次）
    if (!teamStore.loaded) {
      try {
        await teamStore.loadMyTeams()
      } catch (e) {
        console.warn('加载团队上下文失败:', e)
      }
    }

    // 检查权限是否已加载
    if (!permissionStore.loaded) {
      // 权限未加载，可能需要等待权限加载完成
      // 这里可以根据实际情况决定是等待还是重定向
      console.warn('权限未加载，但尝试访问需要权限的路由:', to.path)
      // 可以选择等待或重定向到首页
      next('/home')
      return
    }

    // 进行权限判断
    let hasPermission = false
    
    if (permission) {
      // 单个权限码
      hasPermission = permissionStore.has(permission)
    } else if (requiredPermissions && requiredPermissions.length > 0) {
      // 权限数组
      const requireAll = to.meta.requireAll !== undefined ? to.meta.requireAll : false
      if (requireAll) {
        hasPermission = permissionStore.hasAll(requiredPermissions)
      } else {
        hasPermission = permissionStore.hasAny(requiredPermissions)
      }
    }

    if (hasPermission) {
      // 有权限，放行
      next()
    } else {
      // 无权限，重定向到 403 页面或首页
      // 可以根据需求选择：
      // 1. 重定向到专门的 403 页面
      // 2. 重定向到首页
      // 3. 显示无权限提示
      
      const requiredPerm = permission || requiredPermissions
      console.warn('无权限访问路由:', to.path, '需要权限:', requiredPerm)
      
      // 这里重定向到首页，你可以根据需要修改为 403 页面
      next({
        path: '/home',
        // 或者可以添加一个 query 参数来显示错误信息
        // query: { error: 'no_permission' }
      })
    }
  })
}

