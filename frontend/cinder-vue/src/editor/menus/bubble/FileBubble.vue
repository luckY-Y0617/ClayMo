<!-- src/editor/components/FileBubble.vue -->
<template>
  <BubbleMenu
    v-if="editor"
    :editor="editor"
    :should-show="shouldShow"
    :tippy-options="tippyOptions"
  >
    <div
      ref="bubbleEl"
      class="kb-file-bubble"
      @mousedown.prevent
      @pointerdown.prevent
      @pointerenter="onBubbleEnter"
      @pointerleave="onBubbleLeave"
    >
      <button class="kb-bubble-btn" title="预览" @click="previewFile">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h6v6"></path>
          <path d="M10 14L21 3"></path>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        </svg>
      </button>

      <button class="kb-bubble-btn" title="下载" @click="downloadFile">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </button>

      <button class="kb-bubble-btn" title="复制链接" @click="copyLink">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"></path>
          <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"></path>
        </svg>
      </button>

      <div class="kb-bubble-divider"></div>

      <button class="kb-bubble-btn danger" title="删除" @click="deleteNode">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    </div>
  </BubbleMenu>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { BubbleMenu } from '@tiptap/vue-3'
import { NodeSelection, TextSelection } from 'prosemirror-state'

const TOP_TOOLBAR_SELECTOR = '.format-toolbar'
const EDITOR_WRAP_SELECTOR = '.editor-content'

const props = defineProps({
  editor: { type: Object, required: true },
  stickyTop: { type: Number, default: 88 },
  gap: { type: Number, default: 8 },
})

const editor = computed(() => props.editor)
const hoverUI = computed(() => editor.value?.storage?.fileBlock?.hoverUI || null)

const bubbleEl = ref(null)
const bubbleHeight = ref(44)
let ro = null

// 关键：永远有 fallback rect（彻底杜绝 left of null）
let lastRect = new DOMRect(0, 0, 1, 1)

onMounted(() => {
  if (!bubbleEl.value) return
  ro = new ResizeObserver(() => {
    const h = bubbleEl.value?.getBoundingClientRect?.().height
    if (h) bubbleHeight.value = h
  })
  ro.observe(bubbleEl.value)
})

onBeforeUnmount(() => {
  const s = hoverUI.value
  if (s) {
    clearHideTimer()
    s.pos = null
    s.overFile = false
    s.overBubble = false
  }
  ro?.disconnect?.()
  ro = null
})

const clearHideTimer = () => {
  const s = hoverUI.value
  if (s?.hideTimer) {
    clearTimeout(s.hideTimer)
    s.hideTimer = null
  }
}

const scheduleHideIfNeeded = (delay = 100) => {
  const ed = editor.value
  const s = hoverUI.value
  if (!ed || !s) return

  clearHideTimer()
  s.hideTimer = setTimeout(() => {
    try {
      if (!ed || !ed.view || ed.isDestroyed) return
      if (s.overFile || s.overBubble) return
      if (typeof s.pos !== 'number') return

      const pos = s.pos
      s.pos = null

      const { state, dispatch } = ed.view
      if (!Number.isInteger(pos) || pos < 0 || pos > state.doc.content.size) return

      const n = state.doc.nodeAt(pos)
      let after = n ? pos + n.nodeSize : pos + 1
      after = Math.max(0, Math.min(after, state.doc.content.size))

      try {
        const selection = TextSelection.create(state.doc, after)
        dispatch(state.tr.setSelection(selection))
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }, delay)
}

const onBubbleEnter = () => {
  const s = hoverUI.value
  const ed = editor.value
  if (!s || !ed) return
  s.overBubble = true
  clearHideTimer()

  const sel = ed.state.selection
  if (sel instanceof NodeSelection) s.pos = sel.from
}

const onBubbleLeave = () => {
  const s = hoverUI.value
  if (!s) return
  s.overBubble = false
  scheduleHideIfNeeded(100)
}

const shouldShow = ({ state }) => {
  const sel = state.selection
  return sel instanceof NodeSelection && sel.node?.type?.name === 'fileBlock'
}

const getFileBlockExtOptions = () => {
  const ed = editor.value
  const ext = ed?.extensionManager?.extensions?.find((e) => e.name === 'fileBlock')
  return ext?.options || {}
}

const safeBlurBeforeExternal = () => {
  try {
    clearHideTimer()
    const s = hoverUI.value
    if (s) {
      s.overBubble = false
      s.overFile = false
    }
    editor.value?.commands?.blur?.()
  } catch {
    // ignore
  }
}

const safeOpen = (url) => {
  if (!url) return
  safeBlurBeforeExternal()
  requestAnimationFrame(() => {
    try {
      window.open(url, '_blank', 'noopener')
    } catch {
      // ignore
    }
  })
}

const downloadByAnchor = (url, fileName) => {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'download'
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const downloadByBlob = async (url, fileName) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = fileName || 'download'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

const tippyOptions = computed(() => ({
  appendTo: () => document.body,
  interactive: true,
  placement: 'top',
  offset: [0, props.gap],
  arrow: false,
  theme: '',
  popperOptions: {
    strategy: 'fixed',
    modifiers: [
      { name: 'preventOverflow', options: { padding: 8 } },
      { name: 'flip', enabled: false },
    ],
  },

  // 关键：永不返回 null
  getReferenceClientRect: () => {
    try {
      const ed = editor.value
      if (!ed) return lastRect

      const { state, view } = ed
      const sel = state.selection
      if (!(sel instanceof NodeSelection) || sel.node?.type?.name !== 'fileBlock') return lastRect

      const dom = view.nodeDOM(sel.from)
      if (!(dom instanceof HTMLElement)) return lastRect

      const host = dom.closest('.file-block-view') || dom
      const card = host.querySelector('.file-block-card') || host
      if (!(card instanceof HTMLElement)) return lastRect

      const cardRect = card.getBoundingClientRect()
      if (!cardRect) return lastRect

      const toolbarEl = document.querySelector(TOP_TOOLBAR_SELECTOR)
      const toolbarRect = toolbarEl?.getBoundingClientRect?.()
      const toolbarBottom = toolbarRect ? toolbarRect.bottom : props.stickyTop

      const needSpace = bubbleHeight.value + props.gap
      const bubbleTopIfNormal = cardRect.top - needSpace

      if (bubbleTopIfNormal < toolbarBottom + 4) {
        const contentEl = document.querySelector(EDITOR_WRAP_SELECTOR) || view.dom
        const contentRect = contentEl.getBoundingClientRect()

        const width = Math.max(Math.min(cardRect.width, contentRect.width), 20)
        const maxLeft = contentRect.right - width
        const left = Math.min(Math.max(cardRect.left, contentRect.left), maxLeft)

        const virtualTop = toolbarBottom + needSpace
        lastRect = new DOMRect(left, virtualTop, width, 20)
        return lastRect
      }

      lastRect = cardRect
      return lastRect
    } catch {
      return lastRect
    }
  },
}))

const getSelectedFileAttrs = () => {
  const ed = editor.value
  if (!ed) return null
  const sel = ed.state.selection
  if (!(sel instanceof NodeSelection) || sel.node?.type?.name !== 'fileBlock') return null
  return sel.node.attrs || null
}

const previewFile = async () => {
  const attrs = getSelectedFileAttrs()
  if (!attrs) return

  const opts = getFileBlockExtOptions()
  try {
    if (typeof opts.onPreview === 'function') {
      safeBlurBeforeExternal()
      await opts.onPreview(attrs, { editor: editor.value })
      return
    }

    const url =
      typeof opts.resolvePreviewUrl === 'function'
        ? opts.resolvePreviewUrl(attrs)
        : (attrs.src || null)

    safeOpen(url)
  } catch (e) {
    console.error(e)
  }
}

const downloadFile = async () => {
  const attrs = getSelectedFileAttrs()
  if (!attrs) return

  const opts = getFileBlockExtOptions()
  const url =
    typeof opts.resolveDownloadUrl === 'function'
      ? opts.resolveDownloadUrl(attrs)
      : (attrs.src || null)

  if (!url) return

  const fileName = attrs.fileName || 'download'
  const size = Number(attrs.fileSize || 0)

  safeBlurBeforeExternal()

  requestAnimationFrame(async () => {
    try {
      if (typeof opts.onDownload === 'function') {
        await opts.onDownload(attrs, { editor: editor.value })
        return
      }

      const strategy = opts.downloadStrategy || 'auto'
      const threshold = Number(opts.blobThresholdBytes || 0)

      if (strategy === 'blob') {
        await downloadByBlob(url, fileName)
        return
      }
      if (strategy === 'a') {
        downloadByAnchor(url, fileName)
        return
      }

      // auto：小文件 blob，大文件 a（避免大文件 blob 占内存）
      if (threshold > 0 && size > 0 && size <= threshold) {
        await downloadByBlob(url, fileName)
      } else {
        downloadByAnchor(url, fileName)
      }
    } catch (e) {
      console.error(e)
    }
  })
}

const copyLink = async () => {
  const attrs = getSelectedFileAttrs()
  if (!attrs) return
  const opts = getFileBlockExtOptions()

  const url =
    typeof opts.resolveShareUrl === 'function'
      ? opts.resolveShareUrl(attrs)
      : (attrs.fileId ? `${location.origin}/file/${attrs.fileId}` : '')

  if (!url) return

  try {
    await navigator.clipboard.writeText(url)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = url
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

const deleteNode = async () => {
  const attrs = getSelectedFileAttrs()
  if (!attrs) return
  const opts = getFileBlockExtOptions()

  try {
    safeBlurBeforeExternal()
    if (typeof opts.onRemove === 'function') {
      await opts.onRemove(attrs, { editor: editor.value })
    }
  } catch (e) {
    console.error(e)
  } finally {
    editor.value?.chain?.().focus?.().deleteSelection?.().run?.()
  }
}
</script>

<style scoped>
:global(.tippy-box) {
  background-color: transparent !important;
  color: inherit !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
}
:global(.tippy-box > .tippy-arrow) {
  display: none !important;
}

.kb-file-bubble {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 4px 6px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
  animation: bubble-fade-in 0.16s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes bubble-fade-in {
  from { opacity: 0; transform: scale(0.95) translateY(2px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.kb-bubble-btn {
  width: 28px;
  height: 28px;
  padding: 6px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #555;
  transition: background 0.2s, color 0.2s;
}

.kb-bubble-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.kb-bubble-btn.danger {
  color: #d14343;
}

.kb-bubble-divider {
  width: 1px;
  height: 14px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 2px;
}
</style>
