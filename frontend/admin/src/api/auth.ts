import { post, get } from '@/utils/request'
import type { AdminSessionLoginInputDto, AdminSessionLoginOutputDto, CurrentUser } from '@/types'

/**
 * 管理端登录
 * POST /api/admin/auth/login
 */
export function adminLogin(data: AdminSessionLoginInputDto): Promise<AdminSessionLoginOutputDto> {
  return post('/admin/auth/login', data)
}

/**
 * 管理端退出
 * POST /api/admin/auth/logout
 */
export function adminLogout(): Promise<void> {
  return post('/admin/auth/logout')
}

/**
 * 获取当前用户信息
 * GET /api/app/users/me
 */
export function getCurrentUser(): Promise<CurrentUser> {
  return get('/app/users/me')
}
