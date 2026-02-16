<template>
  <div class="editor-container" :class="{ 'is-previewing': isPreviewing }">
    <FormatToolbar v-if="editor && !isPreviewing" />

    <!-- 统一的 Bubble 入口 -->
    <BubbleHost
      v-if="editor && !isPreviewing"
      :editor="editor"
      :is-previewing="isPreviewing"
      @comment-submit="handleSelectionComment"
    />

    <div class="editor-wrapper">
      <editor-content :editor="editor" class="editor-content" />

      <!-- 评论按钮 - 右上角浮动按钮 -->
      <button
        v-if="editor && totalCommentCount > 0 && !isPreviewing"
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
      v-if="commentPreviewTooltip && commentPreviewData"
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

    <!-- 评论预览弹框（单条预览模式，支持左右切换） -->
    <div
      v-if="commentMenuVisible && commentMenuItems.length > 0"
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

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, inject, nextTick } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'

import { CustomCodeBlock } from '@/editor/extensions/CodeBlock'
import SlashCommand from '@/editor/extensions/SlashCommand'
import InlineDocumentReference from '@/editor/extensions/InlineDocumentReference'
import CardDocumentReference from '@/editor/extensions/CardDocumentReference'
import AtMention from '@/editor/extensions/AtMention'
import BlockId from '@/editor/extensions/BlockId'
import CommentMark from '@/editor/extensions/CommentMark'
import { ImageBlock } from '@/editor/extensions/ImageBlock'
import { FileBlock } from '@/editor/extensions/FileBlock'

import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useTagStore } from '@/stores/tag'
import { kbApi } from '@/api/kb.api'
import { debounce } from 'lodash-es'
import { flattenCommentTree } from '@/utils/comment'
import { locateRangeAnchor } from '@/utils/commentAnchor'

import FormatToolbar from './FormatToolbar.vue'
import BubbleHost from '@/editor/menus/bubble/BubbleHost.vue'
import TrailingParagraph from '@/editor/extensions/TrailingParagraph'


/** ---------------- props / emit ---------------- */
const props = defineProps({
  document: { type: Object, required: true },
  comments: { type: Array, default: () => [] },
  isPreviewing: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update',
  'open-document',
  'insert-document-card',
  'add-comment',
  'comment-click',
  'comment-hover',
  'open-comment-drawer',
])

/** ---------------- DI / stores ---------------- */
const editorSession = inject('editorSession')
const baseStore = useKnowledgeBaseStore()
const tagStore = useTagStore()

/** ---------------- local state ---------------- */
const lastDocId = ref(null)
const orphanCommentIds = ref(new Set())

const hashtagTagIds = ref(new Set())

// 评论预览 tooltip / popup
const commentPreviewTooltip = ref(null)
const commentPreviewData = ref(null)

const commentMenuVisible = ref(false)
const commentMenuPosition = ref({ x: 0, y: 0 })
const commentMenuItems = ref([])
const currentCommentIndex = ref(0)

/** ---------------- computed ---------------- */
const totalCommentCount = computed(() => {
  if (!props.comments?.length) return 0
  return flattenCommentTree(props.comments).length
})


/** ---------------- debounce ---------------- */
const debouncedSave = debounce((payload) => emit('update', payload), 3000)

/** ---------------- hashtag helpers ---------------- */
const hashtagRegex =
  /(^|[\s.,，。！？、"'“”‘’()[\]{}<>~-])#([A-Za-z0-9\u4e00-\u9fa5/_-]{1,32})/gu

const extractHashtagNames = (text) => {
  if (!text) return []
  const matches = new Set()
  let match
  while ((match = hashtagRegex.exec(text)) !== null) {
    if (match[2]) matches.add(match[2])
  }
  return Array.from(matches)
}

const slugify = (value) => {
  if (!value) return ''
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5/_-]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || value.toLowerCase()
  )
}

// 与标签输入组件保持一致的自动配色逻辑
const TAG_COLOR_PALETTE = ['#FF9F7A', '#FFCF7A', '#7AD3FF', '#A17AFF', '#7AFFB0', '#FF7AAE']

const getAutoColor = (tagLike) => {
  if (!tagLike) return '#E5E7EB'
  if (tagLike.color) return tagLike.color
  const key = (tagLike.id || tagLike.name || '').toString()
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return TAG_COLOR_PALETTE[hash % TAG_COLOR_PALETTE.length]
}

const ensureTagsLoaded = async () => {
  if (tagStore.tags?.length) return
  const kbId = baseStore.currentBase?.id
  if (!kbId) return
  try {
    const res = await kbApi.tag.list(kbId)
    tagStore.setTags(res.items)
  } catch (error) {
    console.error('加载标签失败:', error)
  }
}

const resolveTagIdsFromNames = async (names) => {
  if (!names.length) return []
  const kbId = baseStore.currentBase?.id
  if (!kbId) return []

  const resolved = []
  for (const name of names) {
    const slug = slugify(name)

    const match = tagStore.tags.find((tag) => {
      const tagSlug = tag.slug || slugify(tag.name)
      return tagSlug === slug || tag.name === name
    })

    if (match) {
      resolved.push(match.id)
      continue
    }

    try {
      const color = getAutoColor({ name })
      const newTag = await kbApi.tag.create({
        knowledgeBaseId: kbId,
        name,
        color,
        icon: null,
      })
      tagStore.addTag(newTag)
      resolved.push(newTag.id)
    } catch (error) {
      console.error('创建标签失败:', error)
    }
  }

  return Array.from(new Set(resolved))
}

const areTagListsEqual = (next, prev) => {
  if (next.length !== prev.length) return false
  const sortedNext = [...next].sort()
  const sortedPrev = [...prev].sort()
  return sortedNext.every((id, idx) => id === sortedPrev[idx])
}

const syncHashtagsWithTags = async (text) => {
  if (!props.document?.id) return

  const names = extractHashtagNames(text)
  await ensureTagsLoaded()
  const resolvedIds = await resolveTagIdsFromNames(names)

  const currentDoc = editorSession?.currentDocument
  const currentTags = currentDoc?.tags || []
  const previousHashtagIds = new Set(hashtagTagIds.value)

  const manualTags = currentTags.filter((id) => !previousHashtagIds.has(id))
  const nextHashtagSet = new Set(resolvedIds)
  const mergedTags = Array.from(new Set([...manualTags, ...resolvedIds]))

  if (areTagListsEqual(mergedTags, currentTags)) {
    hashtagTagIds.value = nextHashtagSet
    return
  }

  try {
    await kbApi.tag.setDocumentTags(props.document.id, mergedTags)
    editorSession?.updateCurrentDocument?.({ tags: mergedTags })
    hashtagTagIds.value = nextHashtagSet
  } catch (error) {
    console.error('同步标签失败:', error)
  }
}

const debouncedHashtagSync = debounce((text) => syncHashtagsWithTags(text), 1000)

/** ---------------- editor ---------------- */
const editor = useEditor({
  content: props.document?.content || '<p></p>',
  editable: true,
  extensions: [
    StarterKit.configure({ heading: false, codeBlock: false }),
    BlockId,
    Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    Underline,
    CustomCodeBlock,
    TaskList,
    TaskItem,
    Link.configure({ openOnClick: false }),
    ImageBlock.configure({HTMLAttributes: { class: 'kb-img' }}),
    FileBlock.configure({
      resolvePreviewUrl: async (f) => `/api/files/${f.fileId}/content?disposition=inline`,
      resolveDownloadUrl: async (f) => `/api/files/${f.fileId}/content?disposition=attachment`,
      resolveShareUrl: async (f) => `${location.origin}/kb/file/${f.fileId}`,
      // 可选：做持久化重命名/删除
      onRename: async ({ fileId, nextName }) => {/* call api */},
      onRemove: async ({ fileId }) => {/* call api */},
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder: '开始输入...' }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Color,
    TextStyle,
    SlashCommand,
    InlineDocumentReference,
    CardDocumentReference,
    AtMention,
    CommentMark,
    TrailingParagraph, // ✅ 加这一行（建议放最后）
  ],
  editorProps: {
    attributes: { class: 'prose prose-sm max-w-none focus:outline-none' },
  },
  onUpdate: ({ editor }) => {
    editorSession?.markUnsaved?.()

    const payload = {
      json: editor.getJSON(),
      html: editor.getHTML(),
      plainText: editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n'),
    }

    debouncedSave(payload)
    debouncedHashtagSync(editor.getText())
  },
})

/** ---------------- comment bubble submit ---------------- */
const handleSelectionComment = ({ content, parentId, position }) => {
  emit('add-comment', { content, parentId: parentId || null, position: position || null })
}

/** ---------------- comment mark render ---------------- */
const clampRange = (state, from, to) => {
  const max = state.doc.content.size
  let f = Math.max(0, Math.min(from, max))
  let t = Math.max(0, Math.min(to, max))
  if (t <= f) t = Math.min(f + 1, max)
  return { from: f, to: t }
}

const mergeCommentMarkOnTr = (tr, markType, from, to, commentId) => {
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
  if (!editor.value) return

  const view = editor.value.view
  const state = view.state
  const markType = state.schema.marks.commentMark
  if (!markType) return

  const tr = state.tr
  tr.removeMark(0, state.doc.content.size, markType)

  const orphan = new Set()
  const flat = flattenCommentTree(props.comments)

  for (const c of flat) {
    if (!c?.id || !c.position) continue

    if (c.position.type === 'range') {
      const loc = locateRangeAnchor(editor.value, c.position)
      if (!loc) {
        orphan.add(c.id)
        continue
      }
      const r = clampRange(state, loc.from, loc.to)
      mergeCommentMarkOnTr(tr, markType, r.from, r.to, c.id)
    }
  }

  orphanCommentIds.value = orphan
  view.dispatch(tr)
}

const scheduleRenderMarks = (ms) => setTimeout(() => renderCommentMarks(), ms)

/**
 * 重置选区到文档开头（大厂标准）
 * 内容加载后，ProseMirror 可能把 selection 落在第一个 atom 节点（如图片）上
 * 需要强制把 selection 设置为 TextSelection，避免触发 NodeSelection 的 bubble
 */
const resetSelectionToStart = () => {
  const ed = editor.value
  if (!ed || ed.isDestroyed) return
  
  const { state, view } = ed
  
  // 只有当前是 NodeSelection 时才需要重置
  if (!state.selection.node) return
  
  try {
    const { TextSelection } = require('prosemirror-state')
    // 找到第一个可以放置光标的位置
    const $start = state.doc.resolve(0)
    let pos = 0
    
    // 尝试找到第一个文本块的位置
    state.doc.descendants((node, nodePos) => {
      if (pos > 0) return false // 已经找到了
      if (node.isTextblock) {
        pos = nodePos + 1 // 放在文本块内部
        return false
      }
      return true
    })
    
    // 如果没找到文本块，就放在文档末尾
    if (pos === 0) {
      pos = state.doc.content.size
    }
    
    // 确保位置有效
    pos = Math.min(pos, state.doc.content.size)
    
    const tr = state.tr.setSelection(TextSelection.create(state.doc, pos))
    view.dispatch(tr)
    ed.commands.blur()
  } catch (e) {
    // 忽略错误
  }
}

/** ---------------- document / comments watchers ---------------- */
watch(
  () => props.document,
  (newDoc) => {
    if (!newDoc || !editor.value) return

    const newDocId = newDoc.id
    if (newDocId !== lastDocId.value) {
      lastDocId.value = newDocId
      editor.value.commands.setContent(newDoc.content || '<p></p>', false, { preserveWhitespace: 'full' })
      
      // 内容加载后重置选区（避免图片被自动选中）
      // 使用 nextTick + setTimeout 确保 DOM 完全渲染
      nextTick(() => {
        setTimeout(resetSelectionToStart, 0)
      })
      
      scheduleRenderMarks(160)
      return
    }

    scheduleRenderMarks(60)
  },
  { immediate: true, deep: false },
)

watch(
  () => editor.value,
  (editorInstance) => {
    if (editorInstance) editorSession?.setEditor?.(editorInstance)
  },
  { immediate: true },
)

watch(
  () => props.comments,
  () => {
    if (!editor.value) return
    scheduleRenderMarks(80)
  },
  { deep: true },
)

watch(
  () => props.document?.id,
  async (docId) => {
    if (!docId) {
      hashtagTagIds.value = new Set()
      return
    }
    if (editor.value) await syncHashtagsWithTags(editor.value.getText())
  },
  { immediate: true },
)

watch(
  () => props.isPreviewing,
  (isPreviewing) => {
    // 不再使用 setEditable，改用 CSS 和事件处理
    // 这样可以保持文本选择能力
  },
  { immediate: true },
)

/** ---------------- popup helpers ---------------- */
const handleViewFullComment = (commentId) => {
  commentMenuVisible.value = false
  emit('open-comment-drawer', commentId)
  emit('comment-click', commentId)
}

const handleOpenCommentDrawer = () => emit('open-comment-drawer')

const handlePrevComment = () => {
  if (currentCommentIndex.value > 0) currentCommentIndex.value--
}
const handleNextComment = () => {
  if (currentCommentIndex.value < commentMenuItems.value.length - 1) currentCommentIndex.value++
}

const getTruncatedContent = (content) => {
  if (!content) return ''
  return content.length > 80 ? content.slice(0, 80) + '...' : content
}

/** ---------------- DOM event wiring ---------------- */
const buildCommentItems = (commentIds) => {
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

const setMenuAtTarget = (target, items) => {
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

  // 预览模式下的事件处理 - 阻止编辑但允许选择
  const onPreviewModeKeydown = (event) => {
    if (!props.isPreviewing) return
    
    // 允许的操作：选择、复制、粘贴（只读）等
    const isAllowed = 
      event.shiftKey ||  // Shift + 箭头键进行选择
      event.ctrlKey ||   // Ctrl 组合键
      event.metaKey ||   // Mac Command 组合键
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Home' ||
      event.key === 'End' ||
      event.key === 'PageUp' ||
      event.key === 'PageDown'
    
    if (!isAllowed) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const onPreviewModeBeforeinput = (event) => {
    if (!props.isPreviewing) return
    event.preventDefault()
    event.stopPropagation()
  }

  const onOpenDocument = (event) => emit('open-document', event.detail || event)
  const onInsertCard = (event) => emit('insert-document-card', event.detail || event)

  const onCommentClick = (event) => {
    if (event.target.closest('.comment-preview-popup')) return
    if (commentMenuVisible.value) {
      commentMenuVisible.value = false
      return
    }

    const target = event.target.closest('.comment-mark')
    if (!target) return

    event.preventDefault()
    event.stopPropagation()

    const commentIdsStr = target.getAttribute('data-comment-ids')
    if (commentIdsStr) {
      try {
        const commentIds = JSON.parse(commentIdsStr)
        if (commentIds.length > 1) {
          setMenuAtTarget(target, buildCommentItems(commentIds))
        } else {
          emit('open-comment-drawer', commentIds[0])
          emit('comment-click', commentIds[0])
        }
        return
      } catch (e) {
        console.error('解析评论 ID 失败:', e)
      }
    }

    const commentId = target.getAttribute('data-comment-id')
    if (commentId) {
      emit('open-comment-drawer', commentId)
      emit('comment-click', commentId)
    }
  }

  const onCommentHover = (event) => {
    const target = event.target.closest('.comment-mark')
    if (!target) return

    const commentIdsStr = target.getAttribute('data-comment-ids')
    if (!commentIdsStr) return

    try {
      const commentIds = JSON.parse(commentIdsStr)
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
    } catch (e) {
      console.error('解析评论 ID 失败:', e)
    }
  }

  const onClickOutside = (event) => {
    if (commentMenuVisible.value && !event.target.closest('.comment-preview-popup')) {
      commentMenuVisible.value = false
    }
  }

  editorElement.addEventListener('open-document', onOpenDocument)
  editorElement.addEventListener('insert-document-card', onInsertCard)
  editorElement.addEventListener('click', onCommentClick)
  editorElement.addEventListener('mouseover', onCommentHover)
  editorElement.addEventListener('mouseout', clearTooltip)
  // 暂时注释掉预览模式事件处理来测试
  // editorElement.addEventListener('keydown', onPreviewModeKeydown)
  // editorElement.addEventListener('beforeinput', onPreviewModeBeforeinput)
  document.addEventListener('click', onClickOutside)

  return () => {
    editorElement.removeEventListener('open-document', onOpenDocument)
    editorElement.removeEventListener('insert-document-card', onInsertCard)
    editorElement.removeEventListener('click', onCommentClick)
    editorElement.removeEventListener('mouseover', onCommentHover)
    editorElement.removeEventListener('mouseout', clearTooltip)
    // editorElement.removeEventListener('keydown', onPreviewModeKeydown)
    // editorElement.removeEventListener('beforeinput', onPreviewModeBeforeinput)
    document.removeEventListener('click', onClickOutside)
  }
}

/** ---------------- lifecycle ---------------- */
let cleanupDomListeners = null

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
  debouncedHashtagSync.cancel?.()
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
}

.editor-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 0px 20px 80px;
  min-height: 500px;
  user-select: text;
  -webkit-user-select: text;
}

/* 评论高亮效果（临时高亮，用于跳转定位） */
::deep([data-block-id].comment-highlight) {
  background: rgba(0, 0, 0, 0.08);
  transition: background-color var(--transition-normal) var(--ease-standard);
}

/* 评论标记样式 - 轻微背景高亮 */
:deep(.ProseMirror .comment-mark) {
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  padding: 2px 0;
  position: relative;
  cursor: pointer;
  display: inline;
  transition: background-color var(--transition-fast) var(--ease-standard);
}

:deep(.ProseMirror .comment-mark:hover) {
  background: rgba(0, 0, 0, 0.1);
}

/* 编辑器容器需要相对定位 */
.editor-wrapper {
  position: relative;
}

.editor-content {
  position: relative;
}



/* 确保标记不会超出编辑器边界 */
:deep(.ProseMirror) {
  position: relative;
  overflow: visible;
}

/* Tiptap 编辑器样式 */
:deep(.ProseMirror) {
  outline: none;
  font-size: 16px;
  line-height: 1.8;
  color: #1a1a1a;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
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
  letter-spacing: -0.02em;
}

:deep(.ProseMirror h2) {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.3;
  margin: 1.2em 0 0.5em;
  color: #1a1a1a;
  letter-spacing: -0.01em;
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
  font-style: normal;
}

:deep(.ProseMirror code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 3px 6px;
  border-radius: 4px;
  font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
  font-size: 0.9em;
  color: #1a1a1a;
}

/* 块级代码：与正文更自然地融合 */
::deep(.ProseMirror pre) {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  padding: 1.2em 1.5em;
  margin: 1.5em 0;
  overflow-x: auto;
  font-size: 15px;
  line-height: 1.6;
}

/* pre 里的 code：继承正文字体，避免突兀 */
::deep(.ProseMirror pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
  font-family: inherit;       /* 不再强制等宽 */
  font-size: 1em;
  line-height: inherit;
  white-space: pre-wrap;      /* 自动换行，更贴近 “段落” 的阅读感 */
  word-break: break-word;
}

:deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
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

/* 表格样式 - 语雀/Notion 极简风格 */
:deep(.ProseMirror table) {
  border-collapse: collapse;
  margin: 0.75em 0;
  width: 100%;
  font-size: 14px;
  line-height: 1.5;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.2) !important;
  border-radius: 4px;
  overflow: visible;
  outline: 1px solid rgba(0, 0, 0, 0.2);
  outline-offset: 0;
}

/* 表格单元格基础样式 */
:deep(.ProseMirror table td),
:deep(.ProseMirror table th) {
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
  border-right: 1px solid rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
  border-left: none;
  border-top: none;
  background: transparent;
  transition: background-color var(--transition-fast) var(--ease-standard);
}

/* 第一列显示左边框（表格外边框） */
:deep(.ProseMirror table th:first-child),
:deep(.ProseMirror table td:first-child) {
  border-left: 1px solid rgba(0, 0, 0, 0.2);
}

/* 第一行显示上边框（表格外边框） */
:deep(.ProseMirror table thead th) {
  border-top: 1px solid rgba(0, 0, 0, 0.2);
}

/* 最后一列不显示右边框（表格外边框已提供） */
:deep(.ProseMirror table td:last-child),
:deep(.ProseMirror table th:last-child) {
  border-right: none;
}

/* 最后一行不显示下边框（表格外边框已提供） */
:deep(.ProseMirror table tr:last-child td) {
  border-bottom: none;
}

/* 表头样式 - 使用浅米黄色背景，增强对比度 */
:deep(.ProseMirror table th) {
  background: rgba(249, 230, 217, 0.4);
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

/* 表格行 hover 效果 - 轻微背景高亮 */
:deep(.ProseMirror table tbody tr:hover td) {
  background: rgba(249, 230, 217, 0.2);
}

/* 表头行不应用 hover，保持原背景 */
:deep(.ProseMirror table thead tr:hover th) {
  background: rgba(249, 230, 217, 0.4);
}

/* 选中单元格样式（编辑状态） */
:deep(.ProseMirror table td.selectedCell),
:deep(.ProseMirror table th.selectedCell) {
  background: rgba(22, 93, 255, 0.08);
  outline: 2px solid rgba(22, 93, 255, 0.2);
  outline-offset: -2px;
}

:deep(.ProseMirror hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 2em 0;
}

/* 行内文档引用样式 */
:deep(.ProseMirror .inline-doc-ref) {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 2px;
  background: rgba(22, 93, 255, 0.1);
  color: var(--yuque-primary);
  border-radius: 6px;
  font-size: 0.95em;
  cursor: pointer;
  transition: background var(--transition-fast);
  user-select: none;
}

:deep(.ProseMirror .inline-doc-ref:hover) {
  background: rgba(22, 93, 255, 0.15);
}

/* 卡片文档引用样式 */
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
  color: var(--text-primary);
}

.comment-preview-count {
  font-size: 11px;
  color: var(--text-tertiary);
}

.comment-preview-text {
  color: var(--text-secondary);
  word-break: break-word;
}

/* 评论预览弹框（单条预览模式） */
.comment-preview-popup {
  position: fixed;
  transform: translate(-50%, -100%);
  margin-top: -12px;
  z-index: 1001;
  width: 280px; /* 略微收窄 */
  background: transparent;
  pointer-events: auto;
}

/* 小三角指向锚点 */
.comment-preview-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #ffffff;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  z-index: 1;
}

/* 评论预览内容区域 */
.comment-preview-content {
  position: relative;
  width: 100%;
  height: 110px; /* 固定高度，比原来略矮，避免遮挡大面积正文 */
  background: #ffffff;
  border: 1px solid rgba(223, 224, 230, 0.9);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(15, 15, 30, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 左右切换按钮 - 放在弹框外侧，避免遮挡内容 */
.comment-preview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  color: var(--text-primary, #333);
}

.comment-preview-nav:hover:not(:disabled) {
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.comment-preview-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.comment-preview-nav--prev {
  left: -36px; /* 移到弹框左侧外侧 */
}

.comment-preview-nav--next {
  right: -36px; /* 移到弹框右侧外侧 */
}

/* 评论预览卡片 */
.comment-preview-card {
  flex: 1;
  padding: 14px 44px 32px 16px; /* 右侧留出空间给分页指示，按钮已移到外侧所以不需要左侧 padding */
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  transition: background-color 0.15s ease;
  overflow: hidden;
}

/* 只有一条评论时，去掉多余的 padding */
.comment-preview-card--single {
  padding: 14px 16px 16px 16px;
}

.comment-preview-card:hover {
  background: rgba(22, 93, 255, 0.04);
}

.comment-preview-card-author {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin-bottom: 8px;
  flex-shrink: 0;
}

.comment-preview-card-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary, #666);
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3; /* 最多显示 3 行 */
  line-clamp: 3; /* 标准属性 */
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  flex: 1;
}

/* 分页指示 */
.comment-preview-pagination {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 11px;
  color: var(--text-tertiary, #999);
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 4px;
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

/* 评论按钮 - 右上角浮动按钮 */
.comment-toggle-btn {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 100;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--text-primary, #333);
}

.comment-toggle-btn:hover {
  background: rgba(22, 93, 255, 0.08);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
  transform: translateY(-2px);
}

.comment-toggle-btn:active {
  transform: translateY(0);
}

.comment-toggle-btn svg {
  flex-shrink: 0;
}

.comment-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: var(--yuque-primary, #2254f4);
  color: #ffffff;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Preview Mode Styles */
.is-previewing :deep(.ProseMirror) {
  cursor: default !important;
  /* 在预览模式下允许文本选择 */
  user-select: text !important;
  -webkit-user-select: text !important;
}

.is-previewing :deep(.ProseMirror-selectednode) {
  outline: none;
}

/* 编辑模式下确保文本可选 */
:deep(.ProseMirror) {
  user-select: text;
  -webkit-user-select: text;
}

.is-previewing :deep(.slash-menu) {
  display: none;
}

.is-previewing :deep(.comment-mark) {
  pointer-events: none;
  background: transparent;
}

/* 图片容器样式 */
:deep(.kb-img-container) {
  position: relative;
  margin: 16px 0; /* 与段落保持一致的排版节奏 */
  line-height: 1.6;
}

:deep(.kb-img-wrapper) {
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
}

/* Editor.vue 或公共样式里 */
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

/* 尺寸档位（大厂常用稳定排版方式） */
:deep(.kb-img--sm)   { max-width: 320px; }
:deep(.kb-img--md)   { max-width: 640px; }
:deep(.kb-img--lg)   { max-width: 960px; }
:deep(.kb-img--full) { max-width: 100%; }

/* 对齐 */
:deep(.kb-img--left)   { margin-left: 0; margin-right: auto; }
:deep(.kb-img--center) { margin-left: auto; margin-right: auto; }
:deep(.kb-img--right)  { margin-left: auto; margin-right: 0; }

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.kb-img--sm),
  :deep(.kb-img--md),
  :deep(.kb-img--lg) {
    max-width: 100% !important; /* 窄屏自动降级到100%宽 */
  }
}

/* 长图样式 */
:deep(.kb-img--long) {
  position: relative;
}

:deep(.kb-img--long:not(.kb-img--expanded)) {
  max-height: 400px;
  object-fit: cover;
  mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
}

/* 加载状态 */
:deep(.kb-img-loading) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #666;
  font-size: 14px;
}

:deep(.kb-img-loading-spinner) {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #409eff;
  border-radius: 50%;
  animation: kb-img-spin 1s linear infinite;
  margin-bottom: 8px;
}

@keyframes kb-img-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 错误状态 */
:deep(.kb-img-error) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #f56c6c;
  font-size: 14px;
}

:deep(.kb-img-error-icon) {
  font-size: 24px;
  margin-bottom: 8px;
}

:deep(.kb-img-retry-btn) {
  margin-top: 8px;
  padding: 4px 12px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

:deep(.kb-img-retry-btn:hover) {
  background: #66b1ff;
}

/* 展开按钮 */
:deep(.kb-img-expand-btn) {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
}

:deep(.kb-img-expand-btn:hover) {
  background: rgba(0, 0, 0, 0.9);
}

/* Lightbox 样式 */
:deep(.kb-img-lightbox) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

:deep(.kb-img-lightbox-content) {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

:deep(.kb-img-lightbox-content img) {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

:deep(.kb-img-lightbox-close) {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

:deep(.kb-img-lightbox-close:hover) {
  background: rgba(0, 0, 0, 0.9);
}


</style>
