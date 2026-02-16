import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { sysApi } from '@/api/sys.api'
import { resetKnowledgeContext } from '@/utils/sessionOrchestrator'

const STORAGE_KEY = 'team.currentTeamId'
const EMPTY_UUID = '00000000-0000-0000-0000-000000000000'

/**
 * 规范化 teamId：将全零 UUID 转换为 null（个人模式）
 * 这是业务规则，不是防御逻辑
 */
function normalizeTeamId(id) {
  if (id === null || id === undefined || id === '') {
    return null
  }
  if (typeof id === 'string' && id === EMPTY_UUID) {
    return null
  }
  return id
}

/**
 * 从 localStorage 读取 teamId（边界层：外部存储操作）
 */
function loadCurrentFromLocal() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) {
      return null
    }
    // 兼容旧数据格式：字符串 "null"、"undefined"、空串视为个人模式
    if (saved === 'null' || saved === 'undefined' || saved === '""' || saved === '') {
      return null
    }
    return normalizeTeamId(saved)
  } catch (error) {
    // localStorage 不可用是运行时环境问题，应该显式失败
    throw new Error(`Failed to load team context from localStorage: ${error.message}`, { cause: error })
  }
}

/**
 * 持久化 teamId 到 localStorage（边界层：外部存储操作）
 */
function persistCurrent(teamId) {
  try {
    if (teamId) {
      localStorage.setItem(STORAGE_KEY, teamId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    // localStorage 写入失败是运行时环境问题，应该显式失败
    throw new Error(`Failed to persist team context to localStorage: ${error.message}`, { cause: error })
  }
}

/**
 * 校验 API 返回的团队列表格式（业务层：数据格式校验）
 */
function validateTeamsResponse(response) {
  if (!response) {
    throw new Error('Teams API returned null or undefined')
  }
  
  // 明确支持两种格式：直接数组 或 { items: [] }
  if (Array.isArray(response)) {
    return response
  }
  
  if (typeof response === 'object' && Array.isArray(response.items)) {
    return response.items
  }
  
  throw new Error(`Invalid teams API response format: expected Array or { items: Array }, got ${typeof response}`)
}

export const useTeamStore = defineStore('team', () => {
  const teams = ref([])
  const currentTeamId = ref(loadCurrentFromLocal())
  const loaded = ref(false)

  const isTeamMode = computed(() => currentTeamId.value !== null)

  async function setCurrentTeam(id) {
    const normalizedId = normalizeTeamId(id)
    const oldValue = currentTeamId.value
    
    // 如果值相同，不需要更新
    if (oldValue === normalizedId) {
      return
    }
    
    // 更新值
    currentTeamId.value = normalizedId
    persistCurrent(normalizedId)
    
    // 切换团队时，通过 orchestrator 重置知识库相关缓存
    if (oldValue !== null && normalizedId !== oldValue) {
      await resetKnowledgeContext()
    }
  }

  async function loadMyTeams(force = false) {
    if (loaded.value && !force) {
      return
    }
    
    try {
      const response = await sysApi.team.getUserTeams()
      const teamsList = validateTeamsResponse(response)
      
      teams.value = teamsList
      loaded.value = true

      // 规范化当前 teamId（兼容旧数据中的全零 UUID）
      const normalizedTeamId = normalizeTeamId(currentTeamId.value)
      currentTeamId.value = normalizedTeamId
      
      // 如果本地记录的 teamId 不在列表中，清空（业务规则：团队已解散或用户已退出）
      if (normalizedTeamId && !teamsList.some((team) => team.id === normalizedTeamId)) {
        currentTeamId.value = null
      }

      persistCurrent(currentTeamId.value)
    } catch (error) {
      // API 调用失败时清理本地状态，避免保留无效数据
      reset()
      // 重新抛出错误，让调用方处理
      throw error
    }
  }

  function reset() {
    teams.value = []
    currentTeamId.value = null
    loaded.value = false
    try {
      persistCurrent(null)
    } catch (error) {
      // reset 时 localStorage 失败不应该阻止重置，但需要记录
      console.error('Failed to clear team context from localStorage during reset:', error)
    }
  }

  const currentTeam = computed(() => {
    if (!currentTeamId.value) {
      return null
    }
    // 兼容 team.id 和 team.teamId 两种字段名
    return teams.value.find((team) => (team.id || team.teamId) === currentTeamId.value) ?? null
  })

  // 团队成员角色枚举
  const TeamMemberRole = {
    Owner: 0,
    Admin: 1,
    Member: 2,
  }

  // 当前用户在当前团队的角色
  const currentTeamRole = computed(() => {
    return currentTeam.value?.role ?? null
  })

  // 当前用户是否是当前团队的管理员（Owner 或 Admin）
  const isTeamAdmin = computed(() => {
    const role = currentTeamRole.value
    return role === TeamMemberRole.Owner || role === TeamMemberRole.Admin
  })

  // 根据团队ID获取用户在该团队的角色
  function getTeamRole(teamId) {
    if (!teamId) return null
    const team = teams.value.find((t) => (t.id || t.teamId) === teamId)
    return team?.role ?? null
  }

  // 检查用户是否是指定团队的管理员
  function isTeamAdminById(teamId) {
    const role = getTeamRole(teamId)
    return role === TeamMemberRole.Owner || role === TeamMemberRole.Admin
  }

  return {
    teams,
    currentTeamId,
    currentTeam,
    currentTeamRole,
    isTeamMode,
    isTeamAdmin,
    loaded,
    loadMyTeams,
    setCurrentTeam,
    reset,
    TeamMemberRole,
    getTeamRole,
    isTeamAdminById,
  }
})
