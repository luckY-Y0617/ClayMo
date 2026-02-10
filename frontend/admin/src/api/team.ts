import { get, post, put, del } from '@/utils/request'
import type { TeamDto, TeamMemberDto, PagedResult, PagedRequest } from '@/types'

/**
 * 团队列表
 * GET /api/app/teams
 */
export function getTeamList(params?: PagedRequest): Promise<PagedResult<TeamDto>> {
  return get('/app/teams', params as Record<string, unknown>)
}

/**
 * 团队详情
 * GET /api/app/teams/{id}
 */
export function getTeam(id: string): Promise<TeamDto> {
  return get(`/app/teams/${id}`)
}

/**
 * 创建团队
 * POST /api/app/teams
 */
export function createTeam(data: { name: string; description?: string }): Promise<TeamDto> {
  return post('/app/teams', data)
}

/**
 * 更新团队
 * PUT /api/app/teams/{id}
 */
export function updateTeam(id: string, data: { name: string; description?: string }): Promise<TeamDto> {
  return put(`/app/teams/${id}`, data)
}

/**
 * 删除团队
 * DELETE /api/app/teams/{id}
 */
export function deleteTeam(id: string): Promise<void> {
  return del(`/app/teams/${id}`)
}

/**
 * 获取团队成员
 * GET /api/app/teams/{id}/members
 */
export function getTeamMembers(id: string): Promise<TeamMemberDto[]> {
  return get(`/app/teams/${id}/members`)
}

/**
 * 添加团队成员
 * POST /api/app/teams/{id}/members
 */
export function addTeamMember(id: string, data: { userId: string; role: number }): Promise<void> {
  return post(`/app/teams/${id}/members`, data)
}

/**
 * 更新团队成员角色
 * PUT /api/app/teams/{id}/members/{userId}
 */
export function updateTeamMember(id: string, userId: string, data: { role: number }): Promise<void> {
  return put(`/app/teams/${id}/members/${userId}`, data)
}

/**
 * 移除团队成员
 * DELETE /api/app/teams/{id}/members/{userId}
 */
export function removeTeamMember(id: string, userId: string): Promise<void> {
  return del(`/app/teams/${id}/members/${userId}`)
}

/**
 * 转移团队所有者
 * PUT /api/app/teams/{id}/owner
 */
export function transferOwnership(id: string, data: { teamId: string; newOwnerUserId: string }): Promise<void> {
  return put(`/app/teams/${id}/owner`, data)
}