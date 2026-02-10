/**
 * 通用类型定义
 */

/** 分页请求参数 */
export interface PaginationParams {
  skipCount?: number
  maxResultCount?: number
}

/** 分页响应 */
export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
}

/** API 错误响应 */
export interface ApiError {
  status?: number
  code?: string | null
  message: string
  details?: string
  validationErrors?: ValidationError[]
}

/** 验证错误 */
export interface ValidationError {
  message: string
  members: string[]
}

/** 用户基本信息 */
export interface UserInfo {
  id: string
  userName: string
  email?: string
  phoneNumber?: string
  avatar?: string
  tenantId?: string
  permissions?: string[]
  teams?: TeamInfo[]
}

/** 团队成员角色 */
export enum TeamMemberRole {
  Owner = 'Owner',
  Admin = 'Admin',
  Member = 'Member',
}

/** 团队信息 */
export interface TeamInfo {
  id: string
  teamId?: string // 兼容旧字段
  name: string
  displayName?: string // 兼容旧字段
  description?: string
  memberCount?: number
  role?: TeamMemberRole
}

/** 登录响应 */
export interface LoginResponse {
  accessToken: string
  accessTokenExpiresAtUtc?: string
  refreshToken?: string
}

/** 认证状态 */
export interface AuthState {
  token: string
  expireAt: number | null
  user: UserInfo | null
  loginAt: number | null
}

/** 租户信息 */
export interface TenantInfo {
  id: string
  name: string
}

