<template>
  <div class="kb-settings-page">
    <!-- 顶部导航栏 -->
    <header class="top-header">
      <div class="header-left">
        <button class="back-btn" @click="goOverview">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="header-info">
          <span class="header-eyebrow">知识库设置</span>
          <h1 class="header-title">{{ context?.knowledgeBase?.name || '加载中...' }}</h1>
        </div>
        <span v-if="uiReadOnlyReason" class="header-badge">{{ uiReadOnlyReason }}</span>
      </div>
      
      <div class="header-right">
        <button class="header-btn primary" @click="goOverview">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          文档结构
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="main-content" v-loading="contextLoading">
      <!-- 左侧标签导航 -->
      <aside class="side-nav">
        <div class="nav-section">
          <h3 class="nav-title">管理</h3>
          <button 
            class="nav-item" 
            :class="{ active: activeTab === 'overview' }"
            @click="handleTabChange('overview')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>概览</span>
          </button>
          
          <button 
            v-if="caps.canManageMembers"
            class="nav-item" 
            :class="{ active: activeTab === 'members' }"
            @click="handleTabChange('members')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>成员管理</span>
          </button>
          
          <button 
            v-if="caps.canManageBase"
            class="nav-item" 
            :class="{ active: activeTab === 'settings' }"
            @click="handleTabChange('settings')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>设置</span>
          </button>
        </div>
      </aside>

      <!-- 右侧内容区 -->
      <main class="content-panel">
        <!-- 概览 -->
        <div v-if="activeTab === 'overview'" class="tab-content">
          <div class="content-header">
            <h2 class="content-title">概览</h2>
            <p class="content-subtitle">查看知识库的基本信息</p>
          </div>
          
          <div class="overview-grid">
            <div class="overview-card">
              <div class="card-icon">🔒</div>
              <div class="card-content">
                <div class="card-label">可见性</div>
                <div class="card-value">{{ visibilityLabel }}</div>
              </div>
            </div>
            <div class="overview-card">
              <div class="card-icon">📅</div>
              <div class="card-content">
                <div class="card-label">创建时间</div>
                <div class="card-value">{{ formatDate(context?.knowledgeBase?.creationTime) }}</div>
              </div>
            </div>
            <div class="overview-card">
              <div class="card-icon">🔄</div>
              <div class="card-content">
                <div class="card-label">最后更新</div>
                <div class="card-value">{{ formatDate(context?.knowledgeBase?.lastModificationTime) }}</div>
              </div>
            </div>
            <div class="overview-card">
              <div class="card-icon">👤</div>
              <div class="card-content">
                <div class="card-label">我的角色</div>
                <div class="card-value">{{ membershipRoleLabel }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 成员管理 -->
        <div v-else-if="activeTab === 'members'" class="tab-content">
          <div class="content-header">
            <div>
              <h2 class="content-title">成员管理</h2>
              <p class="content-subtitle">管理成员角色与权限</p>
            </div>
            <button 
              v-if="canAddMemberFromTeam" 
              class="header-btn primary" 
              @click="openAddMember"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              添加成员
            </button>
          </div>

          <div v-if="membersLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>成员加载中...</p>
          </div>

          <template v-else>
            <div v-if="members.length" class="members-table-wrapper">
              <div class="members-table">
                <div class="table-head">
                  <div class="col col-member">成员</div>
                  <div class="col col-role">角色</div>
                  <div class="col col-time">加入时间</div>
                  <div class="col col-actions">操作</div>
                </div>

                <div v-for="item in members" :key="item.id || item.userId" class="table-row">
                  <div class="col col-member">
                    <div class="member-avatar">{{ (item.userName || 'U')[0].toUpperCase() }}</div>
                    <div class="member-info">
                      <div class="member-name">{{ item.userName }}</div>
                      <div class="member-email">{{ item.userId }}</div>
                    </div>
                  </div>

                  <div class="col col-role">
                    <div 
                      class="role-select" 
                      :class="{ disabled: !caps.canManageMembers, open: isRoleDropdownOpen(item) }" 
                      @click="toggleRoleDropdown(item)"
                    >
                      <span class="role-badge" :class="getRoleClass(item.role)">{{ getRoleLabel(item.role) }}</span>
                      <svg v-if="caps.canManageMembers" class="role-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>

                      <Transition name="dropdown-fade">
                        <div v-if="isRoleDropdownOpen(item)" class="role-dropdown" @click.stop>
                          <button 
                            v-for="role in roleOptions" 
                            :key="role" 
                            class="role-option"
                            :class="{ active: role === item.role }" 
                            @click="handleSelectRole(item, role)"
                          >
                            <span class="role-badge small" :class="getRoleClass(role)">{{ getRoleLabel(role) }}</span>
                            <svg v-if="role === item.role" width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </Transition>
                    </div>
                  </div>

                  <div class="col col-time">
                    {{ formatDate(item.creationTime) }}
                  </div>

                  <div class="col col-actions">
                    <button class="action-btn danger" :disabled="!caps.canManageMembers" @click="handleRemove(item)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      移除
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="empty-state">
              <div class="empty-icon">👥</div>
              <h4>暂无成员</h4>
              <p>点击「添加成员」邀请团队成员</p>
            </div>
          </template>
        </div>

        <!-- 设置 -->
        <div v-else-if="activeTab === 'settings'" class="tab-content">
          <div class="content-header">
            <h2 class="content-title">设置</h2>
            <p class="content-subtitle">配置知识库的高级选项</p>
          </div>
          
          <div class="empty-state">
            <div class="empty-icon">⚙️</div>
            <h4>设置面板待补充</h4>
            <p>更多设置选项即将上线</p>
          </div>
        </div>
      </main>
    </div>

    <!-- 添加成员弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="addMemberVisible" class="modal-overlay" @click.self="addMemberVisible = false">
          <div class="modal-container" :class="{ 'modal-wide': currentKbTeamId }">
            <div class="modal-header">
              <h3 class="modal-title">添加成员</h3>
              <button class="modal-close" @click="addMemberVisible = false">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <!-- 团队知识库：从团队成员中选择 -->
              <template v-if="currentKbTeamId">
                <div class="form-group">
                  <label class="form-label">选择团队成员</label>
                  <p class="form-hint">从团队成员中选择要添加到知识库的用户（可多选）</p>
                </div>
                
                <div v-if="teamMembersLoading" class="team-members-loading">
                  <div class="loading-spinner small"></div>
                  <span>加载团队成员中...</span>
                </div>
                
                <div v-else-if="teamMembers.length === 0" class="team-members-empty">
                  <span>暂无可添加的团队成员</span>
                </div>
                
                <div v-else class="team-members-list">
                  <div 
                    v-for="member in teamMembers" 
                    :key="member.userId" 
                    class="team-member-item"
                    :class="{ selected: isTeamMemberSelected(member) }"
                    @click="toggleTeamMemberSelect(member)"
                  >
                    <div class="member-checkbox">
                      <svg v-if="isTeamMemberSelected(member)" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="member-avatar small">{{ (member.username || 'U')[0].toUpperCase() }}</div>
                    <div class="member-info">
                      <div class="member-name">{{ member.username || '未知用户' }}</div>
                      <div class="member-team-role">{{ getTeamRoleLabel(member.role) }}</div>
                    </div>
                  </div>
                </div>
                
                <div v-if="selectedTeamMembers.length > 0" class="selected-count">
                  已选择 {{ selectedTeamMembers.length }} 位成员
                </div>
                
                <div class="form-group">
                  <label class="form-label">分配角色</label>
                  <div class="form-select-wrapper">
                    <select v-model="addMemberRole" class="form-select">
                      <option value="Owner">所有者 (Owner)</option>
                      <option value="Admin">管理员 (Admin)</option>
                      <option value="Editor">编辑者 (Editor)</option>
                      <option value="Viewer">查看者 (Viewer)</option>
                    </select>
                    <svg class="select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
              </template>
              
              <!-- 非团队知识库：手动输入用户标识 -->
              <template v-else>
                <div class="form-group">
                  <label class="form-label">用户标识</label>
                  <input 
                    v-model="addMemberForm.userId" 
                    class="form-input" 
                    placeholder="输入用户ID或邮箱" 
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">角色</label>
                  <div class="form-select-wrapper">
                    <select v-model="addMemberForm.role" class="form-select">
                      <option value="Owner">所有者 (Owner)</option>
                      <option value="Admin">管理员 (Admin)</option>
                      <option value="Editor">编辑者 (Editor)</option>
                      <option value="Viewer">查看者 (Viewer)</option>
                    </select>
                    <svg class="select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
              </template>
            </div>

            <div class="modal-footer">
              <button class="modal-btn secondary" @click="addMemberVisible = false">取消</button>
              <button 
                class="modal-btn primary" 
                :disabled="addingMember || (currentKbTeamId && selectedTeamMembers.length === 0)" 
                @click="handleAddMember"
              >
                {{ addingMember ? '处理中...' : (currentKbTeamId ? `添加 ${selectedTeamMembers.length} 位成员` : '确定') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
defineOptions({ name: 'KnowledgeSettingsPage' })

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { kbApi } from '@/api/kb.api'
import { sysApi } from '@/api/sys.api'
import { useKbContextStore } from '@/stores/kbContext'
import { useTeamStore } from '@/stores/team'

const route = useRoute()
const router = useRouter()
const contextStore = useKbContextStore()
const teamStore = useTeamStore()

const currentKbId = ref(String(route.params.baseId || ''))
const activeTab = ref(String(route.query.tab || 'overview'))

const context = ref(null)
const contextLoading = ref(false)

const members = ref([])
const membersLoading = ref(false)

const addMemberVisible = ref(false)
const addingMember = ref(false)
const addMemberForm = ref({ userId: '', role: 'Viewer' })

// 团队成员选择相关
const teamMembers = ref([])
const teamMembersLoading = ref(false)
const selectedTeamMembers = ref([])
const addMemberRole = ref('Viewer')

const caps = computed(() => context.value?.uiCapabilities ?? {})
const membership = computed(() => context.value?.membership ?? {})
const uiReadOnlyReason = computed(() => context.value?.uiHints?.readOnlyReason ?? '')

// 当前知识库所属的团队ID（从 context 或 teamStore 获取）
const currentKbTeamId = computed(() => {
  // 优先从 context 中获取
  if (context.value?.knowledgeBase?.teamId) {
    return context.value.knowledgeBase.teamId
  }
  // 如果处于团队模式，使用当前团队 ID
  if (teamStore.isTeamMode && teamStore.currentTeamId) {
    return teamStore.currentTeamId
  }
  return null
})

// 用户是否有权限添加成员（从团队成员中选择）
// - 个人知识库 (teamId = null): 不支持，邀请功能后期开发
// - 团队知识库 (teamId 有值): 需要是团队的 Admin/Owner
const canAddMemberFromTeam = computed(() => {
  // 首先需要有知识库成员管理权限
  if (!caps.value.canManageMembers) return false
  
  const teamId = currentKbTeamId.value
  
  // 个人知识库：暂不支持添加成员（邀请功能待开发）
  if (!teamId) {
    return false
  }
  
  // 团队知识库：需要是团队的 Admin 或 Owner
  return teamStore.isTeamAdminById(teamId)
})

const roleLabelMap = {
  Owner: '所有者',
  Admin: '管理员',
  Editor: '编辑者',
  Viewer: '查看者',
}

const visibilityLabelMap = {
  'Private': '私密',
  'Public': '公开',
  'Team': '团队可见',
}

const membershipRoleLabel = computed(() => {
  const role = membership.value?.role
  return role ? (roleLabelMap[role] ?? role) : '-'
})

const visibilityLabel = computed(() => {
  const visibility = context.value?.knowledgeBase?.visibility
  return visibility ? (visibilityLabelMap[visibility] ?? visibility) : '-'
})

const roleOptions = ['Owner', 'Admin', 'Editor', 'Viewer']

const getRoleLabel = (role) => roleLabelMap[role] ?? role

// 团队成员角色标签（TeamMemberRole 枚举）
const teamRoleLabelMap = {
  0: '所有者',
  1: '管理员',
  2: '成员',
}
const getTeamRoleLabel = (role) => teamRoleLabelMap[role] ?? '成员'

const getRoleClass = (role) => {
  const classMap = {
    Owner: 'role-owner',
    Admin: 'role-admin',
    Editor: 'role-editor',
    Viewer: 'role-viewer',
  }
  return classMap[role] || 'role-viewer'
}
const openRoleUserId = ref(null)

const getUserKey = (user) => user?.id || user?.userId
const isRoleDropdownOpen = (user) => openRoleUserId.value === getUserKey(user)

const closeRoleDropdown = () => {
  openRoleUserId.value = null
}

const toggleRoleDropdown = (user) => {
  if (!caps.value.canManageMembers) return
  const key = getUserKey(user)
  openRoleUserId.value = openRoleUserId.value === key ? null : key
}

const handleSelectRole = (user, role) => {
  if (!caps.value.canManageMembers) return
  // 保持原体验：先更新 UI，再调用后端
  user.role = role
  closeRoleDropdown()
  handleChangeRole(user, role)
}

const handleDocumentClick = (e) => {
  if (!openRoleUserId.value) return
  const target = e.target
  if (!(target && target.closest && target.closest('.role-select'))) {
    closeRoleDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

const formatDate = (d) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return String(d)
  }
}

const goOverview = () => {
  if (!currentKbId.value) return
  router.push({ name: 'kb-overview', params: { baseId: currentKbId.value } })
}

async function loadMembers(kbId) {
  if (!kbId) return
  membersLoading.value = true
  try {
    const res = await kbApi.members.list(kbId)
    members.value = res?.items ?? []
  } catch (error) {
    ElMessage.error(error?.message ?? '加载成员失败')
  } finally {
    membersLoading.value = false
  }
}

async function loadMembersIfNeeded(kbId) {
  if (activeTab.value === 'members' && caps.value.canManageMembers) {
    await loadMembers(kbId)
  }
}

async function loadContext(kbId, { force = false } = {}) {
  if (!kbId) return
  currentKbId.value = kbId
  contextLoading.value = true
  try {
    context.value = await contextStore.loadContext(kbId, { force })

    if (!context.value?.uiCapabilities?.canView) {
      ElMessage.warning('无权限查看该知识库')
    }

    await loadMembersIfNeeded(kbId)
  } catch (error) {
    ElMessage.error(error?.message ?? '加载知识库上下文失败')
  } finally {
    contextLoading.value = false
  }
}

async function refreshContext(kbId) {
  contextStore.invalidateContext(kbId)
  await loadContext(kbId, { force: false })
}

function handleTabChange(name) {
  activeTab.value = name

  router.replace({
    name: 'kb-manage',
    params: { baseId: currentKbId.value },
    query: { tab: name },
  })

  if (name === 'members' && caps.value.canManageMembers) {
    loadMembers(currentKbId.value)
  }
}

async function openAddMember() {
  addMemberForm.value = { userId: '', role: 'Viewer' }
  selectedTeamMembers.value = []
  addMemberRole.value = 'Viewer'
  addMemberVisible.value = true
  
  // 如果是团队知识库，加载团队成员
  if (currentKbTeamId.value) {
    await loadTeamMembers(currentKbTeamId.value)
  }
}

async function loadTeamMembers(teamId) {
  if (!teamId) return
  teamMembersLoading.value = true
  try {
    const res = await sysApi.team.getTeamMembers(teamId)
    // res 可能是数组或 { items: [] }
    const list = Array.isArray(res) ? res : (res?.items ?? [])
    
    // 过滤掉已经是知识库成员的用户
    const existingMemberIds = new Set(members.value.map(m => m.userId))
    teamMembers.value = list.filter(tm => !existingMemberIds.has(tm.userId))
  } catch (error) {
    console.error('加载团队成员失败:', error)
    ElMessage.error('加载团队成员失败')
    teamMembers.value = []
  } finally {
    teamMembersLoading.value = false
  }
}

function toggleTeamMemberSelect(member) {
  const id = member.userId
  const idx = selectedTeamMembers.value.findIndex(m => m.userId === id)
  if (idx >= 0) {
    selectedTeamMembers.value.splice(idx, 1)
  } else {
    selectedTeamMembers.value.push(member)
  }
}

function isTeamMemberSelected(member) {
  return selectedTeamMembers.value.some(m => m.userId === member.userId)
}

async function handleAddMember() {
  const kbId = currentKbId.value
  
  // 团队知识库：从选中的团队成员中添加
  if (currentKbTeamId.value && selectedTeamMembers.value.length > 0) {
    addingMember.value = true
    try {
      // 批量添加选中的成员
      const promises = selectedTeamMembers.value.map(member => 
        kbApi.members.addOrUpdate(kbId, { userId: member.userId, role: addMemberRole.value })
      )
      await Promise.all(promises)
      ElMessage.success(`成功添加 ${selectedTeamMembers.value.length} 位成员`)
      addMemberVisible.value = false
      selectedTeamMembers.value = []

      await loadMembers(kbId)
      await refreshContext(kbId)
    } catch (error) {
      ElMessage.error(error?.message ?? '添加成员失败')
    } finally {
      addingMember.value = false
    }
    return
  }
  
  // 非团队知识库或手动输入：原逻辑
  const { userId, role } = addMemberForm.value

  if (!userId) {
    ElMessage.warning('请输入用户标识')
    return
  }

  addingMember.value = true
  try {
    await kbApi.members.addOrUpdate(kbId, { userId, role })
    ElMessage.success('添加成功')
    addMemberVisible.value = false

    await loadMembers(kbId)
    await refreshContext(kbId)
  } catch (error) {
    ElMessage.error(error?.message ?? '添加成员失败')
  } finally {
    addingMember.value = false
  }
}

async function handleChangeRole(row, newRole) {
  const kbId = currentKbId.value
  try {
    await kbApi.members.changeRole(kbId, row.userId, newRole)
    ElMessage.success('角色已更新')
    await refreshContext(kbId)
  } catch (error) {
    const code = error?.code
    if (code === 'CannotDowngradeLastOwner') {
      ElMessage.error('无法降级最后一个 Owner')
    } else {
      ElMessage.error(error?.message ?? '更新角色失败')
    }
  }
}

async function handleRemove(row) {
  const kbId = currentKbId.value
  try {
    await ElMessageBox.confirm(`确认移除成员 ${row.userName} ?`, '确认移除')
    await kbApi.members.remove(kbId, row.userId)
    ElMessage.success('已移除')

    await loadMembers(kbId)
    await refreshContext(kbId)
  } catch (error) {
    if (error === 'cancel') return

    const code = error?.response?.data?.code
    if (code === 'CannotRemoveLastOwner') {
      ElMessage.error('无法移除最后一个 Owner')
    } else {
      ElMessage.error(error?.message ?? '移除失败')
    }
  }
}

/** baseId 变化 -> 加载上下文（immediate 覆盖首次加载，避免重复 onMounted） */
watch(
  () => route.params.baseId,
  (kbId) => {
    const id = String(kbId || '')
    if (id) loadContext(id)
  },
  { immediate: true }
)

/** 外部改 query.tab -> 同步 UI（不改变 handleTabChange 的行为） */
watch(
  () => route.query.tab,
  (tab) => {
    const t = String(tab || 'overview')
    if (t !== activeTab.value) activeTab.value = t
  }
)
</script>



<style scoped>
/* 页面布局 */
.kb-settings-page {
  min-height: 100vh;
  background: #F5F6F7;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.top-header {
  background: #0f172a;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #FFFFFF;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(-2px);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-eyebrow {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #FFFFFF;
}

.header-badge {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 100px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.header-btn.primary {
  background: #FFFFFF;
  color: #0f172a;
}

.header-btn.primary:hover {
  background: #F0F0F0;
}

.header-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  gap: 0;
  overflow: hidden;
}

/* 左侧导航 */
.side-nav {
  width: 260px;
  flex-shrink: 0;
  background: #FFFFFF;
  border-right: 1px solid #E8E8E8;
  padding: 24px 16px;
  overflow-y: auto;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-title {
  margin: 0 0 12px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: #F5F6F7;
  color: #1a1a1a;
}

.nav-item.active {
  background: #0f172a;
  color: #FFFFFF;
}

.nav-item svg {
  flex-shrink: 0;
}

/* 右侧内容面板 */
.content-panel {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
}

.tab-content {
  max-width: 1000px;
}

.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 20px;
}

.content-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
}

.content-subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: #666;
}

/* 概览卡片网格 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.overview-card:hover {
  border-color: #0f172a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.card-icon {
  font-size: 1.75rem;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-label {
  font-size: 12px;
  font-weight: 500;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.card-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}

/* 成员表格 */
.members-table-wrapper {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  overflow: hidden;
}

.members-table {
  width: 100%;
}

.table-head {
  display: grid;
  grid-template-columns: 2.5fr 1.2fr 1.5fr 1fr;
  align-items: center;
  padding: 14px 20px;
  background: #0f172a;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-row {
  display: grid;
  grid-template-columns: 2.5fr 1.2fr 1.5fr 1fr;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #F0F0F0;
  transition: background 0.2s ease;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #FAFBFC;
}

.col {
  padding: 0 8px;
}

.col-member {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 600;
  border-radius: 50%;
}

.member-info {
  min-width: 0;
}

.member-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-email {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-time {
  font-size: 13px;
  color: #666;
}

/* 角色选择器 */
.role-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-select:not(.disabled):hover {
  background: #F5F6F7;
  border-color: #E8E8E8;
}

.role-select.disabled {
  cursor: default;
}

.role-select.open {
  background: #F5F6F7;
  border-color: #E8E8E8;
}

.role-arrow {
  transition: transform 0.2s ease;
}

.role-select.open .role-arrow {
  transform: rotate(180deg);
}

.role-badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 100px;
}

.role-badge.small {
  padding: 3px 8px;
  font-size: 11px;
}

.role-badge.role-owner {
  background: #FEF3C7;
  color: #92400E;
}

.role-badge.role-admin {
  background: #DBEAFE;
  color: #1E40AF;
}

.role-badge.role-editor {
  background: #D1FAE5;
  color: #065F46;
}

.role-badge.role-viewer {
  background: #F3F4F6;
  color: #4B5563;
}

.role-dropdown {
  position: absolute;
  left: 0;
  top: calc(100% + 6px);
  min-width: 160px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 100;
}

.role-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.role-option:hover {
  background: #F5F6F7;
}

.role-option.active {
  background: #F0F9FF;
}

.role-option svg {
  color: #0f172a;
}

/* 操作按钮 */
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.danger {
  color: #dc3a3a;
}

.action-btn.danger:hover {
  background: #FEF2F2;
  border-color: #FECACA;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  color: #999;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E8E8E8;
  border-top-color: #0f172a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  margin: 16px 0 0;
  font-size: 14px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 40px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.4;
}

.empty-state h4 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-container {
  width: 480px;
  max-width: 92vw;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #E8E8E8;
}

.modal-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1a1a1a;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #999;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  color: #1a1a1a;
  background: #F5F6F7;
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.form-input {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  font-size: 14px;
  color: #1a1a1a;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.05);
}

.form-input::placeholder {
  color: #CCCCCC;
}

.form-select-wrapper {
  position: relative;
}

.form-select {
  width: 100%;
  height: 42px;
  padding: 0 40px 0 14px;
  font-size: 14px;
  color: #1a1a1a;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-select:focus {
  outline: none;
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.05);
}

.select-arrow {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  pointer-events: none;
}

.modal-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid #E8E8E8;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-btn.primary {
  background: #0f172a;
  color: #FFFFFF;
}

.modal-btn.primary:hover {
  background: #1e293b;
}

.modal-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn.secondary {
  background: #FFFFFF;
  color: #1a1a1a;
  border: 1px solid #E8E8E8;
}

.modal-btn.secondary:hover {
  background: #F5F6F7;
  border-color: #CCCCCC;
}

/* 宽模态框（团队成员选择） */
.modal-container.modal-wide {
  width: 560px;
}

/* 表单提示 */
.form-hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
}

/* 团队成员加载状态 */
.team-members-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  justify-content: center;
  color: #666;
}

.loading-spinner.small {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

/* 团队成员空状态 */
.team-members-empty {
  padding: 32px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

/* 团队成员列表 */
.team-members-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  margin-bottom: 16px;
}

.team-member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #F0F0F0;
}

.team-member-item:last-child {
  border-bottom: none;
}

.team-member-item:hover {
  background: #F9FAFB;
}

.team-member-item.selected {
  background: #F0F7FF;
}

.team-member-item.selected:hover {
  background: #E5F0FF;
}

/* 成员复选框 */
.member-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #D1D5DB;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.team-member-item.selected .member-checkbox {
  background: #0f172a;
  border-color: #0f172a;
  color: #FFFFFF;
}

/* 成员头像（小） */
.member-avatar.small {
  width: 32px;
  height: 32px;
  font-size: 13px;
  flex-shrink: 0;
}

/* 成员团队角色标签 */
.member-team-role {
  font-size: 12px;
  color: #999;
}

/* 已选计数 */
.selected-count {
  padding: 8px 0 16px;
  font-size: 13px;
  color: #0f172a;
  font-weight: 500;
}

/* 动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 响应式 */
@media (max-width: 1200px) {
  .content-panel {
    padding: 24px 32px;
  }
}

@media (max-width: 992px) {
  .main-content {
    flex-direction: column;
  }
  
  .side-nav {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #E8E8E8;
    padding: 16px;
  }
  
  .nav-section {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .nav-title {
    display: none;
  }
  
  .nav-item {
    padding: 10px 16px;
  }
  
  .overview-grid {
    grid-template-columns: 1fr;
  }
  
  .table-head,
  .table-row {
    grid-template-columns: 2fr 1fr 1fr 0.8fr;
    font-size: 12px;
  }
}

@media (max-width: 768px) {
  .top-header {
    flex-wrap: wrap;
    gap: 12px;
    padding: 14px 20px;
  }
  
  .content-panel {
    padding: 20px 16px;
  }
  
  .content-header {
    flex-direction: column;
  }
  
  .table-head {
    display: none;
  }
  
  .table-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }
  
  .col {
    padding: 0;
  }
  
  .col-member {
    width: 100%;
  }
  
  .col-role,
  .col-time,
  .col-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .col-role::before {
    content: '角色:';
    font-size: 12px;
    color: #999;
  }
  
  .col-time::before {
    content: '加入时间:';
    font-size: 12px;
    color: #999;
  }
}

@media (max-width: 480px) {
  .top-header {
    padding: 12px 16px;
  }
  
  .header-title {
    font-size: 1rem;
  }
  
  .header-btn {
    padding: 8px 14px;
    font-size: 12px;
  }
}
</style>
