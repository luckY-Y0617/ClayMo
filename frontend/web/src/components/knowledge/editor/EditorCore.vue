<template>
  <div class="editor-container" :class="{ 'is-previewing': isPreviewing }">
    <FormatToolbar 
      v-if="editor && !isPreviewing" 
      :can-create-comment="canCreateComment"
      @add-comment="handleToolbarAddComment"
    />

    <!-- Bubble 菜单入口 -->
    <BubbleHost
      v-if="editor && !isPreviewing"
      :editor="editor"
      :is-previewing="isPreviewing"
      :can-create-comment="canCreateComment"
      :suspended="commentMenuVisible"
      :auto-show-comment="autoShowComment"
      @comment-submit="handleSelectionComment"
    />

    <div class="editor-wrapper">
      <editor-content :editor="editor" class="editor-content" />

      <!-- 选中文本评论弹窗 - 在editor内部右侧 -->
      <SelectionCommentPopup
        v-if="editor && !isPreviewing && canCreateComment"
        :editor="editor"
        v-model:visible="selectionCommentVisible"
        @submit="handleSelectionCommentSubmit"
        @close="handleSelectionCommentClose"
      />

      <!-- 评论按钮 -->
      <button
        v-if="editor && totalCommentCount > 0 && !isPreviewing && canViewComment"
        class="comment-toggle-btn"
        @click="handleOpenCommentDrawer"
        :title="`查看评论 (${totalCommentCount})`"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="comment-count" v-if="totalCommentCount > 0">
          {{ totalCommentCount > 99 ? '99+' : totalCommentCount }}
        </span>
      </button>
    </div>

    <!-- 评论预览工具提示 -->
    <div
      v-if="canViewComment && commentPreviewTooltip && commentPreviewData"
      class="comment-preview-tooltip"
      :style="{ left: commentPreviewTooltip.x + 'px', top: commentPreviewTooltip.y + 'px' }"
    >
      <div class="comment-preview-header">
        <span class="comment-preview-author">{{ commentPreviewData.author }}</span>
        <span v-if="commentPreviewData.count > 1" class="comment-preview-count">
          {{ commentPreviewData.count }} 条评论
        </span>
      </div>
      <div class="comment-preview-text">{{ commentPreviewData.text }}</div>
    </div>

    <!-- 评论预览弹框 -->
    <div
      v-if="canViewComment && commentMenuVisible && commentMenuItems.length > 0"
      class="comment-preview-popup"
      :style="{ left: commentMenuPosition.x + 'px', top: commentMenuPosition.y + 'px' }"
      @mousedown.stop
    >
      <div class="comment-preview-arrow"></div>

      <button
        v-if="commentMenuItems.length > 1"
        class="comment-preview-nav comment-preview-nav--prev"
        :disabled="currentCommentIndex === 0"
        @click.stop="handlePrevComment"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <button
        v-if="commentMenuItems.length > 1"
        class="comment-preview-nav comment-preview-nav--next"
        :disabled="currentCommentIndex === commentMenuItems.length - 1"
        @click.stop="handleNextComment"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <div class="comment-preview-content">
        <transition name="comment-slide" mode="out-in">
          <div
            :key="currentCommentIndex"
            :class="['comment-preview-card', { 'comment-preview-card--single': commentMenuItems.length === 1 }]"
            @click.stop="handleViewFullComment(commentMenuItems[currentCommentIndex].id)"
          >
            <div class="comment-preview-card-author">
              {{ commentMenuItems[currentCommentIndex].author }}
            </div>
            <div class="comment-preview-card-content">
              {{ getTruncatedContent(commentMenuItems[currentCommentIndex].content) }}
            </div>
          </div>
        </transition>

        <div v-if="commentMenuItems.length > 1" class="comment-preview-pagination">
          {{ currentCommentIndex + 1 }} / {{ commentMenuItems.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, watchEffect, computed, inject, nextTick, type Ref } from 'vue'
import { EditorContent, useEditor, type Editor } from '@tiptap/vue-3'
import { ElMessage } from 'element-plus'
import { StarterKit } from '@tiptap/starter-kit'
import { Heading } from '@tiptap/extension-heading'
import { Underline } from '@tiptap/extension-underline'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Link } from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { TextSelection, NodeSelection } from '@tiptap/pm/state'
import { debounce } from 'lodash-es'

// 自定义扩展
import {
  SlashCommand,
  InlineDocumentReference,
  CardDocumentReference,
  AtMention,
  BlockId,
  CommentMark,
  ImageBlock,
  FileBlock,
  TrailingParagraph,
  CustomCodeBlock
} from '@/editor/extensions'

// 组件
import FormatToolbar from './FormatToolbar.vue'
import SlashCommandList from './SlashCommandList.vue'
import DocumentMentionList from './DocumentMentionList.vue'
import BubbleHost from '@/editor/menus/bubble/BubbleHost.vue'
import SelectionCommentPopup from './SelectionCommentPopup.vue'


// 工具
import { locateRangeAnchor, type RangeAnchorPosition } from '@/utils/commentAnchor'

// 类型定义
import type { EditorDocument, Comment } from '@/types/editor'

interface EditorSession {
  editor: Ref<Editor | null>
  setEditor: (e: Editor) => void
  markUnsaved: () => void
  updateCurrentDocument: (updates: Partial<EditorDocument>) => void
  currentDocument: EditorDocument | null
}

interface CommentMenuItem {
  id: string
  content: string
  author: string
}

interface CommentPreviewData {
  text: string
  author: string
  count: number
}

interface Position {
  x: number
  y: number
}

// Props
interface Props {
  document: EditorDocument
  comments?: Comment[]
  isPreviewing?: boolean
  canViewComment?: boolean
  canCreateComment?: boolean
  autoShowComment?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  comments: () => [],
  isPreviewing: false,
  canViewComment: true,
  canCreateComment: true,
  autoShowComment: false,
})

// Emits
const emit = defineEmits<{
  update: [payload: { json: object; html: string; plainText: string }]
  'open-document': [detail: { docId: string }]
  'insert-document-card': [detail: { editor: Editor; range: { from: number; to: number } }]
  'add-comment': [payload: { content: string; parentId: string | null; position: unknown | null }]
  'comment-click': [commentId: string]
  'comment-hover': [payload: { commentId: string; preview: CommentPreviewData }]
  'open-comment-drawer': [commentId?: string]
  'editor-ready': [editor: Editor]
  'add-comment-from-toolbar': []
}>()


// DI
const editorSession = inject<EditorSession>('editorSession')

// 状态
const lastDocId = ref<string | null>(null)
const orphanCommentIds = ref(new Set<string>())
let isRenderingCommentMarks = false
let pendingRenderMarksTimeout: ReturnType<typeof setTimeout> | null = null

// 评论预览状态
const commentPreviewTooltip = ref<Position | null>(null)
const commentPreviewData = ref<CommentPreviewData | null>(null)
const commentMenuVisible = ref(false)
const commentMenuPosition = ref<Position>({ x: 0, y: 0 })
const commentMenuItems = ref<CommentMenuItem[]>([])
const currentCommentIndex = ref(0)

// 选中文本评论弹窗状态
const selectionCommentVisible = ref(false)

// 计算属性
const totalCommentCount = computed(() => {
  if (!props.comments?.length) return 0
  return flattenCommentTree(props.comments).length
})

// 辅助函数
function flattenCommentTree(comments: Comment[]): Comment[] {
  const result: Comment[] = []
  const traverse = (list: Comment[]) => {
    for (const c of list) {
      result.push(c)
      if (c.children?.length) traverse(c.children)
    }
  }
  traverse(comments)
  return result
}

// Debounced save
let lastSavedPlainText = ''

const debouncedSave = debounce((payload: { json: object; html: string; plainText: string }) => {
  if (payload.plainText === lastSavedPlainText) {
    return
  }
  lastSavedPlainText = payload.plainText
  emit('update', payload)
}, 3000)

// 创建编辑器
const editor = useEditor({
  content: props.document?.content || '<p></p>',
  editable: !props.isPreviewing,
  extensions: [
    StarterKit.configure({ heading: false, codeBlock: false, link: false, underline: false }),
    BlockId,
    Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    Underline,
    CustomCodeBlock.configure({
      defaultLanguage: 'plaintext',
    }),
    TaskList,
    TaskItem,
    Link.configure({ openOnClick: false }),
    ImageBlock.configure({ HTMLAttributes: { class: 'kb-img' } }),
    FileBlock.configure({
      resolvePreviewUrl: (f) => `/api/files/${f.fileId}/content?disposition=inline`,
      resolveDownloadUrl: (f) => `/api/files/${f.fileId}/content?disposition=attachment`,
      resolveShareUrl: (f) => `${location.origin}/kb/file/${f.fileId}`,
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder: '开始输入...' }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Color,
    TextStyle,
    SlashCommand.configure({
      commandListComponent: SlashCommandList,
    }),
    InlineDocumentReference,
    CardDocumentReference,
    AtMention.configure({
      mentionListComponent: DocumentMentionList,
    }),
    CommentMark,
    TrailingParagraph,
  ],
  editorProps: {
    attributes: { class: 'prose prose-sm max-w-none focus:outline-none' },
  },
  onUpdate: ({ editor: ed }) => {
    editorSession?.markUnsaved?.()

    const payload = {
      json: ed.getJSON(),
      html: ed.getHTML(),
      plainText: ed.state.doc.textBetween(0, ed.state.doc.content.size, '\n'),
    }

    debouncedSave(payload)
  },
})

// 评论标记渲染
const clampRange = (state: Editor['state'], from: number, to: number) => {
  const max = state.doc.content.size
  let f = Math.max(0, Math.min(from, max))
  let t = Math.max(0, Math.min(to, max))
  if (t <= f) t = Math.min(f + 1, max)
  return { from: f, to: t }
}

/**
 * 合并评论标记 - 支持同一文本范围有多条评论
 */
const mergeCommentMarkOnTr = (
  tr: import('@tiptap/pm/state').Transaction,
  markType: import('@tiptap/pm/model').MarkType,
  from: number,
  to: number,
  commentId: string
) => {
  if (from >= to) return

  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return

    const textLen = node.text ? node.text.length : 0
    const nodeFrom = pos
    const nodeTo = pos + textLen

    const segFrom = Math.max(from, nodeFrom)
    const segTo = Math.min(to, nodeTo)
    if (segFrom >= segTo) return

    const existing = node.marks.find((m) => m.type === markType) || null

    if (!existing) {
      tr.addMark(segFrom, segTo, markType.create({ commentId, commentIds: [commentId] }))
      return
    }

    const existingIds = Array.isArray(existing.attrs.commentIds)
      ? existing.attrs.commentIds
      : existing.attrs.commentId
        ? [existing.attrs.commentId]
        : []

    const merged = Array.from(new Set([...existingIds, commentId]))
    const primary = existing.attrs.commentId || commentId

    tr.removeMark(segFrom, segTo, markType)
    tr.addMark(segFrom, segTo, markType.create({ commentId: primary, commentIds: merged }))
  })
}

const renderCommentMarks = () => {
  const ed = editor.value
  if (!ed || ed.isDestroyed) return
  if (isRenderingCommentMarks) return
  isRenderingCommentMarks = true

  try {
    const view = ed.view
    // Get fresh state reference BEFORE creating transaction to avoid mismatched transaction
    const state = view.state
    const markType = state.schema.marks.commentMark
    if (!markType) return

    // Create transaction from the current state
    const tr = state.tr
    tr.removeMark(0, state.doc.content.size, markType)

    const orphan = new Set<string>()
    const flat = flattenCommentTree(props.comments)

    for (const c of flat) {
      if (!c?.id || !c.position) continue

      if (c.position.type === 'range') {
        const loc = locateRangeAnchor(ed, c.position as RangeAnchorPosition)
        if (!loc) {
          orphan.add(c.id)
          continue
        }
        const r = clampRange(state, loc.from, loc.to)
        mergeCommentMarkOnTr(tr, markType, r.from, r.to, c.id)
      }
    }

    orphanCommentIds.value = orphan
    // Double-check editor is still valid before dispatching
    if (!editor.value || editor.value.isDestroyed) return
    view.dispatch(tr)
  } finally {
    isRenderingCommentMarks = false
  }
}

const scheduleRenderMarks = (ms: number) => {
  // Cancel any pending timeout to avoid stacking timeouts
  if (pendingRenderMarksTimeout) {
    clearTimeout(pendingRenderMarksTimeout)
    pendingRenderMarksTimeout = null
  }
  pendingRenderMarksTimeout = setTimeout(() => {
    pendingRenderMarksTimeout = null
    renderCommentMarks()
  }, ms)
}

// 重置选区
const resetSelectionToStart = () => {
  const ed = editor.value
  if (!ed || ed.isDestroyed) return

  const { state, view } = ed
  // 检查是否是节点选区（而非文本选区）
  if (state.selection instanceof NodeSelection) return

  try {
    let pos = 0
    state.doc.descendants((node, nodePos) => {
      if (pos > 0) return false
      if (node.isTextblock) {
        pos = nodePos + 1
        return false
      }
      return true
    })

    if (pos === 0) {
      pos = state.doc.content.size
    }

    pos = Math.min(pos, state.doc.content.size)

    const tr = state.tr.setSelection(TextSelection.create(state.doc, pos))
    view.dispatch(tr)
    ed.commands.blur()
  } catch {
    // ignore
  }
}

// BubbleHost 评论提交 → 冒泡给上层
const handleSelectionComment = (payload: unknown) => {
  const p = payload as { content: string; parentId: string | null; position: unknown | null }
  emit('add-comment', {
    content: p.content,
    parentId: p.parentId || null,
    position: p.position || null,
  })
}

// 工具栏评论按钮点击
const handleToolbarAddComment = () => {
  const ed = editor.value
  if (!ed) return

  const { from, to } = ed.state.selection
  if (from === to) {
    ElMessage.warning('请先选中文字再添加评论')
    return
  }

  // 打开右侧评论弹窗
  selectionCommentVisible.value = true
}

// 选中文本评论弹窗提交
const handleSelectionCommentSubmit = (payload: unknown) => {
  const p = payload as { content: string; parentId: string | null; position: unknown | null }
  emit('add-comment', {
    content: p.content,
    parentId: p.parentId || null,
    position: p.position || null,
  })
}

// 选中文本评论弹窗关闭
const handleSelectionCommentClose = () => {
  selectionCommentVisible.value = false
}

// Watchers
watch(
  () => props.document,
  (newDoc) => {
    if (!newDoc || !editor.value) return

    const newDocId = newDoc.id
    if (newDocId !== lastDocId.value) {
      lastDocId.value = newDocId
      const content = newDoc.content || '<p></p>'
      editor.value.commands.setContent(content, { emitUpdate: false })

      lastSavedPlainText = editor.value.state.doc.textBetween(0, editor.value.state.doc.content.size, '\n')

      nextTick(() => {
        setTimeout(resetSelectionToStart, 0)
      })

      scheduleRenderMarks(160)
      return
    }

    scheduleRenderMarks(60)
  },
  { immediate: true, deep: false }
)

watch(
  () => editor.value,
  (editorInstance) => {
    if (editorInstance) {
      editorSession?.setEditor?.(editorInstance)
      emit('editor-ready', editorInstance)
    }
  },
  { immediate: true }
)

watch(
  () => props.comments,
  () => {
    if (!editor.value) return
    scheduleRenderMarks(80)
  },
  { deep: true }
)

watch(
  () => props.isPreviewing,
  (isPreviewing) => {
    if (editor.value) {
      editor.value.setEditable(!isPreviewing)
    }
  },
  { immediate: true }
)

// 监听工具栏添加评论事件
watch(
  () => editor.value?.state.selection,
  () => {
    // 选区变化时更新弹窗状态
    if (selectionCommentVisible.value) {
      const ed = editor.value
      if (ed) {
        const { from, to } = ed.state.selection
        if (from === to) {
          // 选区取消，关闭弹窗
          selectionCommentVisible.value = false
        }
      }
    }
  },
  { deep: true }
)

// 评论弹框事件
const handleViewFullComment = (commentId: string) => {
  commentMenuVisible.value = false
  emit('open-comment-drawer', commentId)
  emit('comment-click', commentId)
}

watchEffect(() => {
  if (typeof window !== 'undefined') {
    (window as unknown as { __kb_suppress_bubble: boolean }).__kb_suppress_bubble = commentMenuVisible.value
  }
})

const handleOpenCommentDrawer = () => emit('open-comment-drawer')

const handlePrevComment = () => {
  if (currentCommentIndex.value > 0) currentCommentIndex.value--
}

const handleNextComment = () => {
  if (currentCommentIndex.value < commentMenuItems.value.length - 1) currentCommentIndex.value++
}

const getTruncatedContent = (content: string) => {
  if (!content) return ''
  return content.length > 80 ? content.slice(0, 80) + '...' : content
}

// DOM 事件
const buildCommentItems = (commentIds: string[]): CommentMenuItem[] => {
  const flat = flattenCommentTree(props.comments)
  return commentIds.map((id) => {
    const comment = flat.find((c) => c.id === id)
    return {
      id,
      content: comment?.content || '',
      author: comment?.author?.name || '匿名',
    }
  })
}

const setMenuAtTarget = (target: HTMLElement, items: CommentMenuItem[]) => {
  commentPreviewTooltip.value = null

  if (typeof window !== 'undefined') {
    (window as unknown as { __kb_suppress_bubble: boolean }).__kb_suppress_bubble = true
  }

  const rect = target.getBoundingClientRect()
  commentMenuPosition.value = { x: rect.left + rect.width / 2, y: rect.top - 10 }
  commentMenuItems.value = items
  currentCommentIndex.value = 0
  commentMenuVisible.value = true
}

const clearTooltip = () => {
  commentPreviewData.value = null
  commentPreviewTooltip.value = null
}

const setupEditorDomListeners = () => {
  if (!editor.value) return () => {}

  const editorElement = editor.value.view.dom

  const onOpenDocument = (event: CustomEvent) => emit('open-document', event.detail || event)
  const onInsertCard = (event: CustomEvent) => emit('insert-document-card', event.detail || event)

  const onCommentMouseDown = (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest('.comment-mark')
    if (!target) return
    event.preventDefault()
    event.stopPropagation()
  }

  const onCommentClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('.comment-preview-popup')) return
    if (commentMenuVisible.value) {
      commentMenuVisible.value = false
      return
    }

    const target = (event.target as HTMLElement).closest('.comment-mark') as HTMLElement | null
    if (!target) return

    event.preventDefault()
    event.stopPropagation()

    const commentIdsStr = target.getAttribute('data-comment-ids')
    if (commentIdsStr) {
      try {
        const commentIds = JSON.parse(commentIdsStr) as string[]
        if (commentIds.length > 1) {
          setMenuAtTarget(target, buildCommentItems(commentIds))
        } else {
          emit('open-comment-drawer', commentIds[0])
          emit('comment-click', commentIds[0])
        }
        return
      } catch {
        // ignore
      }
    }

    const commentId = target.getAttribute('data-comment-id')
    if (commentId) {
      emit('open-comment-drawer', commentId)
      emit('comment-click', commentId)
    }
  }

  const onCommentHover = (event: MouseEvent) => {
    if (commentMenuVisible.value) return

    const target = (event.target as HTMLElement).closest('.comment-mark') as HTMLElement | null
    if (!target) return

    const commentIdsStr = target.getAttribute('data-comment-ids')
    if (!commentIdsStr) return

    try {
      const commentIds = JSON.parse(commentIdsStr) as string[]
      const flat = flattenCommentTree(props.comments)
      const firstComment = flat.find((c) => c.id === commentIds[0])
      if (!firstComment) return

      const previewText = firstComment.content || ''
      const truncated = previewText.length > 50 ? previewText.slice(0, 50) + '...' : previewText

      commentPreviewData.value = {
        text: truncated,
        author: firstComment.author?.name || '匿名',
        count: commentIds.length,
      }

      const rect = target.getBoundingClientRect()
      commentPreviewTooltip.value = { x: rect.left + rect.width / 2, y: rect.top - 5 }

      emit('comment-hover', { commentId: commentIds[0], preview: commentPreviewData.value })
    } catch {
      // ignore
    }
  }

  const onClickOutside = (event: MouseEvent) => {
    if (commentMenuVisible.value && !(event.target as HTMLElement).closest('.comment-preview-popup')) {
      commentMenuVisible.value = false
    }
  }

  editorElement.addEventListener('open-document', onOpenDocument as EventListener)
  editorElement.addEventListener('insert-document-card', onInsertCard as EventListener)
  editorElement.addEventListener('mousedown', onCommentMouseDown, true)
  editorElement.addEventListener('click', onCommentClick)
  editorElement.addEventListener('mouseover', onCommentHover)
  editorElement.addEventListener('mouseout', clearTooltip)
  document.addEventListener('click', onClickOutside)

  return () => {
    editorElement.removeEventListener('open-document', onOpenDocument as EventListener)
    editorElement.removeEventListener('insert-document-card', onInsertCard as EventListener)
    editorElement.removeEventListener('mousedown', onCommentMouseDown, true)
    editorElement.removeEventListener('click', onCommentClick)
    editorElement.removeEventListener('mouseover', onCommentHover)
    editorElement.removeEventListener('mouseout', clearTooltip)
    document.removeEventListener('click', onClickOutside)
  }
}

// 生命周期
let cleanupDomListeners: (() => void) | null = null

onMounted(() => {
  if (!editor.value) return
  cleanupDomListeners = setupEditorDomListeners()
  scheduleRenderMarks(220)
})

onBeforeUnmount(() => {
  cleanupDomListeners?.()
  cleanupDomListeners = null

  if (editor.value) editor.value.destroy()

  debouncedSave.cancel?.()

  if (typeof window !== 'undefined') {
    (window as unknown as { __kb_suppress_bubble: boolean }).__kb_suppress_bubble = false
  }
})

// 暴露编辑器实例
defineExpose({
  editor,
})
</script>

<style scoped>
.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
}

.editor-wrapper {
  flex: 1;
  overflow-y: auto;
  background: #ffffff;
  position: relative;
  display: flex;
}

.editor-content {
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 0px 20px 80px;
  min-height: 500px;
  user-select: text;
  -webkit-user-select: text;
}

/* 评论标记样式 */
:deep(.ProseMirror .comment-mark) {
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  padding: 2px 0;
  position: relative;
  cursor: pointer;
  display: inline;
  transition: background-color 0.15s ease;
}

:deep(.ProseMirror .comment-mark:hover) {
  background: rgba(0, 0, 0, 0.1);
}

/* 选中文本保持高亮显示 */
:deep(.ProseMirror ::selection) {
  background: rgba(229, 62, 62, 0.2) !important;
  color: inherit !important;
}

:deep(.ProseMirror ::-moz-selection) {
  background: rgba(229, 62, 62, 0.2) !important;
  color: inherit !important;
}

/* TipTap 编辑器样式 */
:deep(.ProseMirror) {
  outline: none;
  font-size: 16px;
  line-height: 1.8;
  color: #1a1a1a;
  user-select: text !important;
  -webkit-user-select: text !important;
}

:deep(.ProseMirror p) {
  margin: 1em 0;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #999;
  pointer-events: none;
  height: 0;
}

:deep(.ProseMirror h1) {
  font-size: 32px;
  font-weight: 600;
  line-height: 1.3;
  margin: 1.5em 0 0.5em;
  color: #1a1a1a;
}

:deep(.ProseMirror h2) {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.3;
  margin: 1.2em 0 0.5em;
  color: #1a1a1a;
}

:deep(.ProseMirror h3) {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
  margin: 1em 0 0.5em;
  color: #1a1a1a;
}

:deep(.ProseMirror h4) {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  margin: 0.8em 0 0.5em;
  color: #1a1a1a;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin: 0.75em 0;
}

:deep(.ProseMirror li) {
  margin: 0.25em 0;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid rgba(0, 0, 0, 0.1);
  padding-left: 1.5em;
  margin: 1.5em 0;
  color: #666;
}

:deep(.ProseMirror code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 3px 6px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9em;
  color: #1a1a1a;
}

:deep(.ProseMirror pre) {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  padding: 1.2em 1.5em;
  margin: 1.5em 0;
  overflow-x: auto;
  font-size: 15px;
  line-height: 1.6;
}

:deep(.ProseMirror pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 1em;
  line-height: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1em 0;
}

:deep(.ProseMirror a) {
  color: #1a1a1a;
  text-decoration: underline;
  text-decoration-color: rgba(0, 0, 0, 0.3);
  text-underline-offset: 2px;
}

:deep(.ProseMirror a:hover) {
  text-decoration-color: rgba(0, 0, 0, 0.6);
}

/* 表格样式 */
:deep(.ProseMirror table) {
  border-collapse: collapse;
  margin: 0.75em 0;
  width: 100%;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

:deep(.ProseMirror table td),
:deep(.ProseMirror table th) {
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
  border-right: 1px solid rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
}

:deep(.ProseMirror table th) {
  background: rgba(249, 230, 217, 0.4);
  font-weight: 600;
  color: #1a1a1a;
}

/* 行内文档引用 */
:deep(.ProseMirror .inline-doc-ref) {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 2px;
  background: rgba(22, 93, 255, 0.1);
  color: #165dff;
  border-radius: 6px;
  font-size: 0.95em;
  cursor: pointer;
  transition: background 0.15s ease;
  user-select: none;
}

:deep(.ProseMirror .inline-doc-ref:hover) {
  background: rgba(22, 93, 255, 0.15);
}

/* 卡片文档引用 */
:deep(.ProseMirror .card-doc-ref) {
  margin: 1.5em 0;
  width: 100%;
}

/* 评论预览工具提示 */
.comment-preview-tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  margin-top: -8px;
  z-index: 1000;
  pointer-events: none;
  max-width: 280px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  line-height: 1.5;
}

.comment-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-preview-author {
  font-weight: 600;
  color: #1a1a1a;
}

.comment-preview-count {
  font-size: 11px;
  color: #999;
}

.comment-preview-text {
  color: #666;
  word-break: break-word;
}

/* 评论预览弹框 */
.comment-preview-popup {
  position: fixed;
  transform: translate(-50%, -100%);
  margin-top: -12px;
  z-index: 1001;
  width: 280px;
  background: transparent;
  pointer-events: auto;
}

.comment-preview-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #111;
  z-index: 1;
}

.comment-preview-content {
  position: relative;
  width: 100%;
  height: 110px;
  background: #ffffff;
  border: 1px solid #111;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.comment-preview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #111;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.15s ease;
  color: #111;
}

.comment-preview-nav:hover:not(:disabled) {
  background: #f5f5f5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  transform: translateY(-50%) scale(1.05);
}

.comment-preview-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.comment-preview-nav--prev {
  left: -36px;
}

.comment-preview-nav--next {
  right: -36px;
}

.comment-preview-card {
  flex: 1;
  padding: 14px 44px 32px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  transition: background-color 0.15s ease;
  overflow: hidden;
}

.comment-preview-card--single {
  padding: 14px 16px 16px 16px;
}

.comment-preview-card:hover {
  background: rgba(22, 93, 255, 0.04);
}

.comment-preview-card-author {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.comment-preview-card-content {
  font-size: 13px;
  line-height: 1.6;
  color: #666;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  flex: 1;
}

.comment-preview-pagination {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 11px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  z-index: 5;
}

/* 切换动画 */
.comment-slide-enter-active,
.comment-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.comment-slide-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.comment-slide-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

/* 评论按钮 */
.comment-toggle-btn {
  position: fixed;
  bottom: 24px;
  right: 16px;
  z-index: 998;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #FFFFFF;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: #333;
}

.comment-toggle-btn:hover {
  background: #FFFFFF;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  transform: translateY(-2px);
  border-color: rgba(0, 0, 0, 0.15);
}

.comment-toggle-btn:active {
  transform: translateY(-2px) scale(0.92);
}

.comment-count {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.4);
}

/* 预览模式样式 */
.is-previewing :deep(.ProseMirror) {
  cursor: default !important;
  user-select: text !important;
  -webkit-user-select: text !important;
}

.is-previewing :deep(.ProseMirror-selectednode) {
  outline: none;
}

.is-previewing :deep(.slash-menu) {
  display: none;
}

.is-previewing :deep(.comment-mark) {
  pointer-events: none;
  background: transparent;
}

/* 图片样式 */
:deep(.kb-img) {
  display: block;
  height: auto;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.kb-img:hover) {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}


/* ======== 响应式设计 ======== */

/* 平板和手机 */
@media (max-width: 768px) {
  .editor-content {
    padding: 0 16px 100px;
    max-width: 100%;
    min-height: 400px;
  }

  /* 评论按钮 */
  .comment-toggle-btn {
    bottom: 20px;
    right: 12px;
    width: 44px;
    height: 44px;
  }

  .comment-count {
    min-width: 18px;
    height: 18px;
    font-size: 10px;
    border-radius: 9px;
  }

  /* 评论预览弹框 */
  .comment-preview-popup {
    width: 260px;
  }

  .comment-preview-content {
    height: 100px;
  }

  .comment-preview-nav {
    width: 26px;
    height: 26px;
  }

  .comment-preview-nav--prev {
    left: -32px;
  }

  .comment-preview-nav--next {
    right: -32px;
  }

  .comment-preview-card {
    padding: 12px 38px 28px 14px;
  }

  .comment-preview-card--single {
    padding: 12px 14px 14px 14px;
  }

  .comment-preview-card-author {
    font-size: 12px;
    margin-bottom: 6px;
  }

  .comment-preview-card-content {
    font-size: 12px;
    line-height: 1.5;
  }

  .comment-preview-pagination {
    font-size: 10px;
    bottom: 6px;
    right: 10px;
    padding: 1px 5px;
  }

  /* 评论工具提示 */
  .comment-preview-tooltip {
    max-width: 240px;
    padding: 6px 10px;
    font-size: 12px;
  }

  .comment-preview-author {
    font-size: 12px;
  }

  .comment-preview-count {
    font-size: 10px;
  }

  .comment-preview-text {
    font-size: 12px;
  }

  /* TipTap 编辑器内容 */
  :deep(.ProseMirror) {
    font-size: 15px;
    line-height: 1.7;
  }

  :deep(.ProseMirror h1) {
    font-size: 28px;
    margin: 1.2em 0 0.4em;
  }

  :deep(.ProseMirror h2) {
    font-size: 23px;
    margin: 1em 0 0.4em;
  }

  :deep(.ProseMirror h3) {
    font-size: 20px;
    margin: 0.9em 0 0.4em;
  }

  :deep(.ProseMirror h4) {
    font-size: 17px;
    margin: 0.7em 0 0.4em;
  }
}

/* 中等手机 */
@media (max-width: 640px) {
  .editor-content {
    padding: 0 12px 100px;
    min-height: 350px;
  }

  .comment-toggle-btn {
    bottom: 16px;
    right: 10px;
    width: 42px;
    height: 42px;
  }

  .comment-count {
    min-width: 17px;
    height: 17px;
    font-size: 10px;
    border-radius: 8.5px;
  }

  .comment-preview-popup {
    width: 240px;
  }

  .comment-preview-content {
    height: 90px;
  }

  .comment-preview-nav {
    width: 24px;
    height: 24px;
  }

  .comment-preview-nav--prev {
    left: -30px;
  }

  .comment-preview-nav--next {
    right: -30px;
  }

  .comment-preview-card {
    padding: 10px 34px 24px 12px;
  }

  .comment-preview-card--single {
    padding: 10px 12px 12px 12px;
  }

  .comment-preview-card-author {
    font-size: 11px;
    margin-bottom: 5px;
  }

  .comment-preview-card-content {
    font-size: 11px;
    line-height: 1.5;
  }

  .comment-preview-pagination {
    font-size: 9px;
    bottom: 5px;
    right: 8px;
  }

  .comment-preview-tooltip {
    max-width: 220px;
    padding: 5px 8px;
    font-size: 11px;
  }

  :deep(.ProseMirror) {
    font-size: 14px;
    line-height: 1.65;
  }

  :deep(.ProseMirror h1) {
    font-size: 26px;
    margin: 1em 0 0.4em;
  }

  :deep(.ProseMirror h2) {
    font-size: 21px;
    margin: 0.9em 0 0.4em;
  }

  :deep(.ProseMirror h3) {
    font-size: 18px;
    margin: 0.8em 0 0.4em;
  }

  :deep(.ProseMirror h4) {
    font-size: 16px;
    margin: 0.7em 0 0.4em;
  }

  :deep(.ProseMirror ul),
  :deep(.ProseMirror ol) {
    padding-left: 1.2em;
  }

  :deep(.ProseMirror blockquote) {
    padding-left: 1.2em;
    margin: 1.2em 0;
  }

  :deep(.ProseMirror pre) {
    padding: 1em 1.2em;
    font-size: 13px;
  }

  :deep(.ProseMirror table) {
    font-size: 13px;
  }

  :deep(.ProseMirror table td),
  :deep(.ProseMirror table th) {
    padding: 6px 8px;
  }
}

/* 小屏手机 */
@media (max-width: 480px) {
  .editor-content {
    padding: 0 10px 100px;
    min-height: 300px;
  }

  .comment-toggle-btn {
    bottom: 14px;
    right: 8px;
    width: 40px;
    height: 40px;
  }

  .comment-toggle-btn svg {
    width: 16px;
    height: 16px;
  }

  .comment-count {
    min-width: 16px;
    height: 16px;
    font-size: 9px;
    border-radius: 8px;
    padding: 0 4px;
  }

  .comment-preview-popup {
    width: 220px;
  }

  .comment-preview-content {
    height: 80px;
  }

  .comment-preview-nav {
    width: 22px;
    height: 22px;
  }

  .comment-preview-nav--prev {
    left: -28px;
  }

  .comment-preview-nav--next {
    right: -28px;
  }

  .comment-preview-card {
    padding: 8px 30px 20px 10px;
  }

  .comment-preview-card--single {
    padding: 8px 10px 10px 10px;
  }

  .comment-preview-card-author {
    font-size: 10px;
    margin-bottom: 4px;
  }

  .comment-preview-card-content {
    font-size: 10px;
    line-height: 1.4;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .comment-preview-pagination {
    font-size: 8px;
    bottom: 4px;
    right: 6px;
  }

  .comment-preview-tooltip {
    max-width: 200px;
    padding: 4px 6px;
    font-size: 10px;
  }

  :deep(.ProseMirror) {
    font-size: 13px;
    line-height: 1.6;
  }

  :deep(.ProseMirror p) {
    margin: 0.8em 0;
  }

  :deep(.ProseMirror h1) {
    font-size: 24px;
    margin: 0.9em 0 0.3em;
  }

  :deep(.ProseMirror h2) {
    font-size: 20px;
    margin: 0.8em 0 0.3em;
  }

  :deep(.ProseMirror h3) {
    font-size: 17px;
    margin: 0.7em 0 0.3em;
  }

  :deep(.ProseMirror h4) {
    font-size: 15px;
    margin: 0.6em 0 0.3em;
  }

  :deep(.ProseMirror ul),
  :deep(.ProseMirror ol) {
    padding-left: 1em;
    margin: 0.6em 0;
  }

  :deep(.ProseMirror blockquote) {
    padding-left: 1em;
    margin: 1em 0;
    border-left: 2px solid rgba(0, 0, 0, 0.1);
  }

  :deep(.ProseMirror code) {
    padding: 2px 4px;
    font-size: 0.85em;
  }

  :deep(.ProseMirror pre) {
    padding: 0.8em 1em;
    font-size: 12px;
    margin: 1em 0;
  }

  :deep(.ProseMirror table) {
    font-size: 12px;
  }

  :deep(.ProseMirror table td),
  :deep(.ProseMirror table th) {
    padding: 5px 6px;
  }

  :deep(.ProseMirror img) {
    margin: 0.8em 0;
  }
}
</style>

