import { get } from '@/utils/request'
import type {
  PermissionModule,
  PermissionModuleDetail,
  PermissionDefinitionTreeDto,
} from '@/types'

// ============ 权限定义查询（Identity 模块） ============

/**
 * 获取权限定义树（新接口）
 * GET /api/app/permission-definitions
 * 返回按模块/分组组织的权限定义树
 * 权限：SystemPermissions.PermissionCenter.View
 */
export function getPermissionDefinitions(): Promise<PermissionDefinitionTreeDto> {
  return get('/app/permission-definitions')
}

// ============ 发布目录查询（兼容旧接口） ============

/**
 * 获取权限模块列表
 * GET /api/app/permission-catalog/modules
 */
export function getPermissionModules(): Promise<PermissionModule[]> {
  return get('/app/permission-catalog/modules')
}

/**
 * 获取权限模块详情
 * GET /api/app/permission-catalog/modules/{moduleCode}
 */
export function getPermissionModuleDetail(moduleCode: string): Promise<PermissionModuleDetail> {
  return get(`/app/permission-catalog/modules/${moduleCode}`)
}

// ============ 以下接口已停用（permission-center 模块已移除） ============
// 草稿目录管理、草稿发布与差异、发布操作日志等接口已不再可用
// 权限目录由 Identity 模块接管，请使用 getPermissionDefinitions()
