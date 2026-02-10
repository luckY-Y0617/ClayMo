import { get, post, put, del } from '@/utils/request'
import type {
  RoleGetListInputDto,
  RoleDto,
  RoleCreateDto,
  RoleUpdateDto,
  AssignPermissionsDto,
  PagedResult,
} from '@/types'

/**
 * 角色列表
 * GET /api/app/roles
 */
export function getRoleList(params?: RoleGetListInputDto): Promise<PagedResult<RoleDto>> {
  return get('/app/roles', params as Record<string, unknown>)
}

/**
 * 角色详情
 * GET /api/app/roles/{id}
 */
export function getRole(id: string): Promise<RoleDto> {
  return get(`/app/roles/${id}`)
}

/**
 * 创建角色
 * POST /api/app/roles
 */
export function createRole(data: RoleCreateDto): Promise<RoleDto> {
  return post('/app/roles', data)
}

/**
 * 更新角色
 * PUT /api/app/roles/{id}
 */
export function updateRole(id: string, data: RoleUpdateDto): Promise<RoleDto> {
  return put(`/app/roles/${id}`, data)
}

/**
 * 删除角色
 * DELETE /api/app/roles/{id}
 */
export function deleteRole(id: string): Promise<void> {
  return del(`/app/roles/${id}`)
}

/**
 * 查询角色权限
 * GET /api/app/roles/{id}/permissions
 */
export function getRolePermissions(id: string): Promise<string[]> {
  return get(`/app/roles/${id}/permissions`)
}

/**
 * 分配角色权限
 * PUT /api/app/roles/{id}/permissions
 */
export function assignRolePermissions(id: string, data: AssignPermissionsDto): Promise<void> {
  return put(`/app/roles/${id}/permissions`, data)
}

