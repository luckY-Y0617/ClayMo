/**
 * 权限数据规范化工具
 * 
 * 职责：将后端返回的权限数据规范化为前端统一的数据结构
 * 
 * 设计原则：
 * - 纯函数：无副作用，可测试性强
 * - 防御性编程：处理各种异常数据格式
 * - 单一职责：仅负责数据转换，不涉及业务逻辑
 */

/**
 * 规范化权限项
 * 
 * @param {any} permission - 原始权限数据
 * @returns {import('@/types/permission').PermissionDto}
 */
export function normalizePermission(permission) {
  return {
    code: permission.code || '',
    displayName: permission.displayName || permission.code || '',
    description: permission.description || null,
    grantType: permission.grantType ?? 1, // 默认为 System
    order: permission.order ?? 0,
  }
}

/**
 * 规范化分组
 * 
 * @param {any} group - 原始分组数据
 * @returns {import('@/types/permission').GroupDto}
 */
export function normalizeGroup(group) {
  return {
    code: group.code || '',
    displayName: group.displayName || group.name || group.code || '',
    order: group.order ?? 0,
    description: group.description || null,
    // 预留子分组支持（当前为空）
    children: Array.isArray(group.children) 
      ? group.children.map(normalizeGroup)
      : [],
    // 规范化权限项数组
    permissions: Array.isArray(group.permissions)
      ? group.permissions.map(normalizePermission)
      : [],
  }
}

/**
 * 规范化模块
 * 
 * @param {any} module - 原始模块数据
 * @returns {import('@/types/permission').ModuleDto}
 */
export function normalizeModule(module) {
  return {
    code: module.code || '',
    displayName: module.displayName || module.name || module.code || '',
    order: module.order ?? 0,
    groups: Array.isArray(module.groups)
      ? module.groups.map(normalizeGroup).sort((a, b) => a.order - b.order)
      : [],
  }
}

/**
 * 规范化模块列表
 * 
 * @param {any} modules - 原始模块列表数据
 * @returns {import('@/types/permission').ModuleInfo[]}
 */
export function normalizeModuleList(modules) {
  // 确保返回数组
  if (!Array.isArray(modules)) {
    return []
  }
  
  return modules.map(module => ({
    code: module.code || '',
    name: module.name || module.displayName || module.code || '',
    order: module.order ?? 999,
  }))
}

