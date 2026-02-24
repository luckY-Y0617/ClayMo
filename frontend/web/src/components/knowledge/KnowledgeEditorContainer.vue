<template>
  <div class="knowledge-editor" :class="{ 'knowledge-editor--preview': isPreviewing }">
    <!-- 移动端遮罩层 -->
    <div 
      class="mobile-overlay"
      :class="{ 'visible': layout.mobileSidebarVisible }"
      @click="layout.mobileSidebarVisible = false"
    ></div>

    <div class="editor-layout">
      <!-- 侧边栏 -->
      <Sidebar
        class="sidebar-wrapper"
        :class="{ 'visible': layout.mobileSidebarVisible }"
        :collapsed="layout.sidebarCollapsed"
        :can-create-doc="canCreateDoc"
        :can-delete-doc="canDeleteDoc"
        :can-move-doc="canMoveDoc"
        @toggle-collapse="layout.sidebarCollapsed = !layout.sidebarCollapsed"
      />

      <!-- 移动端侧边栏切换按钮 -->
      <button 
        class="mobile-sidebar-toggle"
        @click="layout.mobileSidebarVisible = !layout.mobileSidebarVisible"
        :title="layout.mobileSidebarVisible ? '关闭侧边栏' : '打开侧边栏'"
      >
        <span class="toggle-icon">{{ layout.mobileSidebarVisible ? '✕' : '☰' }}</span>
      </button>

      <div class="main-area">
        <!-- 顶栏 -->
        <TopBar
          v-if="currentDocument"
          :document="currentDocument"
          :layout-mode="layout.mode"
          :is-read-only="isReadOnly"
          :save-status="editorSession.saveStatus.value"
          @mode-change="handleModeChange"
          @share="openShareDialog"
          @export="openExportDialog"
          @save-version="openSaveVersionModal"
          @version-history="openVersionHistory"
        />

        <div class="editor-and-comments">
          <div class="editor-container-wrapper">
            <transition name="page-transition" mode="out-in">
              <div class="editor-main" v-if="currentDocument" :key="currentDocument.id">
                <EditorCore
                  :document="currentDocument"
                  :comments="canViewComment ? comments : []"
                  :is-previewing="isPreviewing"
                  :can-view-comment="canViewComment"
                  :can-create-comment="canCreateComment"
                  @update="handleContentUpdate"
                  @open-document="handleOpenDocument"
                  @insert-document-card="handleInsertDocumentCard"
                  @add-comment="handleSelectionComment"
                  @add-comment-from-toolbar="handleAddComment"
                  @comment-click="handleCommentClick"
                  @comment-hover="handleCommentHover"
                  @open-comment-drawer="handleOpenCommentDrawer"
                  @editor-ready="handleEditorReady"
                />
              </div>
              <div v-else class="empty-state" key="empty">
                <el-empty description="请选择一个文档开始编辑" />
              </div>
            </transition>
          </div>
        </div>

        <!-- 评论侧栏 -->
        <CommentPanel
          v-if="currentDocument && !isPreviewing && canViewComment"
          v-model:visible="modals.commentDrawer"
          :comments="comments"
          :loading="commentLoading"
          :can-create-comment="canCreateComment"
          :can-delete-comment="canDeleteComment"
          :can-like-comment="canLikeComment"
          @submit="handleCommentSubmit"
          @refresh="handleCommentRefresh"
          @locate="handleCommentLocate"
          @reply="handleCommentReply"
          @like="handleCommentLike"
          @delete="handleCommentDelete"
          @hover="handleCommentPanelHover"
        />
      </div>
    </div>

    <!-- 保存版本弹窗 -->
    <SaveVersionModal
      v-model="modals.saveVersion"
      @submit="handleSaveVersion"
    />

    <!-- 版本历史弹窗 -->
    <VersionHistoryModal
      v-if="currentDocument && currentBaseId"
      v-model="modals.versionHistory"
      :can-restore="canRestoreVersion"
    />

    <!-- 文档搜索弹窗 -->
    <el-dialog
      v-model="modals.documentSearch"
      title="选择文档"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-input
        v-model="documentSearch.keyword"
        placeholder="搜索文档标题..."
        size="large"
        clearable
        @input="searchDocuments"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div class="document-search-results" v-loading="documentSearch.loading">
        <div
          v-for="doc in documentSearch.results"
          :key="doc.id"
          class="document-search-item"
          @click="handleSelectDocument(doc)"
        >
          <div class="document-search-item-icon">📄</div>
          <div class="document-search-item-body">
            <p class="document-search-item-title">{{ doc.title }}</p>
            <p class="document-search-item-meta" v-if="doc.summary">
              {{ doc.summary }}
            </p>
          </div>
        </div>
        <el-empty
          v-if="!documentSearch.loading && documentSearch.results.length === 0 && documentSearch.keyword"
          description="未找到匹配的文档"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, provide, nextTick, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElEmpty, ElDialog, ElInput, ElIcon } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import type { Editor } from '@tiptap/vue-3'

// Composables
import { useEditorSession } from '@/composables/useEditorSession'
import { useDocument } from '@/composables/useDocument'
import { useComments } from '@/composables/useComments'

// Store
import { useKbWorkspaceStore } from '@/stores/kbWorkspace'
import { usePermissionStore } from '@/stores/permission'

// API
import { kbApi } from '@/api'

// Components
import EditorCore from './editor/EditorCore.vue'
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
import CommentPanel from './editor/CommentPanel.vue'

// 懒加载模态框组件 - 只在用户触发时才加载
const SaveVersionModal = defineAsyncComponent(
  () => import('./modals/SaveVersionModal.vue')
)
const VersionHistoryModal = defineAsyncComponent(
  () => import('./modals/VersionHistoryModal.vue')
)

// Types
import type { Comment } from '@/types/editor'

interface DocumentSearchResult {
  id: string
  title: string
  summary?: string
  knowledgeBaseId?: string
}

interface DocumentSearchState {
  loading: boolean
  results: DocumentSearchResult[]
  keyword: string
  pendingAction: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor: any // TipTap Editor 类型与 Vue 内部类型存在冲突
    range: { from: number; to: number }
    type: 'card' | 'inline'
  } | null
}

interface ModalsState {
  share: boolean
  export: boolean
  saveVersion: boolean
  versionHistory: boolean
  manage: boolean
  documentSearch: boolean
  commentDrawer: boolean
}

interface LayoutState {
  sidebarCollapsed: boolean
  mode: 'write' | 'preview' | 'manage'
  mobileSidebarVisible: boolean
}

const route = useRoute()
const router = useRouter()

// 编辑器会话状态
const editorSession = useEditorSession()

// 通过 provide 共享给所有子组件
provide('editorSession', editorSession)

const kbWorkspaceStore = useKbWorkspaceStore()
const permissionStore = usePermissionStore()

// 当前知识库 ID
const currentBaseId = computed(() => 
  (route.params.baseId as string) || kbWorkspaceStore.currentBase?.id
)

// 通过 provide 共享
provide('baseId', currentBaseId)

// 权限相关计算属性
const isReadOnly = computed(() => {
  if (!currentBaseId.value) return true
  return !permissionStore.canEditDoc(currentBaseId.value)
})

const canViewComment = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canViewComment(currentBaseId.value)
})

const canCreateComment = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canCreateComment(currentBaseId.value)
})

const canDeleteComment = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canDeleteComment(currentBaseId.value)
})

const canLikeComment = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canLikeComment(currentBaseId.value)
})

const canRestoreVersion = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canRestoreVersion(currentBaseId.value)
})

const canCreateDoc = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canCreateDoc(currentBaseId.value)
})

const canDeleteDoc = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canDeleteDoc(currentBaseId.value)
})

const canMoveDoc = computed(() => {
  if (!currentBaseId.value) return false
  return permissionStore.canMoveDoc(currentBaseId.value)
})

// 使用 composables
const { currentDocument, loadDocument, saveContent } = useDocument(editorSession)

// 评论 composable
const {
  comments,
  loading: commentLoading,
  attachEditor,
  renderCommentMarks,
  jumpToComment,
  loadComments,
  createComment,
  deleteComment,
  toggleLike,
} = useComments()

// UI 状态
const modals = ref<ModalsState>({
  share: false,
  export: false,
  saveVersion: false,
  versionHistory: false,
  manage: false,
  documentSearch: false,
  commentDrawer: false,
})

const layout = ref<LayoutState>({
  sidebarCollapsed: false,
  mode: 'write',
  mobileSidebarVisible: false,
})

const isPreviewing = computed(() => layout.value.mode === 'preview' || isReadOnly.value)

// 文档搜索状态
const documentSearch = ref<DocumentSearchState>({
  loading: false,
  results: [],
  keyword: '',
  pendingAction: null,
})

// 加载文档
const loadDocumentWithComments = async (docId: string) => {
  if (!docId) return

  await loadDocument(docId)

  // 加载评论
  if (currentBaseId.value && canViewComment.value) {
    await loadComments(currentBaseId.value, docId)
    // 下一帧渲染评论标记
    await nextTick()
    renderCommentMarks()
  }
}

// 处理内容更新
const handleContentUpdate = async (payload: { json: object; html: string; plainText: string }) => {
  if (!currentDocument.value || !payload) return

  const { json, html, plainText } = payload
  await saveContent(currentDocument.value.id, {
    json,
    html,
    plainText,
    isAutoSave: true,
  })
}

// 路由监听
watch(
  () => ({ baseId: route.params.baseId, docId: route.params.docId }),
  async ({ baseId, docId }) => {
    if (typeof baseId === 'string') {
      kbWorkspaceStore.setCurrentBaseId(baseId)
      await kbWorkspaceStore.loadContext(baseId, { force: false })
    }

    if (typeof docId === 'string') {
      loadDocumentWithComments(docId)
    }
  },
  { immediate: true }
)

// 处理打开文档
const handleOpenDocument = (event: { docId: string }) => {
  const { docId } = event
  if (!docId || !currentBaseId.value) {
    console.warn('无法确定 baseId 或 docId，无法跳转')
    return
  }
  router.push(`/kb/${currentBaseId.value}/edit/${docId}`)
}

// 处理插入文档卡片
const handleInsertDocumentCard = (event: { editor: Editor; range: { from: number; to: number } }) => {
  const { editor, range } = event
  if (!editor) return

  documentSearch.value.pendingAction = { editor, range, type: 'card' }
  modals.value.documentSearch = true
  documentSearch.value.keyword = ''
  documentSearch.value.results = []
}

// 搜索文档（从文档树中过滤）
const searchDocuments = async (keyword: string) => {
  if (!keyword || keyword.trim().length === 0) {
    documentSearch.value.results = []
    return
  }

  if (!currentBaseId.value) {
    documentSearch.value.results = []
    return
  }

  documentSearch.value.loading = true
  try {
    // 使用文档树进行前端过滤搜索
    const treeResponse = await kbApi.document.getTree(currentBaseId.value)
    // http 客户端使用 unwrapData: true，实际返回的是 DocumentNode[]
    const tree = treeResponse as unknown as import('@/api/modules/knowledge').DocumentNode[]
    const searchKeyword = keyword.trim().toLowerCase()
    
    // 递归扁平化文档树并过滤
    type DocNode = import('@/api/modules/knowledge').DocumentNode
    const flattenAndFilter = (nodes: DocNode[]): DocumentSearchResult[] => {
      const results: DocumentSearchResult[] = []
      for (const node of nodes) {
        if (node.title.toLowerCase().includes(searchKeyword)) {
          results.push({
            id: node.id,
            title: node.title,
            knowledgeBaseId: node.knowledgeBaseId || currentBaseId.value,
          })
        }
        if (node.children && node.children.length > 0) {
          results.push(...flattenAndFilter(node.children))
        }
      }
      return results
    }
    
    documentSearch.value.results = flattenAndFilter(tree).slice(0, 20) // 限制结果数量
  } catch (error) {
    console.error('搜索文档失败:', error)
    documentSearch.value.results = []
  } finally {
    documentSearch.value.loading = false
  }
}

// 选择文档并插入
const handleSelectDocument = (doc: DocumentSearchResult) => {
  if (!doc || !documentSearch.value.pendingAction) return

  const { editor, range, type } = documentSearch.value.pendingAction

  if (type === 'card') {
    const knowledgeBaseId = doc.knowledgeBaseId || currentDocument.value?.knowledgeBaseId

    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: 'cardDocumentReference',
        attrs: {
          docId: doc.id,
          knowledgeBaseId,
        },
      })
      .run()
  }

  modals.value.documentSearch = false
  documentSearch.value.pendingAction = null
  documentSearch.value.keyword = ''
  documentSearch.value.results = []
}

// 模式切换
const handleModeChange = (mode: 'write' | 'preview') => {
  layout.value.mode = mode
}

// 打开分享弹窗
const openShareDialog = () => {
  modals.value.share = true
}

// 打开导出弹窗
const openExportDialog = () => {
  modals.value.export = true
}

// 打开保存版本弹窗
const openSaveVersionModal = () => {
  modals.value.saveVersion = true
}

// 打开版本历史
const openVersionHistory = () => {
  modals.value.versionHistory = true
}

// ============ 评论相关处理 ============

// 从编辑器选区添加评论
const handleSelectionComment = async (payload: { content: string; parentId?: string | null; position?: unknown }) => {
  if (!currentDocument.value || !currentBaseId.value) return
  if (!canCreateComment.value) {
    ElMessage.warning('您没有添加评论的权限')
    return
  }

  try {
    await createComment(currentBaseId.value, currentDocument.value.id, {
      content: payload.content,
      parentId: payload.parentId || null,
      position: payload.position as import('@/types/editor').CommentPosition | undefined,
    })
    // 消息由 useComments 统一处理，此处只做后续操作
    // 重新渲染评论标记
    await nextTick()
    renderCommentMarks()
  } catch (err) {
    console.error('创建评论失败:', err)
    // 错误消息由 useComments 统一处理
  }
}

// 打开评论抽屉
const handleOpenCommentDrawer = (commentId?: string) => {
  modals.value.commentDrawer = true
  if (commentId) {
    // 下一帧导航到指定评论
    nextTick(() => {
      jumpToComment(commentId)
    })
  }
}

// 点击评论标记
const handleCommentClick = (commentId: string) => {
  if (!commentId) return
  modals.value.commentDrawer = true
  nextTick(() => {
    jumpToComment(commentId)
  })
}

// 评论悬停预览
const handleCommentHover = (_payload: { commentId: string; preview: unknown }) => {
  // 可选：显示悬浮预览卡片
}

// 评论抽屉中提交评论 - CommentPanel 发出 submit: string
const handleCommentSubmit = async (text: string) => {
  if (!currentDocument.value || !currentBaseId.value) return
  try {
    await createComment(currentBaseId.value, currentDocument.value.id, {
      content: text,
      parentId: null,
    })
    // 消息由 useComments 统一处理
    await handleCommentRefresh()
  } catch (err) {
    console.error('创建评论失败:', err)
    // 错误消息由 useComments 统一处理
  }
}

// 刷新评论列表
const handleCommentRefresh = async () => {
  if (!currentDocument.value || !currentBaseId.value) return
  await loadComments(currentBaseId.value, currentDocument.value.id)
  await nextTick()
  renderCommentMarks()
}

// 定位到评论 - CommentPanel 发出 locate: Comment
const handleCommentLocate = (comment: Comment) => {
  jumpToComment(comment.id)
}

// 回复评论 - CommentPanel 发出 reply: Comment & { replyContent }
const handleCommentReply = async (comment: Comment & { replyContent?: string }) => {
  if (!currentDocument.value || !currentBaseId.value) return
  const replyContent = comment.replyContent
  if (!replyContent) return
  try {
    await createComment(currentBaseId.value, currentDocument.value.id, {
      content: replyContent,
      parentId: comment.id,
    })
    ElMessage.success('回复已添加')
    await handleCommentRefresh()
  } catch (err) {
    console.error('回复失败:', err)
    ElMessage.error('回复失败')
  }
}

// 点赞评论 - CommentPanel 发出 like: Comment
const handleCommentLike = async (comment: Comment) => {
  if (!currentDocument.value || !currentBaseId.value) return
  try {
    await toggleLike(currentBaseId.value, currentDocument.value.id, comment.id)
  } catch (err) {
    console.error('点赞失败:', err)
  }
}

// 删除评论 - CommentPanel 发出 delete: Comment
const handleCommentDelete = async (comment: Comment) => {
  if (!currentDocument.value || !currentBaseId.value) return
  if (!canDeleteComment.value) {
    ElMessage.warning('您没有删除评论的权限')
    return
  }
  try {
    await deleteComment(currentBaseId.value, currentDocument.value.id, comment.id)
    // 消息由 useComments 统一处理
    await handleCommentRefresh()
  } catch (err) {
    console.error('删除评论失败:', err)
    // 错误消息由 useComments 统一处理
  }
}

// 评论面板悬停 - CommentPanel 发出 hover: Comment | null
const handleCommentPanelHover = (comment: Comment | null) => {
  // 可选：高亮对应的评论标记
  if (comment) {
    // 可以在编辑器中高亮对应范围
  }
}

// ============ 版本相关处理 ============

// 保存版本 - SaveVersionModal 发出 submit: { changeSummary: string | null }
const handleSaveVersion = async (payload: { changeSummary: string | null }) => {
  if (!currentDocument.value || !currentBaseId.value) return

  try {
    // 先保存当前内容
    const editor = editorSession.editor.value
    if (editor) {
      const json = editor.getJSON()
      const html = editor.getHTML()
      const plainText = editor.getText()
      await saveContent(currentDocument.value.id, { json, html, plainText })
    }

    // 创建版本
    await kbApi.document.version.save(
      currentBaseId.value,
      currentDocument.value.id,
      { description: payload.changeSummary || undefined }
    )
    ElMessage.success('版本已保存')
    modals.value.saveVersion = false
  } catch (err) {
    console.error('保存版本失败:', err)
    ElMessage.error('保存版本失败')
  }
}

// ============ Editor 初始化回调 ============

// 当编辑器实例就绪时注入到 useComments
const handleEditorReady = (editor: Editor) => {
  attachEditor(editor)
  // 如果已有评论数据，渲染标记
  if (comments.value.length > 0) {
    nextTick(() => {
      renderCommentMarks()
    })
  }
}
</script>

<style scoped>
.knowledge-editor {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F7F7F7;
  overflow: hidden;
}

.editor-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  background: #F7F7F7;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  box-shadow: -1px 0 0 0 #EBEBEB;
}

.editor-and-comments {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  min-height: 0;
}

.editor-container-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  width: 100%;
}

.editor-main {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  animation: fadeInUp 0.2s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.document-search-results {
  margin-top: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.document-search-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.document-search-item:hover {
  background: rgba(22, 93, 255, 0.08);
  transform: translateX(2px);
}

.document-search-item:active {
  transform: translateX(0);
}

.document-search-item-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(22, 93, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.document-search-item-body {
  flex: 1;
  overflow: hidden;
}

.document-search-item-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-search-item-meta {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 预览模式样式 */
.knowledge-editor--preview .editor-main {
  padding: 32px 0;
  align-items: center;
}

/* 页面切换动画 */
.page-transition-enter-active,
.page-transition-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-transition-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-transition-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ======== 移动端遮罩层和切换按钮 ======== */

.mobile-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.mobile-sidebar-toggle {
  display: none;
  position: fixed;
  bottom: 24px;
  left: 16px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #FFFFFF;
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  z-index: 998;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  align-items: center;
  justify-content: center;
}

.mobile-sidebar-toggle:active {
  transform: scale(0.92);
}

.mobile-sidebar-toggle:hover {
  background: #FFFFFF;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  transform: translateY(-2px);
  border-color: rgba(0, 0, 0, 0.15);
}

.toggle-icon {
  font-size: 20px;
  line-height: 1;
  display: block;
  font-weight: 400;
}

/* ======== 响应式设计 ======== */

/* 平板和手机 */
@media (max-width: 768px) {
  .knowledge-editor {
    height: 100vh;
    height: 100dvh; /* 动态视口高度，适配移动端浏览器地址栏 */
  }

  .editor-layout {
    position: relative;
  }

  /* 显示移动端遮罩层 */
  .mobile-overlay {
    display: block;
  }

  .mobile-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }

  /* 显示移动端切换按钮 */
  .mobile-sidebar-toggle {
    display: flex;
  }

  /* 侧边栏wrapper */
  .sidebar-wrapper {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar-wrapper.visible {
    transform: translateX(0);
  }

  /* 主内容区域占满宽度 */
  .main-area {
    width: 100%;
    box-shadow: none;
  }

  .editor-and-comments {
    flex-direction: column;
  }

  .editor-container-wrapper {
    width: 100%;
  }

  .editor-main {
    padding: 16px;
  }

  /* 预览模式 */
  .knowledge-editor--preview .editor-main {
    padding: 24px 16px;
  }

  /* 评论面板在移动端改为底部抽屉 */
  .document-search-results {
    max-height: 60vh;
  }

  .document-search-item {
    padding: 10px;
    gap: 10px;
    border-radius: 10px;
    margin-bottom: 6px;
  }

  .document-search-item-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    font-size: 16px;
  }

  .document-search-item-title {
    font-size: 14px;
  }

  .document-search-item-meta {
    font-size: 12px;
  }

  /* 移动端切换按钮 */
  .mobile-sidebar-toggle {
    bottom: 20px;
    left: 12px;
    width: 44px;
    height: 44px;
  }

  .toggle-icon {
    font-size: 18px;
  }
}

/* 中等手机 */
@media (max-width: 640px) {
  .editor-main {
    padding: 12px;
  }

  .knowledge-editor--preview .editor-main {
    padding: 20px 12px;
  }

  .document-search-results {
    max-height: 50vh;
  }

  .document-search-item {
    padding: 8px;
    gap: 8px;
    border-radius: 8px;
    margin-bottom: 4px;
  }

  .document-search-item-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    font-size: 14px;
  }

  .document-search-item-title {
    font-size: 13px;
  }

  .document-search-item-meta {
    font-size: 11px;
  }

  .mobile-sidebar-toggle {
    bottom: 16px;
    left: 10px;
    width: 42px;
    height: 42px;
  }

  .toggle-icon {
    font-size: 17px;
  }
}

/* 小屏手机 */
@media (max-width: 480px) {
  .editor-main {
    padding: 10px;
  }

  .knowledge-editor--preview .editor-main {
    padding: 16px 10px;
  }

  .document-search-results {
    max-height: 40vh;
  }

  .document-search-item {
    padding: 6px;
    gap: 6px;
    border-radius: 6px;
  }

  .document-search-item-icon {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    font-size: 12px;
  }

  .document-search-item-title {
    font-size: 12px;
  }

  .document-search-item-meta {
    font-size: 10px;
  }

  .mobile-sidebar-toggle {
    bottom: 14px;
    left: 8px;
    width: 40px;
    height: 40px;
  }

  .toggle-icon {
    font-size: 16px;
  }
}
</style>

