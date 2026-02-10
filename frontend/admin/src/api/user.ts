import { get, post, put, del } from '@/utils/request'
import type {
  UserGetListInputDto,
  UserGetListOutputDto,
  UserDto,
  UserCreateDto,
  UserUpdateDto,
  ChangePasswordDto,
  AssignRolesDto,
} from '@/types'

/**
 * 用户列表
 * GET /api/app/users
 */
export function getUserList(params?: UserGetListInputDto): Promise<UserGetListOutputDto> {
  return get('/app/users', params as Record<string, unknown>)
}

/**
 * 用户详情
 * GET /api/app/users/{id}
 */
export function getUser(id: string): Promise<UserDto> {
  return get(`/app/users/${id}`)
}

/**
 * 创建用户
 * POST /api/app/users
 */
export function createUser(data: UserCreateDto): Promise<UserDto> {
  return post('/app/users', data)
}

/**
 * 更新用户
 * PUT /api/app/users/{id}
 */
export function updateUser(id: string, data: UserUpdateDto): Promise<UserDto> {
  return put(`/app/users/${id}`, data)
}

/**
 * 启用用户
 * POST /api/app/users/{id}/activate
 */
export function activateUser(id: string): Promise<void> {
  return post(`/app/users/${id}/activate`)
}

/**
 * 停用用户
 * POST /api/app/users/{id}/deactivate
 */
export function deactivateUser(id: string): Promise<void> {
  return post(`/app/users/${id}/deactivate`)
}

/**
 * 删除用户
 * DELETE /api/app/users/{id}
 */
export function deleteUser(id: string): Promise<void> {
  return del(`/app/users/${id}`)
}

/**
 * 修改密码（本人）
 * POST /api/app/users/{id}/change-password
 */
export function changePassword(id: string, data: ChangePasswordDto): Promise<void> {
  return post(`/app/users/${id}/change-password`, data)
}

/**
 * 重置密码（管理员）
 * POST /api/app/users/{id}/reset-password
 */
export function resetPassword(id: string): Promise<void> {
  return post(`/app/users/${id}/reset-password`)
}

/**
 * 分配角色
 * PUT /api/app/users/{id}/roles
 */
export function assignRoles(id: string, data: AssignRolesDto): Promise<void> {
  return put(`/app/users/${id}/roles`, data)
}

