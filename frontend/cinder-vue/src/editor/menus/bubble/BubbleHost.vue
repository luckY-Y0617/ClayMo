<!--
  BubbleHost.vue
  
<!-- BubbleHost.vue -->
<!-- 统一浮层管理器：Selection 驱动为主，Hover 只做“视觉入口”；拿不到有效 rect 不显示，下一帧重试；避免初始 NodeSelection 导致一进来就选中图片 -->
<template>
  <Teleport to="body">
    <div
      v-show="shouldShowBubble"
      ref="bubbleEl"
      class="kb-bubble-host"
      :style="bubbleStyle"
      @mouseenter="handleBubbleEnter"
      @mouseleave="handleBubbleLeave"
    >
      <CommentPanel
        v-if="panelType === 'comment'"
        :editor="editor"
        @submit="handleCommentSubmit"
        @cancel="handleCancel"
        @lock="isLocked = true"
        @unlock="isLocked = false"
      />
      <ImagePanel
        v-else-if="panelType === 'image'"
        :editor="editor"
        :node-attrs="currentNodeAttrs"
        @action-start="handleActionStart"
        @delete="handleDelete"
        @preview="handlePreview"
      />
      <FilePanel
        v-else-if="panelType === 'file'"
        :editor="editor"
        :node-attrs="currentNodeAttrs"
        @action-start="handleActionStart"
        @delete="handleDelete"
        @preview="handlePreview"
      />
      <LinkPanel
        v-else-if="panelType === 'link'"
        :editor="editor"
        @action-start="handleActionStart"
      />
    </div>
  </Teleport>

  <PreviewModal
    :visible="previewVisible"
    :file-id="previewAttrs.fileId"
    :file-name="previewAttrs.fileName"
    :file-type="previewAttrs.fileType"
    :file-size="previewAttrs.fileSize"
    :file-ext="previewAttrs.fileExt"
    :src="previewAttrs.src"
    :resolve-preview-url="resolvePreviewUrl"
    :resolve-download-url="resolveDownloadUrl"
    @close="previewVisible = false"
  />
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount, provide, nextTick } from 'vue'
import { TextSelection } from 'prosemirror-state'
import CommentPanel from './panels/CommentPanel.vue'
import ImagePanel from './panels/ImagePanel.vue'
import FilePanel from './panels/FilePanel.vue'
import LinkPanel from './panels/LinkPanel.vue'
import PreviewModal from '@/components/common/PreviewModal.vue'

const props = defineProps({
  editor: { type: Object, required: true },
  isPreviewing: { type: Boolean, default: false }, // 外部“预览模式”
  stickyTop: { type: Number, default: 88 },
  gap: { type: Number, default: 8 },
})
const emit = defineEmits(['comment-submit'])
const bubbleEl = ref(null)
const editor = computed(() => props.editor)

/* ---------------- 状态 ---------------- */
const hoverNodeType = ref(null) // 'image' | 'file' | null
const hoverNodePos = ref(null)
const isBubbleHovered = ref(false)
const isLocked = ref(false)
const isResizing = ref(false)
const isSuspended = ref(false) // 外部动作/弹窗期间暂停
const previewVisible = ref(false)
const previewAttrs = reactive({ fileId: '', fileName: '', fileType: '', fileSize: 0, fileExt: '', src: '' })

/* 文本选区稳定控制（避免拖动选区过程中闪 bubble） */
const isTextSelecting = ref(false)
const selectionStableTimer = ref(null)
const selectionDebounceTimer = ref(null)
const lastSelectionRange = ref({ from: -1, to: -1 })
const shouldShowTextBubble = ref(false)

/* hover-leave 清理延迟（避免从 node 移动到 bubble 的竞态） */
const hoverClearTimer = ref(null)

/* ---------------- selection 识别（结构性判断，不用 instanceof） ---------------- */
const isCodeBlockRange = (ed, pos) => {
  try {
    const $from = ed.state.doc.resolve(pos)
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === 'codeBlock') return true
    }
    return false
  } catch {
    return false
  }
}
const isImageNodeName = (name) => name === 'image' || name === 'imageBlock'
const selectionState = computed(() => {
  const ed = editor.value
  if (!ed || ed.isDestroyed || !ed.view) return { type: null, pos: null, attrs: null }
  const sel = ed.state.selection
  if (sel?.node) {
    const nodeName = sel.node.type.name
    if (isImageNodeName(nodeName)) return { type: 'image', pos: sel.from, attrs: sel.node.attrs }
    if (nodeName === 'fileBlock') return { type: 'file', pos: sel.from, attrs: sel.node.attrs }
  }
  if (sel.from !== sel.to && ed.isFocused) {
    if (isTextSelecting.value) return { type: null, pos: null, attrs: null }
    if (!shouldShowTextBubble.value) return { type: null, pos: null, attrs: null }
    if (isCodeBlockRange(ed, sel.from)) return { type: null, pos: null, attrs: null }
    return { type: 'comment', pos: sel.from, attrs: null }
  }
  return { type: null, pos: null, attrs: null }
})

/* ---------------- 面板仲裁（Selection 优先，Hover 作为补充入口） ---------------- */
const panelType = computed(() => {
  if (isLocked.value) return 'comment'
  if (props.isPreviewing) return null
  if (previewVisible.value) return null
  if (isResizing.value) return null
  if (isSuspended.value) return null
  const sel = selectionState.value
  if (sel.type) return sel.type
  if (isTextSelecting.value) return null
  if (hoverNodeType.value) return hoverNodeType.value
  return null
})
const shouldShowBubble = computed(() => panelType.value !== null)

/* ---------------- 当前节点 attrs ---------------- */
const currentNodeAttrs = computed(() => {
  const sel = selectionState.value
  if (sel.attrs) return sel.attrs
  if (hoverNodeType.value && hoverNodePos.value !== null) {
    const ed = editor.value
    if (!ed || ed.isDestroyed) return null
    const node = ed.state.doc.nodeAt(hoverNodePos.value)
    return node?.attrs || null
  }
  return null
})

/* ---------------- hoverState 同步（给 NodeView overlay 用） ---------------- */
const getImageHoverState = (ed) => ed?.storage?.image?.hoverState || ed?.storage?.imageBlock?.hoverState || null
const getFileHoverState = (ed) => ed?.storage?.fileBlock?.hoverState || null
const clearAllHoverState = () => {
  const ed = editor.value
  if (!ed) return
  const imageState = getImageHoverState(ed)
  if (imageState) { imageState.hoveredPos = null; imageState.isHovering = false; imageState.isBubbleHover = false }
  const fileState = getFileHoverState(ed)
  if (fileState) { fileState.hoveredPos = null; fileState.isHovering = false; fileState.isBubbleHover = false }
  hoverNodeType.value = null
  hoverNodePos.value = null
}

/* ---------------- 定位（拿不到有效 rect 就隐藏，下一帧重试） ---------------- */
const bubbleStyle = ref({ position: 'fixed', top: '0px', left: '0px', zIndex: 10000, opacity: 0, pointerEvents: 'none' })
let rafId = null
let retryCount = 0
const MAX_RETRY = 10
let lastValidRect = null

const isValidRect = (rect) => {
  if (!rect) return false
  if (rect.width <= 0 || rect.height <= 0) return false
  if (rect.top === 0 && rect.left === 0 && rect.width < 10) return false
  return true
}
const pickTargetEl = (dom, kind) => {
  if (!(dom instanceof HTMLElement)) return null
  if (kind === 'image') {
    return dom.closest('.image-block-view')?.querySelector('.image-block-wrapper') || dom
  }
  if (kind === 'file') {
    return dom.closest('.file-block-view')?.querySelector('.file-block-card') || dom
  }
  return dom
}
const getReferenceRect = () => {
  const ed = editor.value
  if (!ed || ed.isDestroyed || !ed.view) return null
  const sel = ed.state.selection
  if (sel?.node) {
    const name = sel.node.type.name
    const kind = isImageNodeName(name) ? 'image' : (name === 'fileBlock' ? 'file' : null)
    const dom = ed.view.nodeDOM(sel.from)
    const el = pickTargetEl(dom, kind)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return isValidRect(rect) ? rect : null
  }
  if (hoverNodePos.value !== null && hoverNodeType.value) {
    const dom = ed.view.nodeDOM(hoverNodePos.value)
    const el = pickTargetEl(dom, hoverNodeType.value)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return isValidRect(rect) ? rect : null
  }
  const hasRange = sel.from !== sel.to
  if (hasRange) {
    try {
      const start = ed.view.coordsAtPos(sel.from)
      const end = ed.view.coordsAtPos(sel.to)
      const rect = new DOMRect(
        Math.min(start.left, end.left),
        Math.min(start.top, end.top),
        Math.abs(end.left - start.left) || 100,
        Math.abs(end.bottom - start.top) || 20
      )
      return isValidRect(rect) ? rect : null
    } catch {
      return null
    }
  }
  return null
}
const hideBubble = () => {
  bubbleStyle.value.opacity = 0
  bubbleStyle.value.pointerEvents = 'none'
}
/**
 * ========== 定位计算逻辑 ==========
 * 移动端优化版本：
 * 1. 动态计算边界padding
 * 2. 确保bubble不会超出视窗
 * 3. 响应式宽度限制
 */
const updatePosition = () => {
  if (!shouldShowBubble.value || !bubbleEl.value) {
    hideBubble()
    retryCount = 0
    return
  }
  const rect = getReferenceRect()
  if (!rect) {
    hideBubble()
    if (retryCount < MAX_RETRY) {
      retryCount++
      requestAnimationFrame(updatePosition)
    }
    return
  }
  retryCount = 0
  lastValidRect = rect
  const bubbleHeight = bubbleEl.value?.offsetHeight || 44
  const bubbleWidth = bubbleEl.value?.offsetWidth || 200
  
  // 移动端检测
  const vw = window.innerWidth
  const vh = window.innerHeight
  const isMobile = vw <= 768
  
  // 根据设备类型设置边界padding
  const edgePadding = isMobile ? 16 : 8
  
  // 确保bubble不会超出视窗宽度
  const maxBubbleWidth = vw - (edgePadding * 2)
  const actualBubbleWidth = Math.min(bubbleWidth, maxBubbleWidth)
  
  // 计算垂直位置
  let top = lastValidRect.top - bubbleHeight - props.gap
  const toolbarEl = document.querySelector('.format-toolbar')
  const toolbarBottom = toolbarEl?.getBoundingClientRect?.().bottom || props.stickyTop
  if (top < toolbarBottom + 4) {
    top = lastValidRect.top + lastValidRect.height + props.gap
  }
  
  // 计算水平位置（居中对齐）
  let left = lastValidRect.left + (lastValidRect.width / 2) - (actualBubbleWidth / 2)
  
  // 边界限制
  left = Math.max(edgePadding, Math.min(left, vw - actualBubbleWidth - edgePadding))
  top = Math.max(edgePadding, Math.min(top, vh - bubbleHeight - edgePadding))
  
  // 应用样式
  bubbleStyle.value = { 
    position: 'fixed', 
    top: `${Math.round(top)}px`, 
    left: `${Math.round(left)}px`, 
    maxWidth: `${maxBubbleWidth}px`,
    zIndex: 10000, 
    opacity: 1, 
    pointerEvents: 'auto' 
  }
}
const scheduleUpdatePosition = () => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    updatePosition()
    rafId = null
  })
}

/* ---------------- 外部动作统一安全执行器（blur + suspend + rAF） ---------------- */
const runActionSafely = async (fn) => {
  const ed = editor.value
  try {
    isSuspended.value = true
    hideBubble()
    ed?.commands?.blur?.()
    await new Promise((r) => requestAnimationFrame(r))
    await fn?.()
  } catch (e) {
    console.error(e)
  } finally {
    isSuspended.value = false
    nextTick(scheduleUpdatePosition)
  }
}

/* ---------------- 事件：hover/resize（来自 NodeView 自定义事件） ---------------- */
const clearHoverClearTimer = () => {
  if (hoverClearTimer.value) { clearTimeout(hoverClearTimer.value); hoverClearTimer.value = null }
}
const handleBubbleStateChange = (e) => {
  const { type, nodeType, pos } = e.detail || {}
  if (!type) return
  switch (type) {
    case 'hover-enter': {
      clearHoverClearTimer()
      hoverNodeType.value = nodeType === 'fileBlock' ? 'file' : nodeType
      hoverNodePos.value = typeof pos === 'number' ? pos : null
      nextTick(scheduleUpdatePosition)
      break
    }
    case 'hover-leave': {
      clearHoverClearTimer()
      hoverClearTimer.value = setTimeout(() => {
        if (isBubbleHovered.value) return
        if (selectionState.value.type) return
        hoverNodeType.value = null
        hoverNodePos.value = null
        scheduleUpdatePosition()
      }, 80)
      break
    }
    case 'resize-start': {
      isResizing.value = true
      hideBubble()
      break
    }
    case 'resize-move': {
      scheduleUpdatePosition()
      break
    }
    case 'resize-end': {
      isResizing.value = false
      nextTick(scheduleUpdatePosition)
      break
    }
  }
}

/* ---------------- bubble enter/leave：让 NodeView overlay 在 bubble 上也保持可见 ---------------- */
const handleBubbleEnter = () => {
  isBubbleHovered.value = true
  clearHoverClearTimer()
  const ed = editor.value
  const imageState = getImageHoverState(ed)
  if (imageState) imageState.isBubbleHover = true
  const fileState = getFileHoverState(ed)
  if (fileState) fileState.isBubbleHover = true
}
const handleBubbleLeave = (e) => {
  isBubbleHovered.value = false
  const ed = editor.value
  const imageState = getImageHoverState(ed)
  if (imageState) imageState.isBubbleHover = false
  const fileState = getFileHoverState(ed)
  if (fileState) fileState.isBubbleHover = false
  const rt = e?.relatedTarget
  if (rt instanceof HTMLElement) {
    if (rt.closest('.image-block-view') || rt.closest('.file-block-view')) return
  }
  if (!selectionState.value.type) {
    clearAllHoverState()
    scheduleUpdatePosition()
  }
}

/* ---------------- 统一关闭评论 bubble（避免 isLocked 跨过 selection 收缩那一帧）---------------- */
const closeCommentBubble = () => {
  isLocked.value = false
  shouldShowTextBubble.value = false
  isTextSelecting.value = false
  if (selectionStableTimer.value) { clearTimeout(selectionStableTimer.value); selectionStableTimer.value = null }
  if (selectionDebounceTimer.value) { clearTimeout(selectionDebounceTimer.value); selectionDebounceTimer.value = null }
}

/* ---------------- 全局 pointerdown：点击 bubble 外部时立即关闭评论（捕获阶段，不 preventDefault）---------------- */
const onGlobalPointerDown = (e) => {
  // 只处理评论面板打开的情况
  if (panelType.value !== 'comment') return
  const host = bubbleEl.value
  const target = e.target
  // 点在 bubble 内部：不关闭
  if (host && target instanceof Node && host.contains(target)) return
  // 点在编辑器正文：直接关闭评论面板（避免 isLocked 导致的中间态闪烁）
  const ed = editor.value
  const root = ed?.view?.dom
  if (root && target instanceof Node && root.contains(target)) {
    closeCommentBubble()
  }
}

/* ---------------- 文本选区稳定：只处理"正文区域"拖选，不干扰图片/文件点击 ---------------- */
const isEventInsideEditorText = (e) => {
  const ed = editor.value
  const root = ed?.view?.dom
  if (!root || !root.contains(e.target)) return false
  const el = e.target instanceof HTMLElement ? e.target : null
  if (!el) return false
  if (el.closest('.image-block-view') || el.closest('.file-block-view')) return false
  return true
}
const handleMouseDown = (e) => {
  if (e.button !== 0) return
  if (!isEventInsideEditorText(e)) return
  isTextSelecting.value = true
  shouldShowTextBubble.value = false
  if (selectionDebounceTimer.value) { clearTimeout(selectionDebounceTimer.value); selectionDebounceTimer.value = null }
  if (selectionStableTimer.value) { clearTimeout(selectionStableTimer.value); selectionStableTimer.value = null }
}
const handleMouseUp = () => {
  if (!isTextSelecting.value) return
  isTextSelecting.value = false
  if (selectionStableTimer.value) clearTimeout(selectionStableTimer.value)
  selectionStableTimer.value = setTimeout(() => {
    const ed = editor.value
    if (!ed || ed.isDestroyed) return
    const sel = ed.state.selection
    if (sel.from !== sel.to) {
      shouldShowTextBubble.value = true
      scheduleUpdatePosition()
    }
  }, 160)
}

/* ---------------- selection 监听：用 tiptap 事件，不用 Vue watch(editor.state.selection) ---------------- */
let offEditor = null
const bindEditorEvents = () => {
  const ed = editor.value
  if (!ed || ed.isDestroyed) return
  const onAny = () => scheduleUpdatePosition()
  const onBlur = () => {
    if (isLocked.value) return
    if (!selectionState.value.type) clearAllHoverState()
    scheduleUpdatePosition()
  }
  ed.on('selectionUpdate', onAny)
  ed.on('transaction', onAny)
  ed.on('focus', onAny)
  ed.on('blur', onBlur)
  offEditor = () => {
    try {
      ed.off('selectionUpdate', onAny)
      ed.off('transaction', onAny)
      ed.off('focus', onAny)
      ed.off('blur', onBlur)
    } catch {}
  }
}

/* ---------------- 初始进入：避免默认 NodeSelection 落在 image/file 上 ---------------- */
const fixInitialSelection = () => {
  const ed = editor.value
  if (!ed || ed.isDestroyed || !ed.view) return
  const sel = ed.state.selection
  if (!sel?.node) return
  const name = sel.node.type.name
  if (!isImageNodeName(name) && name !== 'fileBlock') return
  const after = Math.min(sel.from + sel.node.nodeSize, ed.state.doc.content.size)
  const next = TextSelection.near(ed.state.doc.resolve(after), 1)
  ed.view.dispatch(ed.state.tr.setSelection(next))
}

/* ---------------- Watchers：panelType 改变时重新测量；selection 收缩时自动解锁 ---------------- */
watch(panelType, () => { nextTick(scheduleUpdatePosition) })

// 保险：selection 收缩（键盘 Esc、程序 setSelection 等）时自动解锁，避免"锁定但无选区"的中间态
watch(() => props.editor?.state?.selection, (sel) => {
  if (!sel) return
  // 如果 isLocked 但选区已收缩（from === to），立即关闭评论
  if (isLocked.value && sel.from === sel.to) {
    closeCommentBubble()
  }
}, { deep: false })

/* ---------------- 生命周期：scroll/resize + 文本选择 + bubble-state-change + pointerdown ---------------- */
let scrollCleanup = null
let resizeCleanup = null
let mouseCleanup = null
let pointerDownCleanup = null
onMounted(() => {
  document.addEventListener('bubble-state-change', handleBubbleStateChange)
  document.addEventListener('mousedown', handleMouseDown, true)
  document.addEventListener('mouseup', handleMouseUp, true)
  // 捕获阶段监听 pointerdown，用于点击 bubble 外部时立即关闭评论
  document.addEventListener('pointerdown', onGlobalPointerDown, true)
  mouseCleanup = () => {
    document.removeEventListener('mousedown', handleMouseDown, true)
    document.removeEventListener('mouseup', handleMouseUp, true)
  }
  pointerDownCleanup = () => {
    document.removeEventListener('pointerdown', onGlobalPointerDown, true)
  }
  const onScroll = () => scheduleUpdatePosition()
  const onResize = () => scheduleUpdatePosition()
  const editorWrap = document.querySelector('.editor-content')
  if (editorWrap) {
    editorWrap.addEventListener('scroll', onScroll, { passive: true })
    scrollCleanup = () => editorWrap.removeEventListener('scroll', onScroll)
  }
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  resizeCleanup = () => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('scroll', onScroll)
  }
  bindEditorEvents()
  nextTick(() => requestAnimationFrame(() => { fixInitialSelection(); scheduleUpdatePosition() }))
})
onBeforeUnmount(() => {
  document.removeEventListener('bubble-state-change', handleBubbleStateChange)
  if (rafId) cancelAnimationFrame(rafId)
  clearHoverClearTimer()
  if (selectionStableTimer.value) clearTimeout(selectionStableTimer.value)
  if (selectionDebounceTimer.value) clearTimeout(selectionDebounceTimer.value)
  scrollCleanup?.()
  resizeCleanup?.()
  mouseCleanup?.()
  pointerDownCleanup?.()
  offEditor?.()
})

/* ---------------- Action handlers ---------------- */
const handleCommentSubmit = (payload) => {
  emit('comment-submit', payload)
  isLocked.value = false
}
const handleCancel = () => { isLocked.value = false }
const handleActionStart = () => { /* 预留：埋点/锁定/暂停 */ }

const handleDelete = async () => {
  await runActionSafely(async () => {
    const ed = editor.value
    if (!ed) return
    ed.chain().focus().deleteSelection().run()
  })
}
const handlePreview = async (attrs) => {
  if (!attrs) return
  await runActionSafely(async () => {
    Object.assign(previewAttrs, {
      fileId: attrs.fileId || '',
      fileName: attrs.fileName || '',
      fileType: attrs.fileType || '',
      fileSize: attrs.fileSize || 0,
      fileExt: attrs.fileExt || '',
      src: attrs.src || '',
    })
    previewVisible.value = true
  })
}

const resolvePreviewUrl = async (attrs) => {
  const ed = editor.value
  const ext = ed?.extensionManager?.extensions?.find((e) => e.name === 'fileBlock')
  const opts = ext?.options || {}
  if (typeof opts.resolvePreviewUrl === 'function') return opts.resolvePreviewUrl(attrs)
  return attrs.src || (attrs.fileId ? `/api/files/${attrs.fileId}/content?disposition=inline` : '')
}
const resolveDownloadUrl = async (attrs) => {
  const ed = editor.value
  const ext = ed?.extensionManager?.extensions?.find((e) => e.name === 'fileBlock')
  const opts = ext?.options || {}
  if (typeof opts.resolveDownloadUrl === 'function') return opts.resolveDownloadUrl(attrs)
  return attrs.src || (attrs.fileId ? `/api/files/${attrs.fileId}/content?disposition=attachment` : '')
}

/* ---------------- provide ---------------- */
provide('bubbleContext', { isLocked, clearAllHoverState, runActionSafely })
</script>

<!-- ========== 样式定义 ========== -->
<style scoped>
.kb-bubble-host {
  display: flex;
  align-items: center;
  animation: bubble-fade-in 0.12s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  will-change: transform, opacity;
  box-sizing: border-box;
}

@keyframes bubble-fade-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* ========== 移动端响应式适配 ========== */
@media (max-width: 768px) {
  .kb-bubble-host {
    max-width: calc(100vw - 32px) !important;
    min-width: auto !important;
  }
  
  /* 确保子面板也响应式 */
  .kb-bubble-host :deep(*) {
    max-width: 100%;
    box-sizing: border-box;
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .kb-bubble-host {
    max-width: calc(100vw - 24px) !important;
  }
}

/* 横屏模式优化 */
@media (max-width: 768px) and (orientation: landscape) {
  .kb-bubble-host {
    max-width: calc(100vw - 40px) !important;
  }
}
</style>
