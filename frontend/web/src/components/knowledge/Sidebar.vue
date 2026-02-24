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
          <h3 class="base-name-link" :title="currentBaseName">
            {{ currentBaseName }}
          </h3>
        </div>
      </div>
    </div>

    <div class="sidebar-content">
      <!-- 文档区域 -->
      <section class="sidebar-section documents-section">
        <DocumentTreeNode
          v-for="doc in documents"
          :key="doc.id"
          :node="doc"
          :selected-key="selectedKey"
          :expanded-keys="expandedKeys"
          :kb-id="currentBaseId || ''"
          :can-create="canCreateDoc"
          :can-delete="canDeleteDoc"
          :can-move="canMoveDoc"
          @select="handleDocSelect"
          @create="openCreateModal"
          @rename="openRenameModal"
          @delete="openDeleteModal"
        />
        
        <div v-if="!documents.length" class="empty-docs">
          <p>暂无文档</p>
          <el-button v-if="canCreateDoc" size="small" @click="openCreateModal({})">
            创建文档
          </el-button>
        </div>
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
              :expanded-keys="outlineExpandedKeys"
              :active-id="activeHeadingId"
              :search-keyword="''"
              @toggle="handleToggle"
              @click="handleHeadingClick"
            />
          </div>
        </div>
      </section>
    </div>

    <!-- 创建文档弹窗 -->
    <CreateDocModal
      v-model="createModalVisible"
      :default-base-id="currentBaseId || undefined"
      :default-parent-id="createParentId || undefined"
      :submitting="creating"
      @submit="handleCreateSubmit"
    />

    <!-- 右键菜单 -->
    <DocumentContextMenu
      v-if="!props.readonly"
      :model-value="contextMenu.visible"
      :items="menuItems"
      :position="{ x: contextMenu.x, y: contextMenu.y }"
      @update:modelValue="contextMenu.visible = $event"
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, reactive, watch, inject, defineAsyncComponent, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElButton, ElIcon } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import type { Editor } from '@tiptap/vue-3'

import { useKbWorkspaceStore } from '@/stores/kbWorkspace'
import { useDocumentTreeStore } from '@/stores/documentTree'
import { kbApi } from '@/api'

import DocumentTreeNode from './DocumentTreeNode.vue'
import DocumentContextMenu from './components/DocumentContextMenu.vue'
import OutlineItem from './OutlineItem.vue'

// 懒加载模态框
const CreateDocModal = defineAsyncComponent(
  () => import('./modals/CreateDocModal.vue')
)

import type { EditorDocument } from '@/types/editor'

interface DocumentNode {
  id: string
  title: string
  children?: DocumentNode[]
  order?: number
}

interface Heading {
  id: string
  level: number
  text: string
  pos: number
  parentId?: string | null
}

interface EditorSession {
  editor: Ref<Editor | null>
  currentDocument: Ref<EditorDocument | null>
}

interface Props {
  collapsed?: boolean
  canCreateDoc?: boolean
  canDeleteDoc?: boolean
  canMoveDoc?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  canCreateDoc: true,
  canDeleteDoc: true,
  canMoveDoc: true,
})

const router = useRouter()
const route = useRoute()

const kbWorkspaceStore = useKbWorkspaceStore()
const documentTreeStore = useDocumentTreeStore()

// 通过 inject 获取编辑器会话
const editorSession = inject<EditorSession>('editorSession')

const currentBaseId = ref<string | null>(null)

// 大纲相关
const headings = ref<Heading[]>([])
const outlineExpandedKeys = ref(new Set<string>())
const activeHeadingId = ref<string | null>(null)

const documents = computed<DocumentNode[]>(() => 
  documentTreeStore.getDocuments(currentBaseId.value) as DocumentNode[]
)
const selectedKey = computed(() => documentTreeStore.getSelectedKey(currentBaseId.value))
const expandedKeys = computed(() => currentBaseId.value ? documentTreeStore.getExpandedKeys(currentBaseId.value) : [])
const bases = computed(() => kbWorkspaceStore.bases)

const currentBaseName = computed(() => {
  if (kbWorkspaceStore.currentBase?.name) return kbWorkspaceStore.currentBase.name
  const found = bases.value.find((b) => b.id === currentBaseId.value)
  return found?.name || '知识库编辑器'
})

const createModalVisible = ref(false)
const createParentId = ref<string | null>(null)
const creating = ref(false)

// 右键菜单相关
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  node: null as DocumentNode | null,
})

interface MenuItem {
  key: string
  label: string
  shortcut?: string
  danger?: boolean
}

const menuItems = computed((): MenuItem[] => {
  const items: MenuItem[] = [
    { key: 'open', label: '打开文档', shortcut: 'Enter' },
  ]
  
  if (props.canCreateDoc) {
    items.push({ key: 'create', label: '新建子文档', shortcut: 'Ctrl+Enter' })
  }
  
  if (props.canMoveDoc) {
    items.push({ key: 'move', label: '移动到...' })
  }
  
  items.push({ key: 'rename', label: '重命名', shortcut: 'F2' })
  
  if (props.canDeleteDoc) {
    items.push({ key: 'delete', label: '删除', shortcut: 'Delete', danger: true })
  }
  
  return items
})

const openContextMenu = (event: MouseEvent, node: DocumentNode) => {
  contextMenu.visible = true
  contextMenu.x = event.pageX
  contextMenu.y = event.pageY
  contextMenu.node = node
}

const handleMenuSelect = (item: MenuItem) => {
  if (!contextMenu.node) return
  const node = contextMenu.node
  switch (item.key) {
    case 'open':
      handleDocSelect(node.id)
      break
    case 'create':
      openCreateModal({ parentId: node.id })
      break
    case 'rename':
      openRenameModal({ id: node.id, title: node.title })
      break
    case 'delete':
      openDeleteModal({
        id: node.id,
        title: node.title,
        hasChildren: Array.isArray(node.children) && node.children.length > 0,
      })
      break
    case 'move':
      ElMessage.info('移动功能待完善')
      break
  }
  contextMenu.visible = false
}

// 提供右键菜单函数给子组件
provide('openContextMenu', openContextMenu)

// 加载文档树
const loadDocuments = async (baseId: string) => {
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
const handleDocSelect = (docId: string) => {
  if (!currentBaseId.value) return
  documentTreeStore.setSelectedKey(currentBaseId.value, docId)
  router.push(`/kb/${currentBaseId.value}/edit/${docId}`)
}

// 返回知识库概览
const handleGoToOverview = () => {
  if (!currentBaseId.value) return
  router.push(`/kb/${currentBaseId.value}/overview`)
}

const openCreateModal = (opts: { parentId?: string }) => {
  createParentId.value = opts.parentId || null
  createModalVisible.value = true
}

const openRenameModal = (_opts: { id: string; title: string }) => {
  ElMessage.info('重命名功能待完善')
}

const openDeleteModal = (_opts: { id: string; title: string; hasChildren?: boolean }) => {
  ElMessage.info('删除功能待完善')
}

const handleCreateSubmit = async (data: { 
  baseId?: string
  title: string
  parentId?: string | null
}) => {
  const validTitle = data.title?.trim()
  if (!validTitle) {
    ElMessage.warning('请输入标题')
    return
  }
  
  const targetBase = data.baseId || currentBaseId.value
  if (!targetBase) {
    ElMessage.error('无法确定知识库')
    return
  }
  
  creating.value = true
  try {
    const newDoc = await kbApi.document.create(targetBase, {
      title: validTitle,
      parentId: data.parentId || createParentId.value || null,
      type: 'Normal',
    })

    await loadDocuments(targetBase)

    createModalVisible.value = false
    createParentId.value = null
    router.push(`/kb/${targetBase}/edit/${newDoc.id}`)
    ElMessage.success('文档创建成功')
  } catch (error) {
    console.error('创建文档失败:', error)
    ElMessage.error('创建失败')
  } finally {
    creating.value = false
  }
}

// 提取文档标题用于大纲
const extractHeadings = () => {
  if (!editorSession?.editor.value) {
    headings.value = []
    return
  }

  const editor = editorSession.editor.value
  const newHeadings: Heading[] = []
  const levelStack: { id: string; level: number }[] = []
  const docTitle = editorSession.currentDocument.value?.title?.trim() || ''
  let skippedFirstDocTitleH1 = false

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name.startsWith('heading')) {
      const level = (node.attrs.level as number) || 1

      if (level < 1 || level > 3) {
        return
      }

      const text = node.textContent.trim()
      const id = `heading-${pos}`

      if (!skippedFirstDocTitleH1 && level === 1 && docTitle && text === docTitle) {
        skippedFirstDocTitleH1 = true
        return
      }

      while (levelStack.length && levelStack[levelStack.length - 1].level >= level) {
        levelStack.pop()
      }

      const parent = levelStack.length ? levelStack[levelStack.length - 1].id : null

      const heading: Heading = {
        id,
        level,
        text,
        pos,
        parentId: parent,
      }

      newHeadings.push(heading)
      levelStack.push({ id, level })
    }
  })

  headings.value = newHeadings
}

// 获取顶级标题
const topLevelHeadings = computed(() => {
  return headings.value.filter(h => !h.parentId)
})

// 展开/折叠
const handleToggle = (id: string) => {
  if (outlineExpandedKeys.value.has(id)) {
    outlineExpandedKeys.value.delete(id)
  } else {
    outlineExpandedKeys.value.add(id)
  }
}

// 点击标题跳转
const handleHeadingClick = (heading: Heading) => {
  if (!editorSession?.editor.value) return

  const editor = editorSession.editor.value
  const { pos } = heading

  editor.commands.setTextSelection(pos)
  editor.commands.scrollIntoView()
  activeHeadingId.value = heading.id
}

// 监听路由参数 baseId 变化
watch(
  () => route.params.baseId,
  (baseId) => {
    if (!baseId || typeof baseId !== 'string') return
    if (baseId === currentBaseId.value) return

    currentBaseId.value = baseId

    kbWorkspaceStore.setCurrentBaseId(baseId)
    loadDocuments(baseId)
  },
  { immediate: true }
)

// 监听编辑器更新
let updateTimer: ReturnType<typeof setTimeout> | null = null
const scheduleUpdate = () => {
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  updateTimer = setTimeout(() => {
    extractHeadings()
  }, 300)
}

watch(() => editorSession?.editor.value, (editor) => {
  if (editor) {
    editor.on('update', scheduleUpdate)
    extractHeadings()
  }
}, { immediate: true })

// 监听当前文档变化，刷新大纲
watch(() => editorSession?.currentDocument.value, () => {
  if (editorSession?.editor.value) {
    extractHeadings()
  }
})

onMounted(() => {
  if (currentBaseId.value) {
    kbWorkspaceStore.setCurrentBaseId(currentBaseId.value)
  }
})

onBeforeUnmount(() => {
  if (updateTimer) clearTimeout(updateTimer)
})
</script>

<style scoped>
/* 侧边栏容器 */
.sidebar {
  width: 280px;
  padding: 24px 20px;
  background: linear-gradient(180deg, #FAFAFA 0%, #F5F6F7 100%);
  border-right: 1px solid #EBEBEB;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
  flex-shrink: 0;
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
  color: #555;
}

.back-button {
  padding: 0;
  width: 30px;
  height: 30px;
  min-width: 30px;
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  color: #8C8C8C;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.back-button:hover {
  color: #404040;
  border-color: #D9D9D9;
  background: #FFFFFF;
  transform: translateX(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
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
  background: #C8C8C8;
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
  font-size: 0.6875rem;
  font-weight: 600;
  color: #8C8C8C;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* 文档区域 */
.documents-section {
  flex: 1;
  min-height: 0;
}

.empty-docs {
  padding: 20px;
  text-align: center;
  color: #999;
}

.empty-docs p {
  margin: 0 0 12px;
  font-size: 13px;
}

/* 大纲区域 */
.outline-section {
  flex-shrink: 0;
  padding-top: 20px;
  border-top: 1px solid #E8E8E8;
  background: transparent;
}

.outline-section .section-title {
  font-size: 0.6875rem;
  color: #8C8C8C;
  margin-bottom: 12px;
  padding-left: 0;
  display: flex;
  align-items: center;
  gap: 0;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.outline-content {
  max-height: 300px;
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
  background: #D4D4D4;
  border-radius: 2px;
}

.outline-content::-webkit-scrollbar-thumb:hover {
  background: #ABABAB;
}

.empty-outline {
  padding: 20px 8px;
  text-align: center;
}

.empty-outline p {
  margin: 0;
  font-size: 0.8125rem;
  color: #BFBFBF;
  line-height: 1.5;
}

.outline-tree {
  padding: 0;
  margin-left: 0;
}

/* ======== 响应式设计 ======== */

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

/* 平板和手机 */
@media (max-width: 768px) {
  .sidebar {
    width: 280px;
    max-width: 80vw;
    height: 100%;
    padding: 16px 12px;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }
  
  .sidebar-header {
    padding-bottom: 12px;
  }

  .sidebar-title h3 {
    font-size: 0.875rem;
  }

  .back-button {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
  }

  /* 大纲区域在移动端隐藏，避免占用过多空间 */
  .outline-section {
    display: none;
  }

  /* 文档区域占据更多空间 */
  .documents-section {
    flex: 1;
  }
}

/* 中等手机 */
@media (max-width: 640px) {
  .sidebar {
    width: 260px;
    max-width: 75vw;
    padding: 14px 10px;
  }

  .sidebar-header {
    padding-bottom: 10px;
  }

  .sidebar-title h3 {
    font-size: 0.8125rem;
  }

  .back-button {
    width: 30px;
    height: 30px;
    min-width: 30px;
    min-height: 30px;
  }

  .sidebar-content {
    gap: 16px;
  }
}

/* 小屏手机 */
@media (max-width: 480px) {
  .sidebar {
    width: 240px;
    max-width: 70vw;
    padding: 12px 8px;
  }

  .sidebar-header {
    padding-bottom: 8px;
    gap: 8px;
  }

  .header-line {
    gap: 8px;
  }

  .sidebar-title h3 {
    font-size: 0.75rem;
  }

  .back-button {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
  }

  .sidebar-content {
    gap: 12px;
  }

  .section-title {
    font-size: 0.625rem;
  }
}
</style>

