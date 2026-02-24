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
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, provide, nextTick, type CSSProperties } from 'vue'
import { TextSelection } from 'prosemirror-state'
import type { Editor } from '@tiptap/vue-3'

import CommentPanel from './panels/CommentPanel.vue'
import ImagePanel from './panels/ImagePanel.vue'
import FilePanel from './panels/FilePanel.vue'
import LinkPanel from './panels/LinkPanel.vue'

interface PreviewAttrs {
  fileId: string
  fileName: string
  fileType: string
  fileSize: number
  fileExt: string
  src: string
}

interface Props {
  editor: Editor
  isPreviewing?: boolean
  canCreateComment?: boolean
  suspended?: boolean
  stickyTop?: number
  gap?: number
  autoShowComment?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPreviewing: false,
  canCreateComment: true,
  suspended: false,
  stickyTop: 88,
  gap: 8,
  autoShowComment: false,
})

const emit = defineEmits<{
  'comment-submit': [payload: unknown]
}>()

const bubbleEl = ref<HTMLElement | null>(null)
const editor = computed(() => props.editor)

/* ---------------- 状态 ---------------- */
const hoverNodeType = ref<'image' | 'file' | null>(null)
const hoverNodePos = ref<number | null>(null)
const isBubbleHovered = ref(false)
const isLocked = ref(false)
const isResizing = ref(false)
const isSuspended = ref(false)

/* 文本选区稳定控制 */
const isTextSelecting = ref(false)
const selectionStableTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const selectionDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const shouldShowTextBubble = ref(false)

/* hover-leave 清理延迟 */
const hoverClearTimer = ref<ReturnType<typeof setTimeout> | null>(null)

/* ---------------- selection 识别 ---------------- */
const isCodeBlockRange = (ed: Editor, pos: number): boolean => {
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

const isImageNodeName = (name: string) => name === 'image' || name === 'imageBlock'

interface SelectionState {
  type: 'image' | 'file' | 'comment' | null
  pos: number | null
  attrs: Record<string, unknown> | null
}

const selectionState = computed<SelectionState>(() => {
  const ed = editor.value
  if (!ed || ed.isDestroyed || !ed.view) return { type: null, pos: null, attrs: null }
  const sel = ed.state.selection as { node?: { type: { name: string }; attrs: Record<string, unknown> }; from: number; to: number }
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

/* ---------------- 面板仲裁 ---------------- */
const panelType = computed(() => {
  if (props.suspended) return null
  if (isLocked.value && !props.canCreateComment) return null
  if (isLocked.value) return 'comment'
  if (props.isPreviewing) return null
  if (isResizing.value) return null
  if (isSuspended.value) return null
  const sel = selectionState.value
  if (sel.type === 'comment' && !props.canCreateComment) return null
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

/* ---------------- hoverState 同步 ---------------- */
interface HoverState {
  hoveredPos: number | null
  isHovering: boolean
  isBubbleHover: boolean
}

const getImageHoverState = (ed: Editor): HoverState | null => {
  const storage = ed?.storage as { image?: { hoverState?: HoverState }; imageBlock?: { hoverState?: HoverState } }
  return storage?.image?.hoverState || storage?.imageBlock?.hoverState || null
}

const getFileHoverState = (ed: Editor): HoverState | null => {
  const storage = ed?.storage as { fileBlock?: { hoverState?: HoverState } }
  return storage?.fileBlock?.hoverState || null
}

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

watch(() => props.suspended, (isSusp) => {
  if (isSusp) clearAllHoverState()
})

/* ---------------- 定位 ---------------- */
const bubbleStyle = ref<CSSProperties>({ position: 'fixed', top: '0px', left: '0px', zIndex: 10000, opacity: 0, pointerEvents: 'none' })
let rafId: number | null = null
let retryCount = 0
const MAX_RETRY = 10
let lastValidRect: DOMRect | null = null

const isValidRect = (rect: DOMRect | null): rect is DOMRect => {
  if (!rect) return false
  if (rect.width <= 0 || rect.height <= 0) return false
  if (rect.top === 0 && rect.left === 0 && rect.width < 10) return false
  return true
}

const pickTargetEl = (dom: unknown, kind: string): HTMLElement | null => {
  if (!(dom instanceof HTMLElement)) return null
  if (kind === 'image') {
    return dom.closest('.image-block-view')?.querySelector('.image-block-wrapper') as HTMLElement || dom
  }
  if (kind === 'file') {
    return dom.closest('.file-block-view')?.querySelector('.file-block-card') as HTMLElement || dom
  }
  return dom
}

const getReferenceRect = (): DOMRect | null => {
  const ed = editor.value
  if (!ed || ed.isDestroyed || !ed.view) return null
  const sel = ed.state.selection as { node?: { type: { name: string }; nodeSize: number }; from: number; to: number }
  if (sel?.node) {
    const name = sel.node.type.name
    const kind = isImageNodeName(name) ? 'image' : (name === 'fileBlock' ? 'file' : null)
    if (!kind) return null
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

/* ---------------- 外部动作安全执行器 ---------------- */
const runActionSafely = async (fn?: () => Promise<void> | void) => {
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

/* ---------------- 事件处理 ---------------- */
const clearHoverClearTimer = () => {
  if (hoverClearTimer.value) { clearTimeout(hoverClearTimer.value); hoverClearTimer.value = null }
}

const handleBubbleStateChange = (e: Event) => {
  const detail = (e as CustomEvent<{ type: string; nodeType: string; pos?: number }>).detail
  const { type, nodeType, pos } = detail || {}
  if (!type) return
  switch (type) {
    case 'hover-enter': {
      clearHoverClearTimer()
      hoverNodeType.value = nodeType === 'fileBlock' ? 'file' : (nodeType as 'image' | 'file')
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

const handleBubbleEnter = () => {
  isBubbleHovered.value = true
  clearHoverClearTimer()
  const ed = editor.value
  const imageState = getImageHoverState(ed)
  if (imageState) imageState.isBubbleHover = true
  const fileState = getFileHoverState(ed)
  if (fileState) fileState.isBubbleHover = true
}

const handleBubbleLeave = (e: MouseEvent) => {
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

/* ---------------- 统一关闭评论 bubble ---------------- */
const closeCommentBubble = () => {
  isLocked.value = false
  shouldShowTextBubble.value = false
  isTextSelecting.value = false
  if (selectionStableTimer.value) { clearTimeout(selectionStableTimer.value); selectionStableTimer.value = null }
  if (selectionDebounceTimer.value) { clearTimeout(selectionDebounceTimer.value); selectionDebounceTimer.value = null }
}

/* ---------------- 全局 pointerdown ---------------- */
const onGlobalPointerDown = (e: PointerEvent) => {
  if (panelType.value !== 'comment') return
  const host = bubbleEl.value
  const target = e.target
  if (host && target instanceof Node && host.contains(target)) return
  const ed = editor.value
  const root = ed?.view?.dom
  if (root && target instanceof Node && root.contains(target)) {
    closeCommentBubble()
  }
}

/* ---------------- 文本选区稳定 ---------------- */
const isEventInsideEditorText = (e: MouseEvent): boolean => {
  const ed = editor.value
  const root = ed?.view?.dom
  if (!root || !root.contains(e.target as Node)) return false
  const el = e.target instanceof HTMLElement ? e.target : null
  if (!el) return false
  if (el.closest('.image-block-view') || el.closest('.file-block-view')) return false
  return true
}

const handleMouseDown = (e: MouseEvent) => {
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
    if (sel.from !== sel.to && props.autoShowComment) {
      shouldShowTextBubble.value = true
      scheduleUpdatePosition()
    }
  }, 160)
}

/* ---------------- editor 事件绑定 ---------------- */
let offEditor: (() => void) | null = null
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
    } catch { /* ignore */ }
  }
}

/* ---------------- 初始进入修复 ---------------- */
const fixInitialSelection = () => {
  const ed = editor.value
  if (!ed || ed.isDestroyed || !ed.view) return
  const sel = ed.state.selection as { node?: { type: { name: string }; nodeSize: number }; from: number }
  if (!sel?.node) return
  const name = sel.node.type.name
  if (!isImageNodeName(name) && name !== 'fileBlock') return
  const after = Math.min(sel.from + sel.node.nodeSize, ed.state.doc.content.size)
  const next = TextSelection.near(ed.state.doc.resolve(after), 1)
  ed.view.dispatch(ed.state.tr.setSelection(next))
}

/* ---------------- Watchers ---------------- */
watch(panelType, () => { nextTick(scheduleUpdatePosition) })

watch(() => props.editor?.state?.selection, (sel) => {
  if (!sel) return
  if (isLocked.value && sel.from === sel.to) {
    closeCommentBubble()
  }
}, { deep: false })

/* ---------------- 生命周期 ---------------- */
let scrollCleanup: (() => void) | null = null
let resizeCleanup: (() => void) | null = null
let mouseCleanup: (() => void) | null = null
let pointerDownCleanup: (() => void) | null = null

onMounted(() => {
  document.addEventListener('bubble-state-change', handleBubbleStateChange as EventListener)
  document.addEventListener('mousedown', handleMouseDown as EventListener, true)
  document.addEventListener('mouseup', handleMouseUp as EventListener, true)
  document.addEventListener('pointerdown', onGlobalPointerDown as EventListener, true)
  
  mouseCleanup = () => {
    document.removeEventListener('mousedown', handleMouseDown as EventListener, true)
    document.removeEventListener('mouseup', handleMouseUp as EventListener, true)
  }
  pointerDownCleanup = () => {
    document.removeEventListener('pointerdown', onGlobalPointerDown as EventListener, true)
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
  document.removeEventListener('bubble-state-change', handleBubbleStateChange as EventListener)
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
const handleCommentSubmit = (payload: unknown) => {
  emit('comment-submit', payload)
  isLocked.value = false
}

const handleCancel = () => { isLocked.value = false }
const handleActionStart = () => { /* 预留 */ }

const handleDelete = async () => {
  await runActionSafely(async () => {
    const ed = editor.value
    if (!ed) return
    ed.chain().focus().deleteSelection().run()
  })
}

const handlePreview = async (attrs: PreviewAttrs) => {
  if (!attrs) return
  await runActionSafely(async () => {
    // TODO: 打开预览弹窗
    console.log('Preview:', attrs)
  })
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

