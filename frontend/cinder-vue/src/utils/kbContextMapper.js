/**
 * 知识库上下文数据映射器
 * 
 * 职责：
 * - 规范化后端返回的知识库上下文数据
 * - 转换枚举值为可读字符串
 * - 推导 UI 能力提示（仅用于 UI 展示，不作为权限判断依据）
 */

/**
 * 根据角色推导 UI 能力提示
 * 注意：这些能力仅用于 UI 展示（如按钮禁用状态），
 * 实际权限判断必须以服务端响应为准
 */
function deriveUiCapabilities(role) {
  const defaults = {
    canView: true,
    canCreateDoc: false,
    canEditDoc: false,
    canDeleteDoc: false,
    canMoveDoc: false,
    canManageMembers: false,
    canManageBase: false,
    canDeleteBase: false,
  }

  if (role === 'Owner' || role === 'Admin') {
    return {
      ...defaults,
      canCreateDoc: true,
      canEditDoc: true,
      canDeleteDoc: true,
      canMoveDoc: true,
      canManageMembers: true,
      canManageBase: true,
      canDeleteBase: role === 'Owner',
    }
  }

  if (role === 'Editor') {
    return {
      ...defaults,
      canCreateDoc: true,
      canEditDoc: true,
      canMoveDoc: true,
    }
  }

  return defaults
}

/**
 * 规范化知识库上下文数据
 */
export function normalizeKbContext(raw) {
  if (!raw) return null

  // 转换角色枚举：0=Owner, 1=Admin, 2=Editor, 3=Viewer
  const roleEnum = ['Owner', 'Admin', 'Editor', 'Viewer']
  const role =
    typeof raw.currentUserRole === 'number'
      ? roleEnum[raw.currentUserRole] || null
      : raw.currentUserRole || null

  // 转换可见性枚举：0=私密, 1=团队, 2=公开
  const visibilityEnum = ['私密', '团队', '公开']
  let visibility = raw.knowledgeBase?.visibility
  if (typeof visibility === 'number' && visibility >= 0 && visibility <= 2) {
    visibility = visibilityEnum[visibility]
  }

  // 规范化知识库信息
  const knowledgeBase = raw.knowledgeBase
    ? {
        ...raw.knowledgeBase,
        visibility,
      }
    : null

  // 规范化成员信息
  const membership = raw.membership || {
    isMember: raw.isMember ?? false,
    role,
    isActive: true,
    joinedTime: raw.joinedTime || null,
  }

  // UI 能力提示：优先使用后端返回的 capabilities，否则根据角色推导
  const uiCapabilities = raw.capabilities || deriveUiCapabilities(role)

  return {
    knowledgeBase,
    membership,
    uiCapabilities, // ⚠️ 仅用于 UI 提示，不作为权限判断依据
    uiHints: raw.uiHints || {},
    // 保留原始数据（如果需要）
    _raw: raw,
  }
}

