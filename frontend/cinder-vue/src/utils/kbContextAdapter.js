/**
 * 知识库上下文数据适配器
 * 
 * 将后端返回的 context 数据适配为前端需要的格式
 * 
 * 后端返回结构：
 * {
 *   knowledgeBase: { ... },
 *   isMember: boolean,
 *   currentUserRole: number  // 0=Owner, 1=Admin, 2=Editor, 3=Viewer
 * }
 */

/**
 * 角色枚举
 */
export const KbRole = {
  Owner: 0,
  Admin: 1,
  Editor: 2,
  Viewer: 3,
}

/**
 * 角色数字到字符串的映射
 */
const roleNumberToString = {
  0: 'Owner',
  1: 'Admin',
  2: 'Editor',
  3: 'Viewer',
}

/**
 * 角色字符串到中文的映射
 */
export const roleLabelMap = {
  Owner: '所有者',
  Admin: '管理员',
  Editor: '编辑者',
  Viewer: '查看者',
}

/**
 * 可见性枚举
 */
const VisibilityMap = {
  0: 'Private',    // 私有
  1: 'Internal',   // 内部
  2: 'Public',     // 公开
}

/**
 * 可见性中文映射
 */
const visibilityLabelMap = {
  Private: '私有',
  Internal: '内部',
  Public: '公开',
}

/**
 * 根据角色计算权限能力
 */
const calculateCapabilities = (role) => {
  const roleStr = typeof role === 'number' ? roleNumberToString[role] : role
  
  switch (roleStr) {
    case 'Owner':
      return {
        canView: true,
        canEdit: true,
        canCreateDoc: true,
        canDeleteDoc: true,
        canManageMembers: true,
        canManageBase: true,
      }
    case 'Admin':
      return {
        canView: true,
        canEdit: true,
        canCreateDoc: true,
        canDeleteDoc: true,
        canManageMembers: true,
        canManageBase: false,
      }
    case 'Editor':
      return {
        canView: true,
        canEdit: true,
        canCreateDoc: true,
        canDeleteDoc: false,
        canManageMembers: false,
        canManageBase: false,
      }
    case 'Viewer':
      return {
        canView: true,
        canEdit: false,
        canCreateDoc: false,
        canDeleteDoc: false,
        canManageMembers: false,
        canManageBase: false,
      }
    default:
      return {
        canView: false,
        canEdit: false,
        canCreateDoc: false,
        canDeleteDoc: false,
        canManageMembers: false,
        canManageBase: false,
      }
  }
}

/**
 * 适配知识库上下文数据
 * 
 * @param {Object} rawContext - 后端返回的原始数据
 * @returns {Object} 适配后的数据
 */
export const adaptKbContext = (rawContext) => {
  if (!rawContext) return null

  const { knowledgeBase, isMember, currentUserRole } = rawContext
  
  // 转换角色
  const roleStr = roleNumberToString[currentUserRole] ?? 'Viewer'
  
  // 转换可见性
  const visibilityStr = VisibilityMap[knowledgeBase.visibility] ?? 'Private'
  
  // 计算权限能力
  const capabilities = calculateCapabilities(currentUserRole)
  
  return {
    // 知识库基本信息
    knowledgeBase: {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      code: knowledgeBase.code,
      description: knowledgeBase.description,
      visibility: visibilityStr,
      visibilityLabel: visibilityLabelMap[visibilityStr],
      icon: knowledgeBase.icon,
      creationTime: knowledgeBase.creationTime,
      lastModificationTime: knowledgeBase.lastModificationTime,
      creatorId: knowledgeBase.creatorId,
    },
    
    // 成员信息
    membership: {
      isMember,
      role: roleStr,
      roleLabel: roleLabelMap[roleStr],
      roleNumber: currentUserRole,
    },
    
    // UI 权限能力
    uiCapabilities: capabilities,
    
    // UI 提示（如果有的话）
    uiHints: {
      readOnlyReason: !capabilities.canEdit ? '您没有编辑权限' : null,
    },
  }
}

/**
 * 获取角色标签
 */
export const getRoleLabel = (role) => {
  const roleStr = typeof role === 'number' ? roleNumberToString[role] : role
  return roleLabelMap[roleStr] ?? roleStr
}

/**
 * 获取可见性标签
 */
export const getVisibilityLabel = (visibility) => {
  const visibilityStr = typeof visibility === 'number' ? VisibilityMap[visibility] : visibility
  return visibilityLabelMap[visibilityStr] ?? visibilityStr
}

/**
 * 检查是否有权限
 */
export const hasPermission = (context, permission) => {
  return context?.uiCapabilities?.[permission] ?? false
}

export default {
  adaptKbContext,
  getRoleLabel,
  getVisibilityLabel,
  hasPermission,
  KbRole,
  roleLabelMap,
}

