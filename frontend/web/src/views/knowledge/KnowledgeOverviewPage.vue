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
      <aside class="kb-side-panel">
        <div class="kb-section">
          <div class="kb-section-header">
            <span class="kb-section-label">知识库</span>
            <button v-if="hasCreateKbPermission" class="kb-create-btn" @click="openCreateBaseModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <div class="kb-list">
            <div
              v-for="base in bases"
              :key="base.id"
              class="kb-item"
              :class="{ active: base.id === currentBaseId }"
              @click="handleBaseSelect(base.id)"
            >
              <div class="kb-item-icon">
                <span class="icon-emoji">{{ getIconEmoji(base.icon) }}</span>
              </div>
              <div class="kb-item-info">
                <div class="kb-item-name">{{ base.name }}</div>
                <div class="kb-item-meta">{{ formatNumber(base.stats?.docs ?? 0) }} 篇文档</div>
              </div>
              <svg
                v-if="base.id === currentBaseId"
                class="kb-check-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <div v-if="!bases.length && !pageLoading" class="kb-empty-list">
              <div class="empty-icon">📚</div>
              <p>暂无知识库</p>
              <button
                v-if="hasCreateKbPermission"
                class="kb-create-first-btn"
                @click="openCreateBaseModal"
              >
                创建知识库
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧内容区 -->
      <main class="kb-content-panel" v-loading="pageLoading">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, defineAsyncComponent } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { kbApi } from '@/api'
import type { KnowledgeBase, DocumentNode } from '@/api/modules/knowledge'
import { useKbWorkspaceStore, usePermissionStore, useTeamStore, useDocumentTreeStore } from '@/stores'
import { getIconEmoji } from '@/constants/kbIcons'
import TeamSwitcher from '@/components/common/TeamSwitcher.vue'
import DocumentTreeNode from '@/components/knowledge/DocumentTreeNode.vue'

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
const documentTreeStore = useDocumentTreeStore()

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
const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return String(num)
}

const loadBases = async () => {
  try {
    pageLoading.value = true
    const response = await kbApi.kb.list({ maxResultCount: 100 })
    
    // 兼容两种返回格式：{ items: [...] } 或直接数组
    if (Array.isArray(response)) {
      bases.value = response
    } else if (response && typeof response === 'object') {
      bases.value = response.items || []
    } else {
      bases.value = []
    }
    
    console.log('[KB] 加载知识库列表:', bases.value.length, '个')
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

const handleBaseSelect = (id: string) => {
  if (!id || id === currentBaseId.value) return
  router.push({ name: 'kb-overview', params: { baseId: id } })
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
    
    const newBase = await kbApi.kb.create(createData)
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
    })
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

// 打开移动文档弹窗
const openMoveDocModal = (doc: { id: string; title: string; parentId?: string }) => {
  moveDocInfo.value = {
    id: doc.id,
    title: doc.title,
    parentId: doc.parentId || '',
  }
  showMoveDocModal.value = true
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

// 监听路由参数
watch(
  () => route.params.baseId as string | undefined,
  async (baseId) => {
    if (!baseId || baseId === currentBaseId.value) return
    currentBaseId.value = baseId
    kbWorkspaceStore.setCurrentBaseId(baseId)
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
</style>

