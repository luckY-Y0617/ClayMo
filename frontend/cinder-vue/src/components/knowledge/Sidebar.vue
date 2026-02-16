<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">
        <div class="header-line">
          <el-button
            text
            class="back-button"
            @click="handleGoToOverview"
            :title="`返回 ${currentBaseName} 概览`"
          >
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <h3 
            class="base-name-link"
            :title="currentBaseName"
          >
            {{ currentBaseName }}
          </h3>
        </div>
      </div>
    </div>

    <div class="sidebar-content">
      <!-- 文档区域 -->
      <section class="sidebar-section documents-section">
        <DocumentTree
          :documents="filteredDocuments"
          :selected-key="selectedKey"
          :kb-id="currentBaseId"
          @select="handleDocSelect"
          @create="openCreateModal"
          @rename="openRenameModal"
          @delete="openDeleteModal"
          @request-move="handleRequestMove"
        />
      </section>

      <!-- 大纲区域 -->
      <section class="sidebar-section outline-section">
        <h4 class="section-title">大纲</h4>
        <div class="outline-content">
          <div v-if="headings.length === 0" class="empty-outline">
            <p>暂无标题</p>
          </div>
          <div v-else class="outline-tree">
            <OutlineItem
              v-for="heading in topLevelHeadings"
              :key="heading.id"
              :heading="heading"
              :all-headings="headings"
              :expanded-keys="expandedKeys"
              :active-id="activeHeadingId"
              :search-keyword="''"
              @toggle="handleToggle"
              @click="handleHeadingClick"
            />
          </div>
        </div>
      </section>
    </div>

    <CreateDocModal
      v-model="createModalVisible"
      :bases="bases"
      :parent-options="parentOptions"
      :templates="templates"
      :default-base-id="currentBaseId || undefined"
      :default-parent-id="createParentId || undefined"
      :submitting="creating"
      @submit="handleCreateSubmit"
    />
    <RenameDocModal
      v-model="renameState.visible"
      :original-title="renameState.title"
      :submitting="renaming"
      @submit="handleRenameSubmit"
    />
    <DeleteDocConfirm
      v-model="deleteState.visible"
      :title="deleteState.title"
      :has-children="deleteState.hasChildren"
      :submitting="deleting"
      @confirm="handleDeleteConfirm"
    />
    <!-- 移动文档弹窗（父组件控制） -->
    <MoveDocModal
      v-model="moveModalVisible"
      :documents="documents"
      :source-id="moveSourceId"
      :submitting="moveSubmitting"
      @submit="handleMoveSubmit"
      @cancel="handleMoveCancel"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useDocumentTreeStore } from '@/stores/documentTree'
import { useTeamStore } from '@/stores/team'
import { kbApi } from '@/api/kb.api'

import DocumentTree from './DocumentTree.vue'
import OutlineItem from './OutlineItem.vue'
import CreateDocModal from './modals/CreateDocModal.vue'
import RenameDocModal from './modals/RenameDocModal.vue'
import DeleteDocConfirm from './modals/DeleteDocConfirm.vue'
import MoveDocModal from './modals/MoveDocModal.vue'

const router = useRouter()
const route = useRoute()

const baseStore = useKnowledgeBaseStore()
const documentTreeStore = useDocumentTreeStore()
const teamStore = useTeamStore()

// 通过 inject 获取编辑器会话
const editorSession = inject('editorSession')

const currentBaseId = ref(null)
const searchKeyword = ref('')

// 大纲相关
const headings = ref([])
const expandedKeys = ref(new Set())
const activeHeadingId = ref(null)

const documents = computed(() => documentTreeStore.getDocuments(currentBaseId.value))
const selectedKey = computed(() => documentTreeStore.getSelectedKey(currentBaseId.value))
const bases = computed(() => baseStore.bases)

const currentBaseName = computed(() => {
  if (baseStore.currentBase?.name) return baseStore.currentBase.name
  const found = bases.value.find((b) => b.id === currentBaseId.value)
  return found?.name || '知识库编辑器'
})

const createModalVisible = ref(false)
const createParentId = ref(null)
const creating = ref(false)
const renaming = ref(false)
const deleting = ref(false)
const templates = ref([])

const renameState = reactive({
  visible: false,
  docId: '',
  title: '',
})

const deleteState = reactive({
  visible: false,
  docId: '',
  title: '',
  hasChildren: false,
})

// Move modal state (parent-controlled)
const moveModalVisible = ref(false)
const moveSubmitting = ref(false)
const moveSourceId = ref(null)
// NOTE: Move panel is now a centered modal; no alignment props required

const handleRequestMove = ({ id }) => {
  console.log('[Sidebar] request-move received', id)
  moveSourceId.value = id

  moveModalVisible.value = true
  console.log('[Sidebar] moveModalVisible set to', moveModalVisible.value)
}

const handleMoveCancel = () => {
  moveModalVisible.value = false
  moveSourceId.value = null
}

const handleMoveSubmit = async ({ parentId }) => {
  if (!currentBaseId.value || !moveSourceId.value) return
  moveSubmitting.value = true
  try {
    await kbApi.document.move(currentBaseId.value, moveSourceId.value, { parentId: parentId ?? null })
    ElMessage.success('移动成功')
    moveModalVisible.value = false
    moveSourceId.value = null
    await loadDocuments(currentBaseId.value)
  } catch (error) {
    console.error('移动文档失败', error)
    ElMessage.error(error?.message ?? '移动失败')
  } finally {
    moveSubmitting.value = false
  }
}

const parentOptions = computed(() => {
  const buildOptions = (nodes = []) =>
    nodes.map((node) => ({
      label: node.title,
      value: node.id,
      children: buildOptions(node.children || []),
    }))
  return buildOptions(documents.value)
})

// 过滤文档（简单搜索）
const filteredDocuments = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return documents.value
  }

  const filterTree = (nodes) =>
    nodes
      .map((node) => {
        const filteredChildren = node.children ? filterTree(node.children) : []
        const matches = node.title.toLowerCase().includes(keyword)

        if (matches || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
          }
        }
        return null
      })
      .filter(Boolean)

  return filterTree(documents.value)
})

// 加载知识库列表
const loadBases = async () => {
  try {
    const result = await kbApi.kb.list({
      filter: null,
      currentTeamId: teamStore.currentTeamId || null,
    })
    const list = result.list || []
    baseStore.setBases(list)

    // 如果路由已经给出了 baseId，设置当前知识库 ID
    if (currentBaseId.value) {
      baseStore.setCurrentBaseId(currentBaseId.value)
    }
  } catch (error) {
    console.error('加载知识库失败:', error)
  }
}

// 加载文档树
const loadDocuments = async (baseId) => {
  if (!baseId) return

  try {
    documentTreeStore.setLoading(baseId, true)
    const docs = await kbApi.document.getTree(baseId)
    documentTreeStore.setDocuments(baseId, docs)
  } catch (error) {
    console.error('加载文档树失败:', error)
  } finally {
    documentTreeStore.setLoading(baseId, false)
  }
}

// 选择文档
const handleDocSelect = (docId) => {
  if (!currentBaseId.value) return
  if (currentBaseId.value) {
    documentTreeStore.setSelectedKey(currentBaseId.value, docId)
  }
  router.push(`/kb/${currentBaseId.value}/edit/${docId}`)
}

// 返回知识库概览
const handleGoToOverview = () => {
  if (!currentBaseId.value) return
  router.push(`/kb/${currentBaseId.value}/overview`)
}

const openCreateModal = ({ parentId }) => {
  createParentId.value = parentId || null
  createModalVisible.value = true
}

// 公共标题校验
const ensureTitle = (title) => {
  const value = title?.trim()
  if (!value) {
    ElMessage.warning('请输入标题')
    return null
  }
  return value
}

const handleCreateSubmit = async ({ baseId, title, parentId, templateId }) => {
  const validTitle = ensureTitle(title)
  if (!validTitle) return
  
  const targetBase = baseId || currentBaseId.value
  if (!targetBase) {
    ElMessage.error('无法确定知识库')
    return
  }
  
  creating.value = true
  try {
    // 准备 initialContentJson（如果有模板）
    let initialContentJson = null
    if (templateId) {
      // 如果选择了模板，将模板ID转换为 initialContentJson
      initialContentJson = JSON.stringify({ templateId })
    }
    
    const newDoc = await kbApi.document.create(targetBase,{
      title: validTitle,
      parentId: (parentId ?? createParentId.value) || null,
      type: 'Normal',
      initialContentJson: initialContentJson,
    })

    await loadDocuments(targetBase)

    createModalVisible.value = false
    createParentId.value = null
    router.push(`/kb/${targetBase}/edit/${newDoc.id}`)
    ElMessage.success('文档创建成功')
  } catch (error) {
    console.error('创建文档失败:', error)
    ElMessage.error(error?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

const openRenameModal = ({ id, title }) => {
  renameState.docId = id
  renameState.title = title
  renameState.visible = true
}

const handleRenameSubmit = async ({ title }) => {
  const validTitle = ensureTitle(title)
  if (!validTitle || !renameState.docId) return

  renaming.value = true
  try {
    await kbApi.document.rename(currentBaseId.value, renameState.docId, { title: validTitle })
    await loadDocuments(currentBaseId.value)
    renameState.visible = false
    ElMessage.success('重命名成功')
  } catch (error) {
    console.error('重命名失败:', error)
    ElMessage.error('重命名失败')
  } finally {
    renaming.value = false
  }
}

const openDeleteModal = ({ id, title, hasChildren }) => {
  deleteState.docId = id
  deleteState.title = title
  deleteState.hasChildren = !!hasChildren
  deleteState.visible = true
}

const handleDeleteConfirm = async ({ includeChildren }) => {
  if (!deleteState.docId || !currentBaseId.value) return

  deleting.value = true
  try {
    await kbApi.document.delete(currentBaseId.value, deleteState.docId, includeChildren)
    await loadDocuments(currentBaseId.value)

    deleteState.visible = false

    if (selectedKey.value === deleteState.docId) {
      router.push(`/kb/${currentBaseId.value}/edit`)
    }

    ElMessage.success('文档已删除')
  } catch (error) {
    console.error('删除文档失败:', error)
    ElMessage.error('删除失败')
  } finally {
    deleting.value = false
  }
}

// 搜索处理（逻辑在 computed 里，这里占位避免报错）
const handleSearch = () => {}

/**
 * 提取文档标题用于大纲：
 * - 支持 H1 / H2 / H3 三个层级
 * - 如果文档正文中的第一个 H1 文本与 currentDocument.title 相同，则视为文档标题，不放入大纲
 */
const extractHeadings = () => {
  if (!editorSession.editor.value) {
    headings.value = []
    return
  }

  const editor = editorSession.editor.value
  const newHeadings = []
  const levelStack = []
  const docTitle = editorSession.currentDocument.value?.title?.trim() || ''
  let skippedFirstDocTitleH1 = false

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name.startsWith('heading')) {
      const level = node.attrs.level || 1

      // 只处理 H1 ~ H3，H4 及以后不进大纲
      if (level < 1 || level > 3) {
        return
      }

      const text = node.textContent.trim()
      const id = `heading-${pos}`

      // 如果是第一个 H1 且文本等于文档标题，则跳过，不放入大纲
      if (!skippedFirstDocTitleH1 && level === 1 && docTitle && text === docTitle) {
        skippedFirstDocTitleH1 = true
        return
      }

      // 通用层级关系：
      // - levelStack 保存的是“最近出现的各层级标题”
      // - 当前 heading 的父节点 = 栈中最后一个 level < 当前 level 的 heading
      while (levelStack.length && levelStack[levelStack.length - 1].level >= level) {
        levelStack.pop()
      }

      const parent = levelStack.length ? levelStack[levelStack.length - 1].id : null

      const heading = {
        id,
        level,  // 原始 heading level: 1 / 2 / 3
        text,
        pos,
        parentId: parent,
      }

      newHeadings.push(heading)
      levelStack.push({ id, level })
    }
  })

  headings.value = newHeadings
  updateActiveHeading()
}

// 获取顶级标题：没有 parentId 的就是顶级（兼容只有 H2 / 只有 H1 的情况）
const topLevelHeadings = computed(() => {
  return headings.value.filter(h => !h.parentId)
})

// 更新当前激活的标题（基于滚动位置）
const updateActiveHeading = () => {
  if (!editorSession.editor.value || headings.value.length === 0) {
    activeHeadingId.value = null
    return
  }

  const editor = editorSession.editor.value
  const editorElement = editor.view.dom.closest('.editor-content') || editor.view.dom
  const scrollTop = editorElement.scrollTop || 0
  const viewportTop = scrollTop + 100 // 视口顶部偏移，给一些缓冲
  
  let activeId = null
  let closestHeading = null
  let closestDistance = Infinity
  
  headings.value.forEach((heading) => {
    try {
      const coords = editor.view.coordsAtPos(heading.pos)
      if (coords) {
        const editorRect = editorElement.getBoundingClientRect()
        const headingTop = coords.top - editorRect.top + scrollTop
        
        if (headingTop <= viewportTop) {
          const distance = viewportTop - headingTop
          if (distance < closestDistance) {
            closestDistance = distance
            closestHeading = heading
          }
        }
      }
    } catch (e) {
      // ignore coords errors
    }
  })
  
  if (closestHeading) {
    activeId = closestHeading.id
  } else {
    const { selection } = editor.state
    const currentPos = selection.$anchor.pos
    for (let i = headings.value.length - 1; i >= 0; i--) {
      if (headings.value[i].pos <= currentPos) {
        activeId = headings.value[i].id
        break
      }
    }
  }

  activeHeadingId.value = activeId
}

// 展开/折叠
const handleToggle = (id) => {
  if (expandedKeys.value.has(id)) {
    expandedKeys.value.delete(id)
  } else {
    expandedKeys.value.add(id)
  }
}

// 点击标题跳转
const handleHeadingClick = (heading) => {
  if (!editorSession.editor.value) return

  const editor = editorSession.editor.value
  const { pos } = heading

  editor.commands.setTextSelection(pos)
  editor.commands.scrollIntoView()
  activeHeadingId.value = heading.id
}

// 监听编辑器内容变化
let updateTimer = null
const scheduleUpdate = () => {
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  updateTimer = setTimeout(() => {
    extractHeadings()
  }, 300)
}

// 监听滚动（用于高亮当前标题）
let scrollTimer = null
const handleScroll = () => {
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }
  scrollTimer = setTimeout(() => {
    updateActiveHeading()
  }, 100)
}

// 监听路由参数 baseId 变化
watch(
  () => route.params.baseId,
  (baseId) => {
    if (!baseId || typeof baseId !== 'string') return
    if (baseId === currentBaseId.value) return

    currentBaseId.value = baseId

    baseStore.setCurrentBaseId(baseId)
    loadDocuments(baseId)
  },
  { immediate: true }
)

// 监听编辑器更新
watch(() => editorSession.editor.value, (editor) => {
  if (editor) {
    editor.on('update', scheduleUpdate)
    editor.on('selectionUpdate', updateActiveHeading)
    extractHeadings()
  }
}, { immediate: true })

// 监听当前文档变化，刷新大纲
watch(() => editorSession.currentDocument.value, () => {
  if (editorSession.editor.value) {
    extractHeadings()
  }
})

onMounted(() => {
  loadBases()
  
  const editorContent = document.querySelector('.editor-content')
  if (editorContent) {
    editorContent.addEventListener('scroll', handleScroll)
  }
})

onBeforeUnmount(() => {
  if (updateTimer) clearTimeout(updateTimer)
  if (scrollTimer) clearTimeout(scrollTimer)
  
  const editorContent = document.querySelector('.editor-content')
  if (editorContent) {
    editorContent.removeEventListener('scroll', handleScroll)
  }
})
</script>

<style scoped>
/* 侧边栏容器 */
.sidebar {
  width: 280px;
  padding: 24px 20px;
  background: #FAFBFC;
  border-right: 1px solid #E8E8E8;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
  flex-shrink: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
}

/* 侧边栏头部 */
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E8E8E8;
}

.header-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.sidebar-title {
  flex: 1;
  min-width: 0;
}

.sidebar-title h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
}

.base-name-link {
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  transition: color 0.2s ease;
}

.base-name-link:hover {
  color: #666;
}

.back-button {
  padding: 0;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.back-button:hover {
  color: #1a1a1a;
  border-color: #1a1a1a;
  background: #F5F6F7;
  transform: translateX(-2px);
}

/* 侧边栏内容区域 */
.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0;
  margin-right: -6px;
  gap: 24px;
}

/* 自定义滚动条 */
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: #CCCCCC;
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: #999999;
}

/* Section 样式 */
.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 6px;
}

.section-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* 文档区域 - 主要内容 */
.documents-section {
  flex: 1;
  min-height: 0;
}

/* 大纲区域 - 简洁设计 */
.outline-section {
  flex-shrink: 0;
  padding-top: 20px;
  border-top: 1px solid #E8E8E8;
  background: transparent;
}

.outline-section .section-title {
  font-size: 0.75rem;
  color: #999;
  margin-bottom: 12px;
}

.outline-content {
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
}

/* 大纲内容滚动条 */
.outline-content::-webkit-scrollbar {
  width: 4px;
}

.outline-content::-webkit-scrollbar-track {
  background: transparent;
}

.outline-content::-webkit-scrollbar-thumb {
  background: #CCCCCC;
  border-radius: 2px;
}

.outline-content::-webkit-scrollbar-thumb:hover {
  background: #999999;
}

.empty-outline {
  padding: 20px 0;
  text-align: center;
}

.empty-outline p {
  margin: 0;
  font-size: 0.875rem;
  color: #999;
  line-height: 1.6;
}

.outline-tree {
  padding: 0;
}

/* 大纲项样式调整 - 现代化设计 */
.outline-section :deep(.outline-item) {
  font-size: 0.875rem;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.outline-section :deep(.outline-item:hover) {
  background: rgba(0, 0, 0, 0.03);
}

.outline-section :deep(.outline-item .item-text) {
  color: #666;
  font-size: 0.875rem;
  line-height: 1.5;
}

.outline-section :deep(.outline-item.active) {
  background: rgba(26, 26, 26, 0.06);
}

.outline-section :deep(.outline-item.active .item-text) {
  color: #1a1a1a;
  font-weight: 500;
}

.outline-section :deep(.outline-item.level-1 .item-text) {
  font-size: 0.875rem;
  font-weight: 500;
}

.outline-section :deep(.outline-item.level-2 .item-text) {
  font-size: 0.8125rem;
  font-weight: 400;
}

.outline-section :deep(.outline-item.level-3 .item-text),
.outline-section :deep(.outline-item.level-4 .item-text),
.outline-section :deep(.outline-item.level-5 .item-text),
.outline-section :deep(.outline-item.level-6 .item-text) {
  font-size: 0.75rem;
  color: #999;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .sidebar {
    width: 260px;
    padding: 20px 16px;
  }
}

@media (max-width: 992px) {
  .sidebar {
    width: 240px;
    padding: 16px 14px;
  }
  
  .sidebar-title h3 {
    font-size: 0.9375rem;
  }
  
  .back-button {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
  }
}
</style>
