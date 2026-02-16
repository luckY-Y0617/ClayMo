/**
 * 会话管理协调器
 * 
 * 职责：
 * - 统一协调登出/切租户/切团队时的状态清理
 * - 解耦各个 store 之间的依赖关系
 * - 提供清晰的清理顺序和错误处理
 * 
 * 设计原则：
 * - Auth Store 不应该知道其他业务 Store 的存在
 * - 各个 Store 只负责自己的 reset 方法
 * - Orchestrator 负责调用顺序和错误处理
 */

/**
 * 重置所有业务上下文（登出时调用）
 * 
 * 清理顺序：
 * 1. 权限上下文
 * 2. 知识库相关（上下文、文档树、标签等）
 * 3. 团队上下文
 * 4. 租户上下文
 */
export async function resetAllBusinessContext() {
  const errors = []

  try {
    // 1. 重置权限
    const { usePermissionStore } = await import('@/stores/permission')
    const permissionStore = usePermissionStore()
    permissionStore.reset()
  } catch (error) {
    console.error('[SessionOrchestrator] Failed to reset permission store:', error)
    errors.push({ store: 'permission', error })
  }

  try {
    // 2. 重置知识库上下文
    const { useKbContextStore } = await import('@/stores/kbContext')
    const kbContextStore = useKbContextStore()
    kbContextStore.reset()
  } catch (error) {
    console.error('[SessionOrchestrator] Failed to reset kb context store:', error)
    errors.push({ store: 'kbContext', error })
  }

  try {
    // 3. 重置文档树
    const { useDocumentTreeStore } = await import('@/stores/documentTree')
    const documentTreeStore = useDocumentTreeStore()
    documentTreeStore.reset()
  } catch (error) {
    console.error('[SessionOrchestrator] Failed to reset document tree store:', error)
    errors.push({ store: 'documentTree', error })
  }

  try {
    // 4. 重置标签
    const { useTagStore } = await import('@/stores/tag')
    const tagStore = useTagStore()
    tagStore.setTags([])
  } catch (error) {
    console.error('[SessionOrchestrator] Failed to reset tag store:', error)
    errors.push({ store: 'tag', error })
  }

  try {
    // 5. 重置团队
    const { useTeamStore } = await import('@/stores/team')
    const teamStore = useTeamStore()
    teamStore.reset()
  } catch (error) {
    console.error('[SessionOrchestrator] Failed to reset team store:', error)
    errors.push({ store: 'team', error })
  }

  try {
    // 6. 重置租户
    const { useTenantStore } = await import('@/stores/tenant')
    const tenantStore = useTenantStore()
    tenantStore.setTenant('')
  } catch (error) {
    console.error('[SessionOrchestrator] Failed to reset tenant store:', error)
    errors.push({ store: 'tenant', error })
  }

  // 如果有错误，记录但不抛出，避免阻塞登出流程
  if (errors.length > 0) {
    console.warn('[SessionOrchestrator] Some stores failed to reset:', errors)
  }

  return errors
}

/**
 * 重置知识库相关上下文（切换团队/租户时调用）
 * 
 * 清理范围：
 * - 知识库上下文
 * - 文档树
 * - 标签
 * 
 * 不清理：
 * - 权限（由权限系统单独管理）
 * - 团队/租户（由调用方管理）
 */
export async function resetKnowledgeContext() {
  const errors = []

  try {
    const { useKbContextStore } = await import('@/stores/kbContext')
    const kbContextStore = useKbContextStore()
    kbContextStore.reset()
  } catch (error) {
    console.error('[SessionOrchestrator] Failed to reset kb context:', error)
    errors.push({ store: 'kbContext', error })
  }

  try {
    const { useDocumentTreeStore } = await import('@/stores/documentTree')
    const documentTreeStore = useDocumentTreeStore()
    documentTreeStore.reset()
  } catch (error) {
    console.error('[SessionOrchestrator] Failed to reset document tree:', error)
    errors.push({ store: 'documentTree', error })
  }

  try {
    const { useTagStore } = await import('@/stores/tag')
    const tagStore = useTagStore()
    tagStore.setTags([])
  } catch (error) {
    console.error('[SessionOrchestrator] Failed to reset tags:', error)
    errors.push({ store: 'tag', error })
  }

  if (errors.length > 0) {
    console.warn('[SessionOrchestrator] Some KB stores failed to reset:', errors)
  }

  return errors
}

/**
 * 重置知识库列表（切换团队/租户时调用）
 */
export async function resetKnowledgeBaseList() {
  try {
    const { useKnowledgeBaseStore } = await import('@/stores/knowledgeBase')
    const kbStore = useKnowledgeBaseStore()
    kbStore.setBases([])
    kbStore.setCurrentBaseId(null)
  } catch (error) {
    console.error('[SessionOrchestrator] Failed to reset knowledge base list:', error)
  }
}

