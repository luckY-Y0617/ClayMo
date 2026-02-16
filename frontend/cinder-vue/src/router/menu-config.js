import { SYSTEM_PERMISSIONS, KB_PERMISSIONS } from '@/permission/permission.constants'

/**
 * 菜单项配置
 * @typedef {Object} AppMenuItem
 * @property {string} name - 菜单显示名称
 * @property {string} [path] - 路由路径
 * @property {string} [icon] - 图标名称
 * @property {string} [permission] - 单个权限码（显示该菜单项所需的最小权限）
 * @property {AppMenuItem[]} [children] - 子菜单
 */

/**
 * 应用菜单配置
 */
export const appMenus = [
  // 系统管理菜单
  {
    name: '系统管理',
    icon: 'Setting',
    children: [
      {
        name: '用户管理',
        path: '/system/users',
        permission: SYSTEM_PERMISSIONS.USERS_VIEW,
      },
      {
        name: '角色管理',
        path: '/system/roles',
        permission: SYSTEM_PERMISSIONS.ROLES_VIEW,
      },
      {
        name: '审计日志',
        path: '/system/audit-logs',
        permission: SYSTEM_PERMISSIONS.AUDITLOGS_VIEW,
      },
    ],
  },
]

