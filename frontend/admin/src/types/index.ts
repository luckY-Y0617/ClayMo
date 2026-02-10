// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
}

export interface PagedRequest {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
}

// Auth Types
export interface AdminSessionLoginInputDto {
  userName: string
  password: string
  
  // Session & Device IDs
  sessionId?: string
  clientId?: string
  deviceId?: string
  fingerprint?: string
  
  // Location & Device Info
  loginLocation?: string
  browser?: string
  os?: string
  deviceType?: string
  deviceModel?: string
  
  // App Info
  appVersion?: string
  appChannel?: string
  networkType?: string
  loginSource?: string
}

export interface AdminSessionLoginOutputDto {
  expireAtUtc: string
}

/**
 * 当前登录用户信息
 * GET /api/admin/auth/me
 */
export interface CurrentUser {
  id: string
  userName: string
  email: string
  permissions: string[]
  tenantId?: string
  avatar?: string
}

/**
 * 认证用户信息（新增）
 * 用于获取当前用户基础信息与头像展示
 */
export interface AuthUserDto {
  id: string
  userName: string
  email: string
  phoneNumber?: string
  avatar?: string
  tenantId?: string
  permissions: string[]
}

// Tenant Types
// Tenant Provisioning State Enum
export enum TenantProvisioningState {
  NotReady = 0,
  Provisioning = 1,
  Ready = 2,
  Failed = 3
}

export interface TenantGetListInputDto {
  name?: string
  provisioningState?: TenantProvisioningState
  startTime?: string
  endTime?: string
}

export interface TenantGetListOutputDto {
  id: string
  name?: string
  provisioningState: TenantProvisioningState
  editionId?: string | null
  dbType: string | number
  creationTime?: string
}

export interface TenantConnectionStringDto {
  name: string
  value: string
}

export interface TenantGetOutputDto {
  id: string
  name?: string
  provisioningState: TenantProvisioningState
  editionId?: string | null
  dbType: string | number
  defaultConnectionString?: string
  connectionStrings?: TenantConnectionStringDto[]
  creationTime?: string
  updatedAt?: string
  isActive?: boolean
}

export interface TenantCreateDto {
  name: string
  dbType: string | number
  defaultConnectionString?: string
  connectionStrings?: TenantConnectionStringDto[]
}

export interface TenantUpdateDto {
  name: string
  dbType: string | number
  defaultConnectionString?: string
}

export interface TenantCreateAndBootstrapDto extends TenantCreateDto {
}

export interface TenantBootstrapOptionsDto {
  defaultConnectionString?: string
  connectionStrings?: TenantConnectionStringDto[]
  forceRepeatableMigrations?: boolean
  ensureDatabaseCreated?: boolean
  useTransaction?: boolean
}

export interface TenantBootstrapResultDto {
  tenantId: string
  success: boolean
  message?: string
}

export interface TenantBootstrapStateDto {
  provisioningState: number  // 0=NotReady, 1=Provisioning, 2=Ready, 3=Failed
  state: 'NotReady' | 'Provisioning' | 'Ready' | 'Failed'  // 字符串形式的状态
  provisionedAtUtc?: string
  lastError?: string
}

// Helper function to get state text
export function getTenantStateText(state: number): string {
  switch (state) {
    case TenantProvisioningState.NotReady:
      return '未就绪'
    case TenantProvisioningState.Provisioning:
      return '配置中'
    case TenantProvisioningState.Ready:
      return '就绪'
    case TenantProvisioningState.Failed:
      return '失败'
    default:
      return '未知'
  }
}

// Helper function to get state type for el-tag
export function getTenantStateType(state: number): 'success' | 'warning' | 'info' | 'danger' {
  switch (state) {
    case TenantProvisioningState.Ready:
      return 'success'
    case TenantProvisioningState.Provisioning:
      return 'warning'
    case TenantProvisioningState.NotReady:
      return 'info'
    case TenantProvisioningState.Failed:
      return 'danger'
    default:
      return 'info'
  }
}

// User Types
export interface UserGetListInputDto extends PagedRequest {
  filter?: string
}

export interface UserGetListOutputDto extends PagedResult<UserDto> {}

export interface UserDto {
  id: string
  userName: string
  realName?: string
  nickName?: string
  email: string
  phoneNumber?: string
  gender?: number
  roleNames: string[]
  isEnabled: boolean
  tenantId?: string
  creationTime: string
  lastLoginAt?: string
}

export interface UserCreateDto {
  userName: string
  password: string
  email: string
  phoneNumber?: string
  roleIds: string[]
  isEnabled: boolean
}

export interface UserUpdateDto {
  email?: string
  phoneNumber?: string
}

export interface ChangePasswordDto {
  userId: string
  currentPassword: string
  newPassword: string
}

export interface AssignRolesDto {
  userId: string
  roleIds: string[]
}

// Login Log Types
export interface LoginLogGetListInputDto extends PagedRequest {
  userId?: string
  userName?: string
  loginStatus?: number
  startTime?: string
  endTime?: string
}

export interface LoginLogDto {
  id: string
  userId?: string
  userName?: string
  loginType: number
  loginIp?: string
  loginLocation?: string
  userAgent?: string
  browser?: string
  os?: string
  deviceType?: string
  loginStatus: number
  failureReason?: string
  loginTime: string
  logoutTime?: string
  sessionId?: string
  tenantId?: string
  creationTime: string
}

export interface LoginLogGetListOutputDto extends PagedResult<LoginLogDto> {}

// Role Types
export interface RoleGetListInputDto extends PagedRequest {
  filter?: string
  roleType?: string
}

export interface RoleDto {
  id: string
  roleName: string
  roleCode: string
  description?: string
  isSystem: boolean
  createdAt: string
}

export interface RoleCreateDto {
  roleName: string
  roleCode: string
  description?: string
}

export interface RoleUpdateDto {
  roleName: string
  description?: string
}

export interface AssignPermissionsDto {
  permissionCodes: string[]
}

// Permission Types（Identity 模块）

/**
 * 权限定义树（新接口返回类型）
 * GET /api/app/permission-definitions
 * 直接返回模块数组
 */
export type PermissionDefinitionTreeDto = PermissionModuleNode[]

export interface PermissionModuleNode {
  code: string
  displayName: string
  description?: string
  order: number
  groups: PermissionGroupNode[]
}

export interface PermissionGroupNode {
  code: string
  displayName: string
  description?: string
  order: number
  permissions: PermissionNode[]
}

export interface PermissionNode {
  code: string
  displayName: string
  description?: string
  order: number
}

// 兼容旧接口的类型
export interface PermissionModule {
  code: string
  name: string
  description?: string
  groups: PermissionGroup[]
}

export interface PermissionModuleDetail extends PermissionModule {
  permissions: PermissionDefinition[]
}

export interface PermissionGroup {
  code: string
  name: string
  description?: string
}

export interface PermissionDefinition {
  code: string
  name: string
  description?: string
  groupCode: string
}

// Team Types
export interface TeamDto {
  id: string
  name: string
  description?: string
  type?: number
  tenantId?: string | null
  creationTime: string
  members?: TeamMemberDto[]
  // 计算属性
  memberCount?: number
}

export interface TeamMemberDto {
  id?: string
  teamId?: string
  userId: string
  username?: string  // API 返回的是小写的 username
  userName?: string
  email?: string
  role: number | 'Owner' | 'Manager' | 'Member'  // API 返回数字，显示时转换为字符串
  creationTime?: string  // API 返回的是 creationTime
  joinedAt?: string
}

// 角色枚举映射（与后端 TeamMemberRole 一致）
export enum TeamMemberRole {
  Owner = 0,   // 团队拥有者
  Admin = 1,   // 管理员
  Member = 2   // 普通成员
}

// 角色转换辅助函数：数字 -> 字符串标识
export function getTeamRoleText(role: number | string): string {
  if (typeof role === 'string') return role
  switch (role) {
    case TeamMemberRole.Owner:
    case 0:
      return 'Owner'
    case TeamMemberRole.Admin:
    case 1:
      return 'Manager'  // 前端显示为 Manager
    case TeamMemberRole.Member:
    case 2:
    default:
      return 'Member'
  }
}

// 角色转换辅助函数：数字/字符串 -> 中文名称
export function getTeamRoleName(role: number | string): string {
  if (typeof role === 'string') {
    switch (role) {
      case 'Owner':
        return '所有者'
      case 'Manager':
      case 'Admin':
        return '管理员'
      default:
        return '成员'
    }
  }
  switch (role) {
    case TeamMemberRole.Owner:
    case 0:
      return '所有者'
    case TeamMemberRole.Admin:
    case 1:
      return '管理员'
    case TeamMemberRole.Member:
    case 2:
    default:
      return '成员'
  }
}

// 角色转换辅助函数：字符串 -> 枚举数字值（用于 API 请求）
export function getTeamRoleValue(role: string): number {
  switch (role) {
    case 'Owner':
      return TeamMemberRole.Owner  // 0
    case 'Manager':
    case 'Admin':
      return TeamMemberRole.Admin  // 1
    case 'Member':
    default:
      return TeamMemberRole.Member  // 2
  }
}


// Audit Log Types
export interface AuditLogDto {
  id: string
  userId?: string
  userName?: string
  httpMethod: string
  url: string
  httpStatusCode: number
  executionDuration: number
  executionTime: string
  clientIpAddress?: string
  browserInfo?: string
}

export interface EntityChangeDto {
  id: string
  auditLogId: string
  entityTypeFullName: string
  entityId: string
  changeType: 'Created' | 'Updated' | 'Deleted'
  changeTime: string
  propertyChanges?: PropertyChangeDto[]
}

export interface PropertyChangeDto {
  propertyName: string
  originalValue?: string
  newValue?: string
}

// Menu Types
export interface MenuItem {
  path: string
  name: string
  title: string
  icon?: string
  permission?: string
  children?: MenuItem[]
  hidden?: boolean
}
