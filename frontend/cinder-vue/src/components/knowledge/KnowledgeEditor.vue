<template>
  <div class="knowledge-editor" :class="{ 'knowledge-editor--preview': isPreviewing }">
    <div class="editor-layout">
      <Sidebar
        :collapsed="layout.sidebarCollapsed"
        @toggle-collapse="layout.sidebarCollapsed = !layout.sidebarCollapsed"
      />

      <div class="main-area">
        <TopBar
          v-if="currentDocument"
          :layout-mode="layout.mode"
          :is-read-only="isReadOnly"
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
                <Editor
                  :document="currentDocument"
                  :comments="comments"
                  :is-previewing="isPreviewing"
                  @update="handleContentUpdate"
                  @open-document="handleOpenDocument"
                  @insert-document-card="handleInsertDocumentCard"
                  @add-comment="handleSelectionComment"
                  @comment-click="handleCommentClick"
                  @comment-hover="handleCommentHover"
                  @open-comment-drawer="handleOpenCommentDrawer"
                />
              </div>
              <div v-else class="empty-state" key="empty">
                <el-empty description="请选择一个文档开始编辑" />
              </div>
            </transition>
          </div>
        </div>
        
        <!-- 评论侧栏 Drawer -->
        <CommentPanel
          v-if="currentDocument && !isPreviewing"
          v-model:visible="modals.commentDrawer"
          :comments="comments"
          :loading="commentLoading"
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

    <ShareModal
      v-model="modals.share"
      :settings="shareSettings"
      @submit="handleShareSubmit"
    />
    <ExportModal
      v-model="modals.export"
      :exporting="exportState.loading"
      :progress="exportState.progress"
      @submit="handleExportSubmit"
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

    <!-- 保存版本对话框 -->
    <SaveVersionModal
      v-model="modals.saveVersion"
      :submitting="versionState.saving"
      @submit="handleSaveVersionSubmit"
      @cancel="handleSaveVersionCancel"
    />

    <!-- 版本历史面板 -->
    <VersionHistoryModal
      v-model="modals.versionHistory"
    />

    <!-- 管理弹窗（已移除评论功能，只保留其他管理功能） -->
    <el-dialog
      v-model="modals.manage"
      title="文档管理"
      width="800px"
      :close-on-click-modal="false"
      @close="layout.mode = 'write'"
      class="manage-dialog"
    >
      <div class="manage-dialog-content">
        <p>管理功能开发中...</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch, provide, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

import { useKnowledgeEditorSession } from '@/composables/useKnowledgeEditorSession'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useDocument } from '@/composables/useDocument'
import { useComments } from '@/composables/useComments'
import { useKbContextStore } from '@/stores/kbContext'

import { kbApi } from '@/api/kb.api'
import { exportToHTML, exportToMarkdown } from '@/utils/export'
import { scrollToComment } from '@/utils/commentAnchor' // 关键：range anchor 精确定位

import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
import Editor from './Editor.vue'
import CommentPanel from './CommentPanel.vue'
import ShareModal from './modals/ShareModal.vue'
import ExportModal from './modals/ExportModal.vue'
import SaveVersionModal from './modals/SaveVersionModal.vue'
import VersionHistoryModal from './modals/VersionHistoryModal.vue'

const route = useRoute()
const router = useRouter()

// 使用会话式编辑器状态（随组件生命周期创建和销毁）
const editorSession = useKnowledgeEditorSession()

// 通过 provide 共享给所有子组件
provide('editorSession', editorSession)

const baseStore = useKnowledgeBaseStore()
const contextStore = useKbContextStore()

const kbContext = computed(() => {
  return currentBaseId.value ? contextStore.getContext(currentBaseId.value) : null
})

const isReadOnly = computed(() => {
  const role = kbContext.value?.membership?.role
  return role === 'Viewer'
})

// 使用 composables
const { currentDocument, loadDocument, saveContent } = useDocument(editorSession)

// ✅ useComments 使用“改造后版本”：含 attachEditor/renderCommentMarks/jumpToComment
const {
  comments,
  loading: commentLoading,
  loadComments,
  createComment,
  deleteComment,
  findComment,

  attachEditor,
  renderCommentMarks,
  jumpToComment,
} = useComments()

const currentBaseId = computed(() => route.params.baseId || baseStore.currentBase?.id)

// 通过 provide 共享给所有子组件
provide('baseId', currentBaseId)

// UI 状态 - 模态框状态
const modals = ref({
  share: false,
  export: false,
  saveVersion: false,
  versionHistory: false,
  manage: false,
  documentSearch: false,
  commentDrawer: false,
})

// UI 状态 - 布局状态
const layout = ref({
  sidebarCollapsed: false,
  mode: 'write',
})

const isPreviewing = computed(() => layout.value.mode === 'preview' || isReadOnly.value)

// UI 状态 - 导出状态
const exportState = ref({
  loading: false,
  progress: -1,
})

// UI 状态 - 版本保存状态
const versionState = ref({
  saving: false,
})

// 分享设置
const shareSettings = ref({
  visibility: 'private',
  allowComment: false,
  allowEdit: false,
  expiresAt: '',
  shareLink: '',
})

// 文档搜索状态
const documentSearch = ref({
  loading: false,
  results: [],
  keyword: '',
  pendingAction: null,
})

/**
 * 关键：当 editor 初始化/切换时注入 useComments，并尝试重渲染 marks
 * - 这样 loadComments 后能自动 apply marks
 * - 如果 loadComments 先于 editor，就绪后也能补一次 render
 */
watch(
  () => editorSession.editor.value,
  (editor) => {
    attachEditor(editor || null)
    if (editor) {
      // 保险：当 editor 就绪时，把当前 comments 再渲染一次
      renderCommentMarks()
    }
  },
  { immediate: true }
)

// 加载文档并同时加载评论（统一入口）
const loadDocumentWithComments = async (docId) => {
  if (!docId) return

  await loadDocument(docId)

  if (currentBaseId.value) {
    await loadComments(currentBaseId.value, docId)
    // loadComments 内部会 renderCommentMarks，但这里再兜一次（防止 setContent 时序差异）
    renderCommentMarks()
  }
}

/**
 * 处理内容更新（自动保存）
 */
const handleContentUpdate = async (payload) => {
  if (!currentDocument.value || !payload) return

  const { json, html, plainText } = payload
  await saveContent(currentDocument.value.id, {
    json,
    html,
    plainText,
    isAutoSave: true,
  })
  
  // 自动保存后重新渲染评论标记
  nextTick(() => {
    renderCommentMarks()
  })
}

// 统一的路由监听（合并 baseId 和 docId 的处理）
watch(
  () => ({ baseId: route.params.baseId, docId: route.params.docId }),
  ({ baseId, docId }) => {
    if (typeof baseId === 'string') {
      baseStore.setCurrentBaseId(baseId)
    }

    if (typeof docId === 'string') {
      loadDocumentWithComments(docId)
    }
  },
  { immediate: true }
)

const handleModeChange = (mode) => {
  layout.value.mode = mode
  if (mode === 'preview') {
    // 未来实现只读模式
  } else {
    modals.value.manage = false
  }
}

const openShareDialog = () => {
  if (!currentDocument.value) {
    ElMessage.warning('请选择文档后再分享')
    return
  }
  modals.value.share = true
}

const handleShareSubmit = (settings) => {
  shareSettings.value = {
    ...shareSettings.value,
    ...settings,
    shareLink:
      settings.visibility === 'public' && currentDocument.value
        ? `${window.location.origin}/share/${currentDocument.value.id}?token=${Math.random().toString(36).slice(2, 8)}`
        : '',
  }
  modals.value.share = false
  ElMessage.success('分享设置已保存')
}

const openExportDialog = () => {
  if (!currentDocument.value) {
    ElMessage.warning('请选择文档后再导出')
    return
  }
  modals.value.export = true
}

const handleExportSubmit = async (options) => {
  if (!currentDocument.value) return

  const editor = editorSession.editor.value
  if (!editor) {
    ElMessage.warning('编辑器未初始化')
    return
  }

  exportState.value.loading = true
  exportState.value.progress = 10

  try {
    const html = editor.getHTML()

    if (options.formats.includes('markdown')) {
      exportToMarkdown(currentDocument.value, html)
    }
    if (options.formats.includes('html')) {
      exportToHTML(currentDocument.value, html)
    }

    await new Promise((resolve) => setTimeout(resolve, 400))
    exportState.value.progress = 100
    ElMessage.success('导出任务完成')
  } catch (error) {
    console.error(error)
    ElMessage.error('导出失败')
  } finally {
    setTimeout(() => {
      exportState.value.loading = false
      exportState.value.progress = -1
      modals.value.export = false
    }, 500)
  }
}

// 打开保存版本对话框
const openSaveVersionModal = () => {
  if (!currentDocument.value) {
    ElMessage.warning('请先选择文档')
    return
  }
  modals.value.saveVersion = true
}

// 处理保存版本提交
const handleSaveVersionSubmit = async ({ changeSummary }) => {
  if (!currentDocument.value || !editorSession.editor.value) {
    ElMessage.warning('编辑器未初始化')
    return
  }

  versionState.value.saving = true
  try {
    const editor = editorSession.editor.value
    const json = editor.getJSON()
    const html = editor.getHTML()
    const plainText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n')

    await saveContent(currentDocument.value.id, {
      json,
      html,
      plainText,
      isAutoSave: false,
      changeSummary: changeSummary || null,
    })

    ElMessage.success('已保存为新版本')
    modals.value.saveVersion = false
  } catch (error) {
    ElMessage.error('保存版本失败')
  } finally {
    versionState.value.saving = false
  }
}

// 取消保存版本
const handleSaveVersionCancel = () => {
  modals.value.saveVersion = false
}

// 打开版本历史面板
const openVersionHistory = () => {
  if (!currentDocument.value) {
    ElMessage.warning('请先选择文档')
    return
  }
  modals.value.versionHistory = true
}

// 处理打开文档（从引用中点击）
const handleOpenDocument = (event) => {
  const { docId } = event.detail || event
  if (!docId || !currentBaseId.value) {
    console.warn('无法确定 baseId 或 docId，无法跳转')
    return
  }
  router.push(`/kb/${currentBaseId.value}/edit/${docId}`)
}

// 处理插入文档卡片（从 Slash 命令触发）
const handleInsertDocumentCard = (event) => {
  const { editor, range } = event.detail || {}
  if (!editor) return

  documentSearch.value.pendingAction = { editor, range, type: 'card' }
  modals.value.documentSearch = true
  documentSearch.value.keyword = ''
  documentSearch.value.results = []
}

// 搜索文档
const searchDocuments = async (keyword) => {
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
    const result = await kbApi.document.search(currentBaseId.value, keyword.trim())
    documentSearch.value.results = result.list.map(item => ({
      id: item.document?.id || item.id,
      title: item.document?.title || item.title,
      summary: item.document?.summary || item.summary,
      knowledgeBaseId: item.document?.knowledgeBaseId || item.knowledgeBaseId || currentBaseId.value,
    }))
  } catch (error) {
    console.error('搜索文档失败:', error)
    documentSearch.value.results = []
  } finally {
    documentSearch.value.loading = false
  }
}

// 选择文档并插入
const handleSelectDocument = (doc) => {
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

const handleCommentSubmit = async (text) => {
  if (!currentDocument.value || !currentBaseId.value) return

  // 非选区评论：后端可以允许 position=null（整篇/整块评论另行扩展）
  await createComment(currentBaseId.value, currentDocument.value.id, { content: text })
}

const handleCommentRefresh = async () => {
  if (!currentDocument.value || !currentBaseId.value) return
  await loadComments(currentBaseId.value, currentDocument.value.id)
  ElMessage.success('评论已刷新')
}

/**
 * ✅ 精确定位（range anchor）优先；失败再降级 block 滚动
 */
const handleCommentLocate = (comment) => {
  const editor = editorSession.editor.value
  if (!comment || !editor) return

  // 1) 优先：range anchor 精确定位
  if (comment.position?.type === 'range') {
    const ok = scrollToComment(editor, comment.position)
    if (ok) return
  }

  // 2) 降级：滚动到 block
  const position = comment.position
  const rootEl = editor.view.dom

  if (!position?.blockId) {
    rootEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  const el = rootEl.querySelector(`[data-block-id="${position.blockId}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('comment-highlight')
    setTimeout(() => el.classList.remove('comment-highlight'), 1600)
  }
}

const handleCommentReply = async (comment) => {
  if (!comment || !currentDocument.value || !currentBaseId.value) return
  await createComment(currentBaseId.value, currentDocument.value.id, {
    content: '感谢你的想法！',
    parentId: comment.id,
  })
}

const handleCommentLike = async (comment) => {
  if (!comment || !currentDocument.value || !currentBaseId.value) return
  await toggleLike(currentBaseId.value, currentDocument.value.id, comment.id)
}

const handleCommentDelete = async (comment) => {
  if (!comment || !currentDocument.value || !currentBaseId.value) return
  await deleteComment(currentBaseId.value, currentDocument.value.id, comment.id)
}

/**
 * ✅ 来自 Editor 选区评论：只传 content/parentId/position（统一语义）
 * Editor 侧 BubbleMenu submit 应该 emit：{ content, position, parentId? }
 */
const handleSelectionComment = async ({ content, parentId, position }) => {
  if (!currentDocument.value || !currentBaseId.value) return
  await createComment(currentBaseId.value, currentDocument.value.id, {
    content,
    parentId: parentId || null,
    position: position || null,
  })
}

/**
 * 处理打开评论侧栏事件
 */
const handleOpenCommentDrawer = (commentId) => {
  modals.value.commentDrawer = true
  if (commentId) {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('comment-navigate', {
        detail: { commentId }
      }))
    }, 100)
  }
}

/**
 * ✅ 评论标记点击：定位 + 打开侧栏
 */
const handleCommentClick = (commentId) => {
  if (!commentId) return

  // 优先使用 useComments 内部 jump（它会从树里取 position 并 scroll）
  const ok = jumpToComment(commentId)
  if (!ok) {
    // fallback：原逻辑（按 blockId 滚动）
    const comment = findComment(commentId)
    if (comment) handleCommentLocate(comment)
  }

  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('comment-navigate', {
      detail: { commentId }
    }))
  }, 100)
}

/**
 * 处理评论悬停事件（从编辑器触发）
 */
const handleCommentHover = (comment) => {
  if (comment) {
    window.dispatchEvent(new CustomEvent('comment-hover', {
      detail: { commentId: comment.id }
    }))
  }
}

/**
 * 处理评论面板悬停事件（只高亮，不滚动）
 */
const handleCommentPanelHover = (comment) => {
  const editor = editorSession.editor.value
  if (!comment?.position?.blockId || !editor) return

  const el = editor.view.dom.querySelector(
    `[data-block-id="${comment.position.blockId}"]`
  )
  if (el) {
    if (window.commentHighlightTimer) {
      clearTimeout(window.commentHighlightTimer)
    }
    el.classList.add('comment-highlight')
    window.commentHighlightTimer = setTimeout(() => {
      el.classList.remove('comment-highlight')
    }, 300)
  }
}
</script>


<style scoped>
/* 最外层：全屏工作区，纯白背景 */
.knowledge-editor {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
}

/* 编辑布局：直接占据整个工作区，无圆角无阴影 */
.editor-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  background: #ffffff;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
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
  animation: fadeInUp 0.2s var(--ease-standard);
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

/* .related-doc 样式已移除，未使用 */

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
  transition: background-color var(--transition-fast) var(--ease-standard),
              transform var(--transition-fast) var(--ease-standard);
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
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-search-item-meta {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 管理弹窗样式 */
:deep(.manage-dialog .el-dialog__body) {
  padding: 0;
  height: 600px;
  overflow: hidden;
}

.manage-dialog-content {
  height: 100%;
}

:deep(.manage-dialog-content .info-panel) {
  width: 100%;
  height: 100%;
  border: none;
}

:deep(.manage-dialog-content .info-panel .panel-handle) {
  display: none;
}

:deep(.manage-dialog-content .info-panel .panel-shell) {
  width: 100%;
  height: 100%;
  border: none;
}

/* 预览模式样式 */
.knowledge-editor--preview .editor-main {
  padding: 32px 0;
  align-items: center; /* 垂直居中 */
}

.knowledge-editor--preview .editor-main > :deep(.editor-container) {
  width: 100%;
}

.knowledge-editor--preview .editor-main > :deep(.editor-content) {
  max-width: 800px; /* Or your preferred reading width */
  margin: 0 auto;
  padding: 64px 80px 120px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.knowledge-editor--preview .comment-panel {
  display: none;
}


</style>
