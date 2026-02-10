import { get } from '@/utils/request'
import type { AuditLogDto, EntityChangeDto, PagedResult, PagedRequest } from '@/types'

export interface AuditLogQueryDto extends PagedRequest {
  startTime?: string
  endTime?: string
  httpMethod?: string
  url?: string
  userName?: string
  minExecutionDuration?: number
  maxExecutionDuration?: number
  httpStatusCode?: number
}

export interface EntityChangeQueryDto extends PagedRequest {
  startTime?: string
  endTime?: string
  entityTypeFullName?: string
  changeType?: string
}

/**
 * 审计日志列表
 * GET /api/app/audit-log
 */
export function getAuditLogList(params?: AuditLogQueryDto): Promise<PagedResult<AuditLogDto>> {
  return get('/app/audit-log', params as Record<string, unknown>)
}

/**
 * 审计日志详情
 * GET /api/app/audit-log/{id}
 */
export function getAuditLog(id: string): Promise<AuditLogDto> {
  return get(`/app/audit-log/${id}`)
}

/**
 * 实体变更列表
 * GET /api/app/audit-log/entity-changes
 */
export function getEntityChangeList(params?: EntityChangeQueryDto): Promise<PagedResult<EntityChangeDto>> {
  return get('/app/audit-log/entity-changes', params as Record<string, unknown>)
}

/**
 * 实体变更详情
 * GET /api/app/audit-log/entity-changes/{id}
 */
export function getEntityChange(id: string): Promise<EntityChangeDto> {
  return get(`/app/audit-log/entity-changes/${id}`)
}

export interface RecentActivityDto {
  userName: string | null
  httpMethod: string | null
  url: string | null
  httpStatusCode: number | null
  hasException: boolean
  executionTime: string | null
  executionDuration: number | null
  description: string | null
}

/**
 * 获取最近操作活动（仪表盘用）
 * GET /api/app/audit-log/recent-activities
 */
export function getRecentActivities(limit: number = 10): Promise<RecentActivityDto[]> {
  return get('/app/audit-log/recent-activities', { limit })
}

