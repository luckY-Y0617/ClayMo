import { get, post, put, del } from '@/utils/request'
import type {
  TenantGetListInputDto,
  TenantGetListOutputDto,
  TenantGetOutputDto,
  TenantCreateDto,
  TenantUpdateDto,
  TenantCreateAndBootstrapDto,
  TenantBootstrapOptionsDto,
  TenantBootstrapResultDto,
  TenantBootstrapStateDto,
} from '@/types'

/**
 * 租户列表
 * GET /api/tenant
 */
export function getTenantList(params?: TenantGetListInputDto): Promise<TenantGetListOutputDto[]> {
  return get('/tenant', params as Record<string, unknown>)
}

/**
 * 租户详情
 * GET /api/tenant/{id}
 */
export function getTenant(id: string): Promise<TenantGetOutputDto> {
  return get(`/tenant/${id}`)
}

/**
 * 创建租户
 * POST /api/tenant
 */
export function createTenant(data: TenantCreateDto): Promise<TenantGetOutputDto> {
  return post('/tenant', data)
}

/**
 * 更新租户
 * PUT /api/tenant/{id}
 */
export function updateTenant(id: string, data: TenantUpdateDto): Promise<TenantGetOutputDto> {
  return put(`/tenant/${id}`, data)
}

/**
 * 删除租户
 * DELETE /api/tenant/{id}
 */
export function deleteTenant(id: string): Promise<void> {
  return del(`/tenant/${id}`)
}

/**
 * 租户初始化（异步入队）
 * POST /api/app/tenant/bootstrap/create-and-bootstrap
 */
export function createAndBootstrapTenant(data: TenantCreateAndBootstrapDto): Promise<TenantBootstrapResultDto> {
  return post('/app/tenant/bootstrap/create-and-bootstrap', data)
}

/**
 * 触发或重试初始化
 * POST /api/app/tenant/bootstrap/{tenantId}
 */
export function bootstrapTenant(tenantId: string, options?: TenantBootstrapOptionsDto): Promise<TenantBootstrapResultDto> {
  return post(`/app/tenant/bootstrap/${tenantId}`, options)
}

/**
 * 查询初始化状态
 * GET /api/app/tenant/bootstrap/{tenantId}/state
 */
export function getTenantBootstrapState(tenantId: string): Promise<TenantBootstrapStateDto> {
  return get(`/app/tenant/bootstrap/${tenantId}/state`)
}

