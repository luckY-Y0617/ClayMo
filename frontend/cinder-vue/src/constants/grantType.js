/**
 * 权限授予类型枚举
 * 
 * 用于区分权限的类型：
 * - System: 系统权限，可以被直接授予角色
 * - Resource: 资源权限，不能直接授予角色，仅作为说明展示
 */
export const GrantType = {
  /**
   * 系统权限
   * 可以被直接授予角色，参与角色权限配置
   */
  System: 1,

  /**
   * 资源权限
   * 不能直接授予角色，仅作为说明文本展示
   * 这类权限通常与具体资源（如知识库、文档）绑定
   */
  Resource: 2,
}

/**
 * 检查是否为系统权限
 * @param {number} grantType - 授予类型
 * @returns {boolean}
 */
export function isSystemPermission(grantType) {
  return grantType === GrantType.System
}

/**
 * 检查是否为资源权限
 * @param {number} grantType - 授予类型
 * @returns {boolean}
 */
export function isResourcePermission(grantType) {
  return grantType === GrantType.Resource
}

