<template>
  <div class="kb-overview-page">
    <!-- 顶部导航栏 -->
    <header class="kb-top-header">
      <div class="kb-header-left">
        <router-link to="/" class="kb-back-btn">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </router-link>
        <TeamSwitcher class="header-team-switcher" @change="handleTeamChange" />
        <div class="kb-header-divider"></div>
        <h1 class="kb-page-title">知识空间</h1>
      </div>

      <!-- 文档/管理 切换器 -->
      <div v-if="currentBase && canManageKb" class="kb-mode-switcher">
        <button
          class="kb-mode-tab"
          :class="{ active: viewMode === 'docs' }"
          @click="switchMode('docs')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>文档</span>
        </button>
        <button
          class="kb-mode-tab"
          :class="{ active: viewMode === 'manage' }"
          @click="switchMode('manage')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>管理</span>
        </button>
      </div>

      <div class="kb-header-right">
        <div class="kb-search-box">
          <svg class="kb-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" />
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" />
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            class="kb-search-input"
            placeholder="搜索文档..."
            @keyup.enter="handleSearch"
          />
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="kb-main-content">
      <!-- 左侧面板 -->
      <KnowledgeSidebar
        :view-mode="viewMode"
        :manage-tab="manageTab"
        :current-base-id="currentBaseId"
        :bases="bases"
        :can-manage-members="canManageMembers"
        :can-edit-kb="canEditKb"
        :can-create-kb="hasCreateKbPermission"
        :page-loading="pageLoading"
        @update:view-mode="viewMode = $event"
        @update:manage-tab="manageTab = $event"
        @create-base="openCreateBaseModal"
        @select-base="handleSelectBase"
      />

      <!-- 右侧内容区 -->
      <main class="kb-content-panel" v-loading="pageLoading">
        <!-- 文档模式内容 -->
        <template v-if="viewMode === 'docs'">
          <!-- 知识库信息头部 -->
          <div v-if="currentBase" class="kb-detail-header">
          <div class="kb-info">
            <div class="kb-main-icon">
              <span class="icon-emoji">{{ getIconEmoji(currentBase.icon) }}</span>
            </div>
            <div class="kb-details">
              <h2 class="kb-name">{{ currentBase.name }}</h2>
              <p class="kb-desc">{{ currentBase.description || '暂无描述' }}</p>
            </div>
          </div>
        </div>

        <!-- 统计卡片 -->
        <div v-if="currentBase" class="kb-stats-row">
          <div class="kb-stat-card">
            <div class="kb-stat-icon">📄</div>
            <div class="kb-stat-content">
              <div class="kb-stat-value">{{ totalDocCount }}</div>
              <div class="kb-stat-label">文档总数</div>
            </div>
          </div>
          <div class="kb-stat-card">
            <div class="kb-stat-icon">📅</div>
            <div class="kb-stat-content">
              <div class="kb-stat-value">{{ lastUpdateTime }}</div>
              <div class="kb-stat-label">最近更新</div>
            </div>
          </div>
        </div>

        <!-- 文档树区域 -->
        <div v-if="currentBase" class="kb-document-section">
          <div class="kb-section-header-bar">
            <h3 class="kb-section-title">文档结构</h3>
            <div class="kb-section-header-right">
              <span class="kb-doc-count">共 {{ totalDocCount }} 个文档</span>
              <button
                v-if="canCreateDoc && documentTree.length > 0"
                class="kb-add-doc-btn"
                @click="handleCreateDoc"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                新建文档
              </button>
            </div>
          </div>

          <div class="kb-document-content">
            <div v-if="!documentTree.length" class="kb-empty-docs">
              <div class="empty-icon">📝</div>
              <h4>还没有文档</h4>
              <p v-if="canCreateDoc">点击「新建文档」开始创建</p>
              <p v-else>暂无文档</p>
              <button v-if="canCreateDoc" class="kb-create-doc-btn" @click="handleCreateDoc">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                新建文档
              </button>
            </div>

            <div v-else class="kb-tree-wrapper">
              <DocumentTreeNode
                v-for="doc in documentTree"
                :key="doc.id"
                :node="doc"
                :selected-key="selectedDocId"
                :expanded-keys="expandedKeys"
                :kb-id="currentBaseId"
                :depth="0"
                @select="handleDocSelect"
              />
            </div>
          </div>
        </div>

        <!-- 未选择知识库 -->
        <div v-if="!currentBase && !pageLoading" class="kb-empty-docs">
          <div class="empty-icon">📚</div>
          <h4>请选择一个知识库</h4>
          <p>从左侧列表中选择知识库查看详情</p>
        </div>
        </template>

        <!-- 管理模式内容 -->
        <template v-else-if="viewMode === 'manage'">
          <!-- 管理概览 -->
          <div v-if="manageTab === 'overview'" class="kb-manage-content">
            <div class="kb-content-header">
              <h2 class="kb-content-title">概览</h2>
              <p class="kb-content-subtitle">查看知识库的基本信息</p>
            </div>

            <div class="kb-overview-grid">
              <div class="kb-overview-card">
                <div class="kb-card-icon">🔒</div>
                <div class="kb-card-content">
                  <div class="kb-card-label">可见性</div>
                  <div class="kb-card-value">{{ visibilityLabel }}</div>
                </div>
              </div>
              <div class="kb-overview-card">
                <div class="kb-card-icon">📅</div>
                <div class="kb-card-content">
                  <div class="kb-card-label">创建时间</div>
                  <div class="kb-card-value">{{ formatDate(kbContext?.knowledgeBase?.creationTime) }}</div>
                </div>
              </div>
              <div class="kb-overview-card">
                <div class="kb-card-icon">🔄</div>
                <div class="kb-card-content">
                  <div class="kb-card-label">最后更新</div>
                  <div class="kb-card-value">{{ formatDate(kbContext?.knowledgeBase?.lastModificationTime) }}</div>
                </div>
              </div>
              <div class="kb-overview-card">
                <div class="kb-card-icon">👤</div>
                <div class="kb-card-content">
                  <div class="kb-card-label">我的角色</div>
                  <div class="kb-card-value">{{ membershipRoleLabel }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 成员管理 -->
          <KnowledgeMembers
            v-else-if="manageTab === 'members'"
            :members="members"
            :members-loading="membersLoading"
            :can-manage-members="canManageMembers"
            :is-team-kb="isTeamKb"
            :current-base-id="currentBaseId"
            @add-member="openAddMember"
            @change-role="openRoleChangeModal"
            @remove-member="handleRemove"
          />

          <!-- 设置 -->
          <KnowledgeSettings
            v-else-if="manageTab === 'settings'"
            :settings="kbSettings"
            :loading="kbSettingsLoading"
            :saving="kbSettingsSaving"
            :base-name="currentBase?.name || ''"
            @update:settings="kbSettings = $event"
            @save="saveKbSettings"
          />
        </template>
      </main>
    </div>

    <!-- 创建知识库弹窗 -->
    <CreateBaseModal
      v-model="showCreateBaseModal"
      :submitting="createBaseSubmitting"
      @submit="handleCreateBaseSubmit"
    />

    <!-- 创建文档弹窗 -->
    <CreateDocModal
      v-model="showCreateDocModal"
      :parent-options="parentDocOptions"
      :default-base-id="currentBaseId"
      :submitting="createDocSubmitting"
      @submit="handleCreateDocSubmit"
    />

    <!-- 移动文档弹窗 -->
    <MoveDocModal
      ref="moveDocModalRef"
      v-model="showMoveDocModal"
      :doc-id="moveDocInfo.id"
      :doc-title="moveDocInfo.title"
      :current-kb-id="currentBaseId"
      :current-parent-id="moveDocInfo.parentId"
      :knowledge-bases="bases"
      :submitting="moveDocSubmitting"
      @load-tree="handleMoveDocLoadTree"
      @submit="handleMoveDocSubmit"
    />

    <!-- 添加成员弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="addMemberVisible" class="kb-modal-overlay" @click.self="addMemberVisible = false">
          <div class="kb-modal-container" :class="{ 'kb-modal-wide': isTeamKb }">
            <div class="kb-modal-header">
              <h3 class="kb-modal-title">添加成员</h3>
              <button class="kb-modal-close" @click="addMemberVisible = false">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>

            <div class="kb-modal-body">
              <!-- 团队知识库：从团队成员中选择 -->
              <template v-if="isTeamKb">
                <div class="kb-form-group">
                  <label class="kb-form-label">选择团队成员</label>
                  <p class="kb-form-hint">从团队成员中选择要添加到知识库的用户（可多选）</p>
                </div>

                <div v-if="teamMembersLoading" class="kb-team-members-loading">
                  <div class="kb-loading-spinner small"></div>
                  <span>加载团队成员中...</span>
                </div>

                <div v-else-if="teamMembers.length === 0" class="kb-team-members-empty">
                  <span>暂无可添加的团队成员</span>
                </div>

                <div v-else class="kb-team-members-list">
                  <div
                    v-for="member in teamMembers"
                    :key="member.userId"
                    class="kb-team-member-item"
                    :class="{ selected: isTeamMemberSelected(member) }"
                    @click="toggleTeamMemberSelect(member)"
                  >
                    <div class="kb-member-checkbox">
                      <svg v-if="isTeamMemberSelected(member)" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="kb-member-avatar small">{{ (member.username || 'U')[0].toUpperCase() }}</div>
                    <div class="kb-member-info">
                      <div class="kb-member-name">{{ member.username || '未知用户' }}</div>
                      <div class="kb-member-team-role">{{ getTeamRoleLabel(member.role) }}</div>
                    </div>
                  </div>
                </div>

                <div v-if="selectedTeamMembers.length > 0" class="kb-selected-count">
                  已选择 {{ selectedTeamMembers.length }} 位成员
                </div>

                <div class="kb-form-group">
                  <label class="kb-form-label">分配角色</label>
                  <div class="kb-form-select-wrapper">
                    <select v-model="addMemberRole" class="kb-form-select">
                      <option value="Owner">所有者 (Owner)</option>
                      <option value="Admin">管理员 (Admin)</option>
                      <option value="Editor">编辑者 (Editor)</option>
                      <option value="Viewer">查看者 (Viewer)</option>
                    </select>
                    <svg class="kb-select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
              </template>

              <!-- 非团队知识库：手动输入 -->
              <template v-else>
                <div class="kb-form-group">
                  <label class="kb-form-label">用户标识</label>
                  <input
                    v-model="addMemberForm.userId"
                    class="kb-form-input"
                    placeholder="输入用户ID或邮箱"
                  />
                </div>

                <div class="kb-form-group">
                  <label class="kb-form-label">角色</label>
                  <div class="kb-form-select-wrapper">
                    <select v-model="addMemberForm.role" class="kb-form-select">
                      <option value="Owner">所有者 (Owner)</option>
                      <option value="Admin">管理员 (Admin)</option>
                      <option value="Editor">编辑者 (Editor)</option>
                      <option value="Viewer">查看者 (Viewer)</option>
                    </select>
                    <svg class="kb-select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
              </template>
            </div>

            <div class="kb-modal-footer">
              <button class="kb-modal-btn secondary" @click="addMemberVisible = false">取消</button>
              <button
                class="kb-modal-btn primary"
                :disabled="addingMember || (isTeamKb && selectedTeamMembers.length === 0) || (!isTeamKb && !addMemberForm.userId)"
                @click="handleAddMember"
              >
                {{ addingMember ? '处理中...' : (isTeamKb ? `添加 ${selectedTeamMembers.length} 位成员` : '确定') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 修改角色弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="roleChangeVisible" class="kb-modal-overlay" @click.self="roleChangeVisible = false">
          <div class="kb-modal-container">
            <div class="kb-modal-header">
              <h3 class="kb-modal-title">修改角色</h3>
              <button class="kb-modal-close" @click="roleChangeVisible = false">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>

            <div class="kb-modal-body">
              <div class="kb-form-group">
                <label class="kb-form-label">成员</label>
                <div class="kb-role-change-member">
                  <div class="kb-member-avatar">{{ (roleChangeMember?.userName || 'U')[0].toUpperCase() }}</div>
                  <div class="kb-member-info">
                    <div class="kb-member-name">{{ roleChangeMember?.userName }}</div>
                    <div class="kb-member-email">{{ roleChangeMember?.userId }}</div>
                  </div>
                </div>
              </div>

              <div class="kb-form-group">
                <label class="kb-form-label">选择角色</label>
                <div class="kb-role-cards">
                  <div
                    v-for="role in roleOptions"
                    :key="role"
                    class="kb-role-card"
                    :class="{ active: selectedRole === role }"
                    @click="selectedRole = role"
                  >
                    <div class="kb-role-card-header">
                      <span class="kb-role-badge" :class="getRoleClass(role)">{{ getRoleLabel(role) }}</span>
                      <svg v-if="selectedRole === role" class="kb-role-check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="kb-role-card-desc">{{ getRoleDescription(role) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="kb-modal-footer">
              <button class="kb-modal-btn secondary" @click="roleChangeVisible = false">取消</button>
              <button
                class="kb-modal-btn primary"
                :disabled="roleChangeSubmitting"
                @click="handleRoleChange"
              >
                {{ roleChangeSubmitting ? '处理中...' : '确定' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, defineAsyncComponent } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { kbApi, KbMemberRole, KbVisibility } from '@/api'
import type { KnowledgeBase, DocumentNode, KbMember, KbUpdateInput } from '@/api/modules/knowledge'
import { useKbWorkspaceStore, usePermissionStore, useTeamStore } from '@/stores'
import { getIconEmoji } from '@/constants/kbIcons'
import TeamSwitcher from '@/components/common/TeamSwitcher.vue'
import DocumentTreeNode from '@/components/knowledge/DocumentTreeNode.vue'
import KnowledgeSidebar from '@/components/knowledge/KnowledgeSidebar.vue'
import KnowledgeMembers from '@/components/knowledge/KnowledgeMembers.vue'
import KnowledgeSettings from '@/components/knowledge/KnowledgeSettings.vue'

// 懒加载模态框组件 - 只在需要时才加载
const CreateBaseModal = defineAsyncComponent(
  () => import('@/components/knowledge/modals/CreateBaseModal.vue')
)
const CreateDocModal = defineAsyncComponent(
  () => import('@/components/knowledge/modals/CreateDocModal.vue')
)
const MoveDocModal = defineAsyncComponent(
  () => import('@/components/knowledge/modals/MoveDocModal.vue')
)

defineOptions({ name: 'KnowledgeOverviewPage' })

const props = defineProps<{
  baseId?: string
}>()

const router = useRouter()
const route = useRoute()
const kbWorkspaceStore = useKbWorkspaceStore()
const permissionStore = usePermissionStore()
const teamStore = useTeamStore()

// 状态
const bases = ref<KnowledgeBase[]>([])
const currentBaseId = ref<string>('')
const documentTree = ref<DocumentNode[]>([])
const expandedKeys = ref<string[]>([])
const selectedDocId = ref<string | null>(null)
const pageLoading = ref(false)
const searchKeyword = ref('')

// 弹窗状态
const showCreateBaseModal = ref(false)
const createBaseSubmitting = ref(false)
const showCreateDocModal = ref(false)
const createDocSubmitting = ref(false)
const showMoveDocModal = ref(false)
const moveDocSubmitting = ref(false)
const moveDocInfo = ref<{ id: string; title: string; parentId: string }>({
  id: '',
  title: '',
  parentId: '',
})
const moveDocModalRef = ref<InstanceType<typeof MoveDocModal> | null>(null)

// ========== 管理功能状态 ==========
// 视图模式：docs(文档) / manage(管理)
const viewMode = ref<'docs' | 'manage'>('docs')
const manageTab = ref<'overview' | 'members' | 'settings'>('overview')

// 知识库上下文（包含角色信息）
const kbContext = ref<any>(null)

// 成员管理
const members = ref<KbMember[]>([])
const membersLoading = ref(false)

// 添加成员弹窗
const addMemberVisible = ref(false)
const addingMember = ref(false)
const addMemberForm = ref({ userId: '', role: 'Viewer' })

// 修改角色弹窗
const roleChangeVisible = ref(false)
const roleChangeMember = ref<KbMember | null>(null)
const roleChangeSubmitting = ref(false)
const selectedRole = ref('Viewer')

// 团队成员选择相关
const teamMembers = ref<any[]>([])
const teamMembersLoading = ref(false)
const selectedTeamMembers = ref<any[]>([])
const addMemberRole = ref('Viewer')

// 设置相关状态
const kbSettings = ref<KbUpdateInput>({
  name: '',
  description: '',
  icon: '',
  visibility: KbVisibility.Private,
  allowMembersCreateDoc: false,
})
const kbSettingsLoading = ref(false)
const kbSettingsSaving = ref(false)

// 计算属性
const currentBase = computed(() => {
  return bases.value.find((b) => b.id === currentBaseId.value) || null
})

const hasCreateKbPermission = computed(() => {
  return permissionStore.hasGlobalPermission('kb.base.create')
})

const canCreateDoc = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canCreateDoc(currentBaseId.value)
})

// ========== 管理功能权限 ==========
// 是否有管理知识库的权限（创建者或管理员）
const canManageKb = computed(() => {
  if (!currentBaseId.value) return false
  const scoped = permissionStore.scopedCapabilities[`kb:${currentBaseId.value}`]
  if (!scoped) return false
  // Owner 或 Admin 可以管理
  return scoped.role === 0 || scoped.role === 1
})

// 是否有成员管理权限
const canManageMembers = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canManageKbMembers(currentBaseId.value)
})

// 是否可以编辑知识库（设置）
const canEditKb = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canEditKb(currentBaseId.value)
})

// 角色标签映射
const roleLabelMap: Record<string, string> = {
  Owner: '所有者',
  Admin: '管理员',
  Editor: '编辑者',
  Viewer: '查看者',
}

// 可见性标签映射
const visibilityLabelMap: Record<string, string> = {
  Private: '私密',
  Public: '公开',
  Team: '团队可见',
}

// 当前用户角色标签
const membershipRoleLabel = computed(() => {
  const role = kbContext.value?.membership?.role
  if (role === undefined || role === null) return '-'
  const roleStr = typeof role === 'number' ? KbMemberRole[role] : role
  return roleLabelMap[roleStr] || '-'
})

// 可见性标签
const visibilityLabel = computed(() => {
  const visibility = kbContext.value?.knowledgeBase?.visibility
  if (!visibility) return '-'
  return visibilityLabelMap[visibility] || String(visibility)
})

const getRoleLabel = (role: string | number) => {
  if (typeof role === 'number') {
    return KbMemberRole[role] ? roleLabelMap[KbMemberRole[role]] || String(role) : String(role)
  }
  return roleLabelMap[role] || role
}

const getRoleDescription = (role: string) => {
  const descMap: Record<string, string> = {
    Owner: '可以管理知识库的所有设置、成员和文档',
    Admin: '可以管理成员和文档，编辑知识库设置',
    Editor: '可以创建、编辑和移动文档',
    Viewer: '只能查看文档，无法编辑',
  }
  return descMap[role] || ''
}

const getRoleClass = (role: string | number) => {
  if (typeof role === 'number') {
    const classMap: Record<number, string> = {
      0: 'role-owner',
      1: 'role-admin',
      2: 'role-editor',
    }
    return classMap[role] || 'role-viewer'
  }
  const classMap: Record<string, string> = {
    Owner: 'role-owner',
    Admin: 'role-admin',
    Editor: 'role-editor',
    Viewer: 'role-viewer',
  }
  return classMap[role] || 'role-viewer'
}

// 角色选项
const roleOptions = ['Owner', 'Admin', 'Editor', 'Viewer']

// ========== 团队相关 ==========
// 当前知识库所属的团队ID
const currentKbTeamId = computed(() => {
  // 1. 优先从 context 中获取
  if (kbContext.value?.knowledgeBase?.teamId) {
    return kbContext.value.knowledgeBase.teamId
  }
  // 2. 从 bases 列表中查找
  if (currentBaseId.value && bases.value.length > 0) {
    const currentBase = bases.value.find(b => b.id === currentBaseId.value)
    if (currentBase?.teamId) {
      return currentBase.teamId
    }
  }
  return null
})

// 是否是团队知识库
const isTeamKb = computed(() => !!currentKbTeamId.value)

// 团队成员角色标签
const teamRoleLabelMap: Record<number, string> = {
  0: '所有者',
  1: '管理员',
  2: '成员',
}
const getTeamRoleLabel = (role: number) => teamRoleLabelMap[role] ?? '成员'

// ========== 修改角色 ==========
const openRoleChangeModal = (member: KbMember) => {
  roleChangeMember.value = member
  selectedRole.value = String(member.role)
  roleChangeVisible.value = true
}

const handleRoleChange = async () => {
  if (!roleChangeMember.value || !selectedRole.value) return

  roleChangeSubmitting.value = true
  try {
    await kbApi.members.changeRole(currentBaseId.value, roleChangeMember.value.userId, selectedRole.value)
    ElMessage.success('角色已更新')
    roleChangeVisible.value = false
    await loadMembers()
    await loadManageData()
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    const code = err?.code
    if (code === 'CannotDowngradeLastOwner') {
      ElMessage.error('无法降级最后一个 Owner')
    } else {
      ElMessage.error(err.message || '更新角色失败')
    }
  } finally {
    roleChangeSubmitting.value = false
  }
}

const totalDocCount = computed(() => {
  const countDocs = (nodes: DocumentNode[]): number => {
    let count = 0
    for (const node of nodes) {
      count++
      if (node.children && node.children.length > 0) {
        count += countDocs(node.children)
      }
    }
    return count
  }
  return documentTree.value ? countDocs(documentTree.value) : 0
})

const lastUpdateTime = computed(() => {
  return format(new Date(), 'MM月dd日', { locale: zhCN })
})

// 方法
const loadBases = async () => {
  try {
    pageLoading.value = true
    const teamId = teamStore.currentTeamId
    const response = await kbApi.kb.list({ maxResultCount: 100, teamId }) as unknown as { items: KnowledgeBase[]; totalCount: number }

    // 兼容两种返回格式：{ items: [...] } 或直接数组
    if (Array.isArray(response)) {
      bases.value = response
    } else if (response && typeof response === 'object') {
      bases.value = response.items || []
    } else {
      bases.value = []
    }
    
    console.log('[KB] 加载知识库列表:', bases.value.length, '个', 'teamId:', teamId)
    kbWorkspaceStore.setBases(bases.value)
  } catch (error: unknown) {
    const err = error as Error
    console.error('[KB] 加载知识库列表失败:', err)
    ElMessage.error(err.message || '加载知识库列表失败')
  } finally {
    pageLoading.value = false
  }
}

const loadDocumentTree = async (baseId: string) => {
  if (!baseId) return

  try {
    console.log('[KB] 加载文档树, baseId:', baseId)
    
    // 尝试加载上下文（设置权限），但不阻塞文档树加载
    try {
      await kbWorkspaceStore.loadContext(baseId, { force: false })
      console.log('[KB] 上下文加载成功')
    } catch (contextError) {
      console.warn('[KB] 上下文加载失败，继续尝试加载文档树:', contextError)
    }

    // 检查是否有权限查看（如果权限未设置，默认允许尝试加载）
    const canView = permissionStore.canViewKb(baseId)
    console.log('[KB] 权限检查, canViewKb:', canView)
    
    // 即使权限检查失败，也尝试加载文档树（后端会做权限控制）
    // 这样可以处理公开知识库等场景

    // 加载文档树
    const tree = await kbApi.document.getTree(baseId)
    console.log('[KB] 文档树数据:', tree)
    documentTree.value = Array.isArray(tree) ? tree : []
  } catch (error: unknown) {
    const err = error as Error
    console.error('[KB] 加载文档树失败:', err)
    
    // 根据错误类型判断是否显示无权限提示
    if (err.message?.includes('403') || err.message?.includes('权限') || err.message?.includes('Forbidden')) {
      ElMessage.warning('无权限查看该知识库')
    } else {
      ElMessage.error(err.message || '加载文档树失败')
    }
    documentTree.value = []
  }
}

const handleDocSelect = (docId: string) => {
  if (!docId || !currentBaseId.value) return
  selectedDocId.value = docId
  router.push(`/kb/${currentBaseId.value}/edit/${docId}`)
}

const handleCreateDoc = () => {
  if (!currentBaseId.value) return
  showCreateDocModal.value = true
}

const openCreateBaseModal = () => {
  showCreateBaseModal.value = true
}

// 创建知识库
const handleCreateBaseSubmit = async (payload: {
  name: string
  description: string
  icon: string
  visibility: number
  teamId?: string
}) => {
  try {
    createBaseSubmitting.value = true
    const createData: any = {
      name: payload.name,
      description: payload.description,
      icon: payload.icon,
      visibility: payload.visibility,
    }
    
    // 如果是团队可见，添加teamId
    if (payload.teamId) {
      createData.teamId = payload.teamId
    }
    
    const newBase = await kbApi.kb.create(createData) as unknown as KnowledgeBase
    ElMessage.success('知识库创建成功')
    showCreateBaseModal.value = false

    // 刷新列表并跳转
    await loadBases()
    if (newBase?.id) {
      router.push({ name: 'kb-overview', params: { baseId: newBase.id } })
    }
  } catch (error: unknown) {
    const err = error as Error
    ElMessage.error(err.message || '创建知识库失败')
  } finally {
    createBaseSubmitting.value = false
  }
}

// 创建文档
const handleCreateDocSubmit = async (payload: {
  baseId: string
  title: string
  parentId: string
}) => {
  try {
    createDocSubmitting.value = true
    const newDoc = await kbApi.document.create(currentBaseId.value, {
      title: payload.title,
      parentId: payload.parentId || undefined,
    }) as unknown as DocumentNode
    ElMessage.success('文档创建成功')
    showCreateDocModal.value = false

    // 刷新文档树并跳转到编辑
    await loadDocumentTree(currentBaseId.value)
    if (newDoc?.id) {
      router.push(`/kb/${currentBaseId.value}/edit/${newDoc.id}`)
    }
  } catch (error: unknown) {
    const err = error as Error
    ElMessage.error(err.message || '创建文档失败')
  } finally {
    createDocSubmitting.value = false
  }
}

// 移动文档弹窗加载树
const handleMoveDocLoadTree = async (kbId: string) => {
  try {
    const tree = await kbApi.document.getTree(kbId)
    moveDocModalRef.value?.setDocumentTree(Array.isArray(tree) ? tree : [])
  } catch (error) {
    console.error('加载移动目标树失败:', error)
    moveDocModalRef.value?.setDocumentTree([])
  }
}

// 提交移动文档
const handleMoveDocSubmit = async (payload: {
  targetKbId: string
  targetParentId: string | null
}) => {
  try {
    moveDocSubmitting.value = true
    await kbApi.document.move(currentBaseId.value, moveDocInfo.value.id, {
      targetKnowledgeBaseId: payload.targetKbId,
      targetParentId: payload.targetParentId || undefined,
    })
    ElMessage.success('文档移动成功')
    showMoveDocModal.value = false

    // 刷新文档树
    await loadDocumentTree(currentBaseId.value)
  } catch (error: unknown) {
    const err = error as Error
    ElMessage.error(err.message || '移动文档失败')
  } finally {
    moveDocSubmitting.value = false
  }
}

// 父文档选项（用于创建文档弹窗）
const parentDocOptions = computed(() => {
  const toOptions = (
    nodes: DocumentNode[]
  ): { label: string; value: string; children?: { label: string; value: string }[] }[] => {
    return nodes.map((node) => ({
      label: node.title,
      value: node.id,
      children: node.children && node.children.length > 0 ? toOptions(node.children) : undefined,
    }))
  }
  return toOptions(documentTree.value)
})

const handleTeamChange = async () => {
  await loadBases()
  // 如果当前知识库不在新列表中，跳转到第一个
  if (bases.value.length > 0) {
    const currentInList = bases.value.some((b) => b.id === currentBaseId.value)
    if (!currentInList) {
      router.replace({ name: 'kb-overview', params: { baseId: bases.value[0].id } })
    }
  } else {
    documentTree.value = []
  }
}

const handleSearch = () => {
  if (!searchKeyword.value.trim() || !currentBaseId.value) return
  ElMessage.info(`搜索功能开发中: "${searchKeyword.value}"`)
}

// 侧边栏选择知识库
const handleSelectBase = async (baseId: string) => {
  if (!baseId || baseId === currentBaseId.value) return
  // 跳转到对应的知识库路由
  router.push({ name: 'kb-overview', params: { baseId } })
}

// ========== 管理功能方法 ==========

// 切换视图模式
const switchMode = async (mode: 'docs' | 'manage') => {
  viewMode.value = mode
  if (mode === 'manage') {
    manageTab.value = 'overview'
    // 加载管理数据
    await loadManageData()
  }
}

// 加载管理数据（上下文）
const loadManageData = async () => {
  if (!currentBaseId.value) return
  try {
    kbContext.value = await kbWorkspaceStore.loadContext(currentBaseId.value, { force: true })
    // 如果在成员管理tab，加载成员
    if (manageTab.value === 'members' && canManageMembers.value) {
      await loadMembers()
    }
  } catch (error: unknown) {
    const err = error as Error
    ElMessage.error(err.message || '加载上下文失败')
  }
}

// 加载成员列表
const loadMembers = async () => {
  if (!currentBaseId.value) return
  membersLoading.value = true
  try {
    const res = await kbApi.members.list(currentBaseId.value) as unknown as { items: KbMember[] }
    members.value = res?.items ?? []
  } catch (error: unknown) {
    const err = error as Error
    ElMessage.error(err.message || '加载成员失败')
  } finally {
    membersLoading.value = false
  }
}

// 加载知识库设置
const loadKbSettings = async () => {
  if (!currentBaseId.value) return
  kbSettingsLoading.value = true
  try {
    const kb = currentBase.value
    if (kb) {
      kbSettings.value = {
        name: kb.name || '',
        description: kb.description || '',
        icon: kb.icon || '',
        visibility: (kb.visibility as KbVisibility) || KbVisibility.Private,
        allowMembersCreateDoc: kb.allowMembersCreateDoc ?? false,
      }
    }
  } catch (error: unknown) {
    const err = error as Error
    ElMessage.error(err.message || '加载设置失败')
  } finally {
    kbSettingsLoading.value = false
  }
}

// 保存知识库设置
const saveKbSettings = async () => {
  if (!currentBaseId.value) return
  kbSettingsSaving.value = true
  try {
    const updateData: KbUpdateInput = {
      name: kbSettings.value.name || '',
      description: kbSettings.value.description || '',
      icon: kbSettings.value.icon || '',
      visibility: kbSettings.value.visibility || KbVisibility.Private,
      allowMembersCreateDoc: kbSettings.value.allowMembersCreateDoc ?? false,
    }
    await kbApi.kb.update(currentBaseId.value, updateData)
    // 更新 currentBase
    if (currentBase.value) {
      currentBase.value.name = kbSettings.value.name || ''
      currentBase.value.description = kbSettings.value.description || ''
      currentBase.value.icon = kbSettings.value.icon || ''
      currentBase.value.visibility = kbSettings.value.visibility || KbVisibility.Private
      currentBase.value.allowMembersCreateDoc = kbSettings.value.allowMembersCreateDoc ?? false
    }
    ElMessage.success('保存成功')
  } catch (error: unknown) {
    const err = error as Error
    ElMessage.error(err.message || '保存失败')
  } finally {
    kbSettingsSaving.value = false
  }
}

// 打开添加成员弹窗
const openAddMember = async () => {
  addMemberForm.value = { userId: '', role: 'Viewer' }
  selectedTeamMembers.value = []
  addMemberRole.value = 'Viewer'
  addMemberVisible.value = true

  // 如果是团队知识库，加载团队成员
  if (currentKbTeamId.value) {
    await loadTeamMembers(currentKbTeamId.value)
  }
}

// 加载团队成员
const loadTeamMembers = async (teamId: string) => {
  if (!teamId) return
  teamMembersLoading.value = true
  try {
    // 需要调用 team API 获取团队成员，这里暂未实现
    // const res = await sysApi.team.getTeamMembers(teamId)
    // teamMembers.value = res || []
    teamMembers.value = []
  } catch (error) {
    console.error('加载团队成员失败:', error)
    teamMembers.value = []
  } finally {
    teamMembersLoading.value = false
  }
}

const toggleTeamMemberSelect = (member: any) => {
  const id = member.userId
  const idx = selectedTeamMembers.value.findIndex(m => m.userId === id)
  if (idx >= 0) {
    selectedTeamMembers.value.splice(idx, 1)
  } else {
    selectedTeamMembers.value.push(member)
  }
}

const isTeamMemberSelected = (member: any) => {
  return selectedTeamMembers.value.some(m => m.userId === member.userId)
}

// 添加成员
const handleAddMember = async () => {
  // 团队知识库：从选中的团队成员中添加
  if (currentKbTeamId.value && selectedTeamMembers.value.length > 0) {
    addingMember.value = true
    try {
      // 批量添加选中的成员
      const promises = selectedTeamMembers.value.map(member =>
        kbApi.members.addOrUpdate(currentBaseId.value, { userId: member.userId, role: addMemberRole.value })
      )
      await Promise.all(promises)
      ElMessage.success(`成功添加 ${selectedTeamMembers.value.length} 位成员`)
      addMemberVisible.value = false
      selectedTeamMembers.value = []
      await loadMembers()
      await loadManageData()
    } catch (error: unknown) {
      const err = error as { message?: string }
      ElMessage.error(err.message || '添加成员失败')
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
    await kbApi.members.addOrUpdate(currentBaseId.value, { userId, role })
    ElMessage.success('添加成功')
    addMemberVisible.value = false
    await loadMembers()
    await loadManageData()
  } catch (error: unknown) {
    const err = error as Error
    ElMessage.error(err.message || '添加成员失败')
  } finally {
    addingMember.value = false
  }
}

// 移除成员
const handleRemove = async (row: KbMember) => {
  try {
    await ElMessageBox.confirm(`确认移除成员 ${row.userName || row.userId} ?`, '确认移除')
    await kbApi.members.remove(currentBaseId.value, row.userId)
    ElMessage.success('已移除')
    await loadMembers()
    await loadManageData()
  } catch (error: unknown) {
    if (error === 'cancel') return
    const err = error as { code?: string; message?: string }
    const code = err?.code
    if (code === 'CannotRemoveLastOwner') {
      ElMessage.error('无法移除最后一个 Owner')
    } else {
      ElMessage.error(err.message || '移除失败')
    }
  }
}

// 格式化日期
const formatDate = (d?: string) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleString()
  } catch {
    return String(d)
  }
}

// 监听管理tab切换
watch(manageTab, async (tab) => {
  if (tab === 'members' && canManageMembers.value) {
    await loadMembers()
  }
  if (tab === 'settings' && canEditKb.value) {
    await loadKbSettings()
  }
})

// 监听路由参数
watch(
  () => route.params.baseId as string | undefined,
  async (baseId) => {
    if (!baseId || baseId === currentBaseId.value) return
    currentBaseId.value = baseId
    kbWorkspaceStore.setCurrentBaseId(baseId)
    viewMode.value = 'docs' // 切换知识库时重置为文档模式
    await loadDocumentTree(baseId)
  },
  { immediate: true }
)

// 初始化
onMounted(async () => {
  const baseId = route.params.baseId as string

  // 并行加载：知识库列表 + 文档树（如果有 baseId）
  const promises: Promise<unknown>[] = [loadBases()]

  if (baseId) {
    currentBaseId.value = baseId
    kbWorkspaceStore.setCurrentBaseId(baseId)
    promises.push(loadDocumentTree(baseId))
  }

  await Promise.all(promises)

  // 如果没有 baseId 但有知识库列表，默认选中第一个
  if (!baseId && bases.value.length > 0) {
    router.replace({ name: 'kb-overview', params: { baseId: bases.value[0].id } })
  }
})
</script>

<style lang="scss">
/* 样式通过 @/styles/components/knowledge.scss 全局导入 */

/* ===== 文档/管理 切换器 ===== */
.kb-mode-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin-right: 16px;
}

.kb-mode-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-mode-tab:hover {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.1);
}

.kb-mode-tab.active {
  background: #FFFFFF;
  color: #0f172a;
}

/* ===== 管理侧边栏 ===== */
.kb-manage-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 0;
}

.kb-manage-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kb-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-nav-item:hover {
  background: #F5F6F7;
  color: #1a1a1a;
}

.kb-nav-item.active {
  background: #0f172a;
  color: #FFFFFF;
}

.kb-section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
  margin: 16px 0;
}

.kb-back-to-docs-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: auto;
}

.kb-back-to-docs-btn:hover {
  background: #F5F6F7;
  border-color: #CCCCCC;
  color: #1a1a1a;
}

/* ===== 管理内容区域 ===== */
.kb-manage-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.kb-content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.kb-content-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: #1a1a1a;
}

.kb-content-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
}

.kb-overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.kb-overview-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.kb-overview-card:hover {
  border-color: #0f172a;
}

.kb-card-icon {
  font-size: 1.5rem;
}

.kb-card-content {
  flex: 1;
  min-width: 0;
}

.kb-card-label {
  font-size: 11px;
  font-weight: 500;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.kb-card-value {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.kb-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-action-btn.primary {
  background: #0f172a;
  color: #FFFFFF;
}

.kb-action-btn.primary:hover {
  background: #1e293b;
}

/* ===== 成员表格 ===== */
.kb-members-table-wrapper {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  overflow: visible;
}

.kb-members-table {
  width: 100%;
}

.kb-table-head {
  display: grid;
  grid-template-columns: 2.5fr 1.2fr 1.5fr 1fr;
  align-items: center;
  padding: 12px 16px;
  background: #0f172a;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kb-table-row {
  display: grid;
  grid-template-columns: 2.5fr 1.2fr 1.5fr 1fr;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #F0F0F0;
  transition: background 0.2s ease;
}

.kb-table-row:last-child {
  border-bottom: none;
}

.kb-table-row:hover {
  background: #FAFBFC;
}

.kb-col {
  padding: 0 6px;
}

.kb-col-member {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kb-member-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 600;
  border-radius: 50%;
}

.kb-member-info {
  min-width: 0;
}

.kb-member-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-member-email {
  font-size: 11px;
  color: #999;
}

.kb-col-time {
  font-size: 12px;
  color: #666;
}

/* 角色选择器 */
.kb-role-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-role-select:not(.disabled):hover {
  background: #F5F6F7;
  border-color: #E8E8E8;
}

.kb-role-select.disabled {
  cursor: default;
}

.kb-role-select.open {
  background: #F5F6F7;
  border-color: #E8E8E8;
}

.kb-role-arrow {
  transition: transform 0.2s ease;
}

.kb-role-select.open .kb-role-arrow {
  transform: rotate(180deg);
}

.kb-role-badge {
  display: inline-block;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
}

.kb-role-badge.small {
  padding: 2px 6px;
  font-size: 10px;
}

.kb-role-badge.role-owner {
  background: #FEF3C7;
  color: #92400E;
}

.kb-role-badge.role-admin {
  background: #DBEAFE;
  color: #1E40AF;
}

.kb-role-badge.role-editor {
  background: #D1FAE5;
  color: #065F46;
}

.kb-role-badge.role-viewer {
  background: #F3F4F6;
  color: #4B5563;
}

.kb-role-dropdown {
  position: absolute;
  left: 0;
  top: calc(100% + 4px);
  min-width: 140px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 4px;
  z-index: 3000;
}

.kb-role-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.kb-role-option:hover {
  background: #F5F6F7;
}

.kb-role-option.active {
  background: #F0F9FF;
}

.kb-role-option svg {
  color: #0f172a;
}

/* 移除按钮 */
.kb-remove-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  color: #dc3a3a;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-remove-btn:hover {
  background: #FEF2F2;
  border-color: #FECACA;
}

.kb-remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 加载状态 */
.kb-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  color: #999;
}

.kb-loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #E8E8E8;
  border-top-color: #0f172a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.kb-loading-state p {
  margin: 12px 0 0;
  font-size: 13px;
}

/* 空状态 */
.kb-empty-state {
  text-align: center;
  padding: 48px 32px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
}

/* ===== 模态框 ===== */
.kb-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.kb-modal-container {
  width: 440px;
  max-width: 92vw;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.kb-modal-header {
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #E8E8E8;
}

.kb-modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
}

.kb-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #999;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-modal-close:hover {
  color: #1a1a1a;
  background: #F5F6F7;
}

.kb-modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.kb-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kb-form-label {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
}

.kb-form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  font-size: 13px;
  color: #1a1a1a;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.kb-form-input:focus {
  outline: none;
  border-color: #0f172a;
}

.kb-form-input::placeholder {
  color: #CCCCCC;
}

.kb-form-select-wrapper {
  position: relative;
}

.kb-form-select {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 12px;
  font-size: 13px;
  color: #1a1a1a;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  appearance: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-form-select:focus {
  outline: none;
  border-color: #0f172a;
}

.kb-select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  pointer-events: none;
}

.kb-modal-footer {
  padding: 14px 20px 18px;
  border-top: 1px solid #E8E8E8;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.kb-modal-btn {
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-modal-btn.primary {
  background: #0f172a;
  color: #FFFFFF;
}

.kb-modal-btn.primary:hover {
  background: #1e293b;
}

.kb-modal-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.kb-modal-btn.secondary {
  background: #FFFFFF;
  color: #1a1a1a;
  border: 1px solid #E8E8E8;
}

.kb-modal-btn.secondary:hover {
  background: #F5F6F7;
}

/* 动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .kb-modal-container,
.modal-fade-leave-active .kb-modal-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .kb-modal-container,
.modal-fade-leave-to .kb-modal-container {
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

/* 宽模态框 */
.kb-modal-wide {
  width: 560px;
}

/* 表单提示 */
.kb-form-hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
}

/* 团队成员加载状态 */
.kb-team-members-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  justify-content: center;
  color: #666;
}

.kb-loading-spinner.small {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

/* 团队成员空状态 */
.kb-team-members-empty {
  padding: 32px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

/* 团队成员列表 */
.kb-team-members-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  margin-bottom: 16px;
}

.kb-team-member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #F0F0F0;
}

.kb-team-member-item:last-child {
  border-bottom: none;
}

.kb-team-member-item:hover {
  background: #F9FAFB;
}

.kb-team-member-item.selected {
  background: #F0F7FF;
}

.kb-team-member-item.selected:hover {
  background: #E5F0FF;
}

/* 成员复选框 */
.kb-member-checkbox {
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

.kb-team-member-item.selected .kb-member-checkbox {
  background: #0f172a;
  border-color: #0f172a;
  color: #FFFFFF;
}

/* 已选计数 */
.kb-selected-count {
  padding: 8px 0 16px;
  font-size: 13px;
  color: #0f172a;
  font-weight: 500;
}

/* 修改角色弹窗 */
.kb-role-change-member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F5F6F7;
  border-radius: 8px;
}

.kb-role-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kb-role-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: #FFFFFF;
  border: 2px solid #E8E8E8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.kb-role-card:hover {
  border-color: #CBD5E1;
}

.kb-role-card.active {
  background: #F0F7FF;
  border-color: #0f172a;
}

.kb-role-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kb-role-check-icon {
  color: #0f172a;
  flex-shrink: 0;
}

.kb-role-card-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.kb-role-card.active .kb-role-card-desc {
  color: #475569;
}

/* 操作按钮 */
.kb-action-text-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  color: #666;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.kb-action-text-btn:hover:not(:disabled) {
  background: #F5F6F7;
  border-color: #CCCCCC;
  color: #0f172a;
}

.kb-action-text-btn:disabled {
  color: #999;
  cursor: not-allowed;
  opacity: 0.5;
}

/* 小的操作按钮 */
.kb-action-btn-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  background: #F5F6F7;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  color: #666;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.kb-action-btn-small:hover:not(:disabled) {
  background: #E8E8E8;
  color: #0f172a;
}

.kb-action-btn-small:disabled {
  color: #CCC;
  cursor: not-allowed;
}

.kb-action-btn-small.danger {
  color: #dc3a3a;
}

.kb-action-btn-small.danger:hover:not(:disabled) {
  background: #FEF2F2;
  border-color: #FECACA;
  color: #dc3a3a;
}

/* 管理内容切换动画 */
.kb-manage-content {
  animation: fadeIn 0.2s ease;
}

/* 设置界面新样式 */
.kb-settings-wrapper {
  display: flex;
  gap: 24px;
  max-width: 900px;
}

/* 标签页导航 */
.kb-settings-tabs {
  flex-shrink: 0;
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kb-settings-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
  font-size: 14px;
}

.kb-settings-tab:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.kb-settings-tab.active {
  background: #eff6ff;
  color: #3b82f6;
  font-weight: 500;
}

.tab-icon {
  font-size: 16px;
}

/* 设置内容区 */
.kb-settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-panel {
  animation: fadeIn 0.2s ease;
}

/* 设置卡片 */
.settings-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.settings-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;
}

.settings-card-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 10px;
  font-size: 18px;
  flex-shrink: 0;
}

.danger-card .settings-card-icon {
  background: #fef2f2;
}

.danger-icon {
  color: #ef4444;
}

.settings-card-title h4 {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.settings-card-title p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.settings-card-body {
  padding: 20px;
}

/* 表单项 */
.form-item-group {
  margin-bottom: 20px;
}

.form-item-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}

.settings-input {
  width: 100%;
}

/* 图标选择器 */
.icon-picker-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.icon-preview-box {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
}

.preview-icon {
  font-size: 28px;
}

.icon-input {
  max-width: 200px;
}

.icon-suggestions {
  display: flex;
  gap: 8px;
}

.suggestion-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-icon:hover {
  background: #e2e8f0;
  transform: scale(1.1);
}

/* 可见性选项 */
.visibility-options {
  display: flex;
  gap: 12px;
}

.visibility-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.visibility-option:hover {
  border-color: #cbd5e1;
}

.visibility-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.visibility-icon {
  font-size: 24px;
}

.visibility-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.visibility-title {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
}

.visibility-desc {
  font-size: 12px;
  color: #64748b;
}

/* 权限开关 */
.permission-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-title {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
}

.toggle-desc {
  font-size: 12px;
  color: #64748b;
}

/* 危险操作 */
.danger-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
}

.danger-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.danger-title {
  font-size: 14px;
  font-weight: 500;
  color: #991b1b;
}

.danger-desc {
  font-size: 12px;
  color: #dc2626;
}

/* 保存按钮 */
.settings-footer {
  padding-top: 8px;
  display: flex;
  justify-content: flex-end;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

