import { get } from '@/utils/request'
import type {
  LoginLogGetListInputDto,
  LoginLogGetListOutputDto,
  LoginLogDto,
} from '@/types'

/**
 * 登录记录列表
 * GET /api/app/login-logs
 */
export function getLoginLogList(params?: LoginLogGetListInputDto): Promise<LoginLogGetListOutputDto> {
  return get('/app/login-logs', params as Record<string, unknown>)
}

/**
 * 登录记录详情
 * GET /api/app/login-logs/{id}
 */
export function getLoginLog(id: string): Promise<LoginLogDto> {
  return get(`/app/login-logs/${id}`)
}

/**
 * 查询用户的登录记录
 * GET /api/app/login-logs/user/{userId}
 */
export function getUserLoginLogs(userId: string, params?: LoginLogGetListInputDto): Promise<LoginLogGetListOutputDto> {
  return get(`/app/login-logs/user/${userId}`, params as Record<string, unknown>)
}

