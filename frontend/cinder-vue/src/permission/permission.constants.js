// 系统管理权限
export const SYSTEM_PERMISSIONS = {
  // 审计日志
  AUDITLOGS_VIEW: 'system.auditlogs.view',
  
  // 角色管理
  ROLES_MANAGE: 'system.roles.manage',
  ROLES_VIEW: 'system.roles.view',
  
  // 租户管理
  TENANTS_VIEW: 'system.tenants.view',
  TENANTS_MANAGE: 'system.tenants.manage',
  
  // 用户管理
  USERS_VIEW: 'system.users.view',
  USERS_MANAGE: 'system.users.manage',
}

// 知识库权限
export const KB_PERMISSIONS = {
  // 知识库基础操作
  BASE_VIEW: 'kb.base.view',
  BASE_CREATE: 'kb.base.create',
  BASE_MANAGE: 'kb.base.manage',
  BASE_DELETE: 'kb.base.delete',
  
  // 文档操作
  DOC_VIEW: 'kb.doc.view',
  DOC_EDIT: 'kb.doc.edit',
  DOC_DELETE: 'kb.doc.delete',
  DOC_CREATE: 'kb.doc.create',
  
  // 评论操作
  COMMENT_VIEW: 'kb.comment.view',
  COMMENT_CREATE: 'kb.comment.create',
  COMMENT_DELETE: 'kb.comment.delete',
  
  // 导出操作
  EXPORT: 'kb.export',
  
  // 分享操作
  SHARE: 'kb.share',
}

// 所有权限码的扁平数组（用于类型检查和文档生成）
export const ALL_PERMISSIONS = [
  ...Object.values(SYSTEM_PERMISSIONS),
  ...Object.values(KB_PERMISSIONS),
]

/**
 * 权限码说明文档
 * 用于生成权限文档和帮助开发人员理解每个权限的含义
 */
export const PERMISSION_DESCRIPTIONS = {
  // 系统管理
  [SYSTEM_PERMISSIONS.AUDITLOGS_VIEW]: '查看系统审计日志',
  [SYSTEM_PERMISSIONS.ROLES_MANAGE]: '管理系统角色（创建、编辑、删除）',
  [SYSTEM_PERMISSIONS.ROLES_VIEW]: '查看系统角色列表',
  [SYSTEM_PERMISSIONS.TENANTS_VIEW]: '查看租户列表',
  [SYSTEM_PERMISSIONS.TENANTS_MANAGE]: '管理租户（创建、编辑、删除）',
  [SYSTEM_PERMISSIONS.USERS_VIEW]: '查看用户列表',
  [SYSTEM_PERMISSIONS.USERS_MANAGE]: '管理用户（创建、编辑、删除）',
  
  // 知识库
  [KB_PERMISSIONS.BASE_VIEW]: '查看知识库',
  [KB_PERMISSIONS.BASE_CREATE]: '创建知识库',
  [KB_PERMISSIONS.BASE_MANAGE]: '管理知识库（编辑基本信息）',
  [KB_PERMISSIONS.BASE_DELETE]: '删除知识库',
  [KB_PERMISSIONS.DOC_VIEW]: '查看文档',
  [KB_PERMISSIONS.DOC_EDIT]: '编辑文档',
  [KB_PERMISSIONS.DOC_DELETE]: '删除文档',
  [KB_PERMISSIONS.DOC_CREATE]: '创建文档',
  [KB_PERMISSIONS.COMMENT_VIEW]: '查看评论',
  [KB_PERMISSIONS.COMMENT_CREATE]: '创建评论',
  [KB_PERMISSIONS.COMMENT_DELETE]: '删除评论',
  [KB_PERMISSIONS.EXPORT]: '导出知识库内容',
  [KB_PERMISSIONS.SHARE]: '分享知识库',
}

