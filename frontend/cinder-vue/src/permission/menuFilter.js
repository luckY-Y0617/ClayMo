import { usePermissionStore } from '@/stores/permission'

/**
 * 菜单项类型定义
 * @typedef {Object} MenuItem
 * @property {string} name - 菜单显示文本
 * @property {string} path - 对应路由路径
 * @property {MenuItem[]} [children] - 子菜单
 * @property {string} [permissionCode] - 单个权限码（显示该菜单项所需的最小权限）
 * @property {string[]} [requiredPermissions] - 权限码数组（显示该菜单项所需的权限）
 * @property {boolean} [requireAll] - 是否要求所有权限都满足（默认 false，即 hasAny）
 */

/**
 * 检查菜单项是否应该显示
 * @param {MenuItem} menuItem - 菜单项
 * @param {import('pinia').Store} permissionStore - 权限 Store 实例
 * @returns {boolean}
 */
function shouldShowMenuItem(menuItem, permissionStore) {
  // 支持 permission 或 permissionCode 字段（两者等价）
  const permission = menuItem.permission || menuItem.permissionCode
  
  // 如果菜单项未配置任何权限字段，则认为对所有登录用户可见
  if (!permission && !menuItem.requiredPermissions) {
    return true
  }

  // 如果配置了单个权限码
  if (permission) {
    return permissionStore.has(permission)
  }

  // 如果配置了权限数组
  if (menuItem.requiredPermissions && menuItem.requiredPermissions.length > 0) {
    const requireAll = menuItem.requireAll !== undefined ? menuItem.requireAll : false
    
    if (requireAll) {
      return permissionStore.hasAll(menuItem.requiredPermissions)
    } else {
      return permissionStore.hasAny(menuItem.requiredPermissions)
    }
  }

  return true
}

/**
 * 过滤菜单树，根据当前用户权限只保留可见的菜单项
 * 
 * 过滤规则：
 * 1. 如果菜单项未配置任何权限字段，则认为对所有登录用户可见
 * 2. 如果菜单项配置了单个 permissionCode，则调用 has(permissionCode) 决定是否显示
 * 3. 如果菜单项配置了 requiredPermissions，则根据 hasAny / hasAll 进行判断
 * 4. 对于有子菜单的父菜单：
 *    - 如果父菜单本身没有权限要求，但子菜单中至少有一项可见，则保留父菜单但只保留可见的子菜单
 *    - 如果父菜单本身有权限要求但不满足，则隐藏整个父菜单（包括所有子菜单）
 * 
 * @param {MenuItem[]} allMenus - 完整的菜单配置
 * @param {import('pinia').Store} [permissionStore] - 权限 Store 实例（可选，默认从 usePermissionStore 获取）
 * @returns {MenuItem[]} 过滤后的菜单树
 * 
 * @example
 * const menuConfig = [
 *   {
 *     name: '系统管理',
 *     path: '/system',
 *     permissionCode: 'system.manage',
 *     children: [
 *       { name: '用户管理', path: '/system/users', permissionCode: 'system.users.manage' },
 *       { name: '角色管理', path: '/system/roles', permissionCode: 'system.roles.manage' },
 *     ]
 *   }
 * ]
 * 
 * const filteredMenus = filterMenuTree(menuConfig)
 */
export function filterMenuTree(allMenus, permissionStore = null) {
  if (!Array.isArray(allMenus) || allMenus.length === 0) {
    return []
  }

  // 如果没有传入 permissionStore，则获取默认实例
  const store = permissionStore || usePermissionStore()

  return allMenus
    .map(menuItem => {
      // 检查父菜单本身的权限
      const parentHasPermission = shouldShowMenuItem(menuItem, store)

      // 如果有子菜单，先递归过滤子菜单
      let filteredChildren = []
      if (menuItem.children && menuItem.children.length > 0) {
        filteredChildren = filterMenuTree(menuItem.children, store)
      }

      // 如果父菜单本身有权限要求但不满足，则隐藏整个父菜单
      const hasPermissionField = menuItem.permission || menuItem.permissionCode
      if (hasPermissionField || (menuItem.requiredPermissions && menuItem.requiredPermissions.length > 0)) {
        if (!parentHasPermission) {
          return null // 隐藏整个父菜单
        }
      }

      // 如果父菜单没有权限要求，但子菜单中至少有一项可见，则保留父菜单
      // 如果父菜单有权限要求且满足，也保留父菜单
      if (parentHasPermission || filteredChildren.length > 0) {
        return {
          ...menuItem,
          children: filteredChildren.length > 0 ? filteredChildren : undefined,
        }
      }

      // 其他情况隐藏菜单项
      return null
    })
    .filter(item => item !== null) // 移除 null 项
}

