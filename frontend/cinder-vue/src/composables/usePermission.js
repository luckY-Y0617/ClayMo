import { computed } from 'vue'
import { usePermissionStore } from '@/stores/permission'

/**
 * 权限检查 Composable
 * 
 * 在组件中方便地使用权限判断功能
 * 
 * @example
 * const { has, hasAny, hasAll } = usePermission()
 * 
 * if (has('system.users.manage')) {
 *   // 显示管理按钮
 * }
 */
export function usePermission() {
  const permissionStore = usePermissionStore()

  return {
    /**
     * 检查是否拥有某个权限
     */
    has: (code) => permissionStore.has(code),

    /**
     * 检查是否拥有任意一个权限
     */
    hasAny: (codes) => permissionStore.hasAny(codes),

    /**
     * 检查是否拥有所有权限
     */
    hasAll: (codes) => permissionStore.hasAll(codes),

    /**
     * 通用权限检查（支持 ABAC）
     */
    can: (permissionCode, context) => permissionStore.can(permissionCode, context),

    /**
     * 权限是否已加载
     */
    loaded: computed(() => permissionStore.loaded),

    /**
     * 当前用户的所有权限码
     */
    permissionCodes: computed(() => permissionStore.permissionCodes),
  }
}
