<!-- ImageBubbleMenu.vue -->
<template>
    <BubbleMenu
      v-if="editor"
      :editor="editor"
      :should-show="shouldShow"
      :tippy-options="tippyOptions"
    >
      <div
        ref="bubbleEl"
        class="kb-image-bubble"
        @mousedown.prevent
        @pointerenter="onBubbleEnter"
        @pointerleave="onBubbleLeave"
        @pointerdown.prevent
      >
        <button
          class="kb-bubble-btn"
          :class="{ active: align === 'left' }"
          title="Left Align"
          @click="setAlign('left')"
          v-html="Icons.AlignLeft"
        />
        <button
          class="kb-bubble-btn"
          :class="{ active: align === 'center' }"
          title="Center Align"
          @click="setAlign('center')"
          v-html="Icons.AlignCenter"
        />
        <button
          class="kb-bubble-btn"
          :class="{ active: align === 'right' }"
          title="Right Align"
          @click="setAlign('right')"
          v-html="Icons.AlignRight"
        />
  
        <div class="kb-bubble-divider"></div>
  
        <button
          class="kb-bubble-btn"
          title="Reset Size"
          @click="resetSize"
          v-html="Icons.Reset"
        />
  
        <div class="kb-bubble-divider"></div>
  
        <button
          class="kb-bubble-btn"
          title="Comment"
          @click="addComment"
          v-html="Icons.Comment"
        />
  
        <div class="kb-bubble-divider"></div>
  
        <button
          class="kb-bubble-btn danger"
          title="Delete"
          @click="deleteNode"
          v-html="Icons.Delete"
        />
      </div>
    </BubbleMenu>
  </template>
  
  <script setup>
  import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
  import { BubbleMenu } from '@tiptap/vue-3'
  import { NodeSelection, TextSelection } from 'prosemirror-state'
  
  /**
   * 你需要改这两个选择器：
   * 1) TOP_TOOLBAR_SELECTOR：页面顶部工具栏（吸顶时 bubble 要贴在它下面）
   * 2) EDITOR_WRAP_SELECTOR：编辑器内容区容器（吸顶时 bubble 横向对齐它/并限制不溢出）
   */
  const TOP_TOOLBAR_SELECTOR = '.format-toolbar' // ← 改成你实际的顶部 toolbar
  const EDITOR_WRAP_SELECTOR = '.editor-content' // ← 改成你实际的编辑器内容区容器
  
  const props = defineProps({
    editor: { type: Object, required: true },
  
    /**
     * 找不到 TOP_TOOLBAR_SELECTOR 时兜底
     */
    stickyTop: { type: Number, default: 88 },
  
    /** Bubble 与参考点间距 */
    gap: { type: Number, default: 8 },
  })
  
  const editor = computed(() => props.editor)
  const hoverUI = computed(() => editor.value?.storage?.image?.hoverUI || null)
  
  const bubbleEl = ref(null)
  const bubbleHeight = ref(44)
  
  let ro = null
  const tippyInstance = ref(null)

  const handleResizeUpdate = () => {
    // 强制更新 bubble 位置
    if (tippyInstance.value) {
      tippyInstance.value.popperInstance?.update()
    }
  }

  onMounted(() => {
    if (!bubbleEl.value) return
    ro = new ResizeObserver(() => {
      const h = bubbleEl.value?.getBoundingClientRect?.().height
      if (h) bubbleHeight.value = h
    })
    ro.observe(bubbleEl.value)

    // 监听图片 resize 事件
    editor.value?.view.dom.addEventListener('image-resize-update', handleResizeUpdate)
  })
  
  onBeforeUnmount(() => {
    // 清理 hoverUI 状态
    const s = hoverUI.value
    if (s) {
      clearHideTimer()
      s.pos = null
      s.overImage = false
      s.overBubble = false
    }
    
    ro?.disconnect?.()
    ro = null
    editor.value?.view.dom.removeEventListener('image-resize-update', handleResizeUpdate)
  })

  // ...

  /** =========================
   *  飞书式：操作宽限期 + "钉住直到鼠标下一次移动"
   * ========================= */
  const ACTION_GRACE_MS = 450
  let graceUntil = 0
  let actionPinned = false
  
  const lastPointer = { x: 0, y: 0 }
  
  const clearHideTimer = () => {
    const s = hoverUI.value
    if (s?.hideTimer) {
      clearTimeout(s.hideTimer)
      s.hideTimer = null
    }
  }
  
  const scheduleHideIfNeeded = (delay = 100) => {  // 从 220ms 减少到 100ms
    const ed = editor.value
    const s = hoverUI.value
    if (!ed || !s) return

    clearHideTimer()
    s.hideTimer = setTimeout(() => {
      try {
        // 检查编辑器是否仍然有效
        if (!ed || !ed.view || ed.isDestroyed) return
        
        if (s.overImage || s.overBubble) return
        if (typeof s.pos !== 'number') return

        const pos = s.pos
        s.pos = null

        const { state, dispatch } = ed.view
        // 检查位置是否有效
        if (!Number.isInteger(pos) || pos < 0 || pos > state.doc.content.size) {
          return
        }
        
        const n = state.doc.nodeAt(pos)
        let after = n ? pos + n.nodeSize : pos + 1
        after = Math.max(0, Math.min(after, state.doc.content.size))
        
        // 尝试创建有效的 TextSelection
        try {
          const selection = TextSelection.create(state.doc, after)
          if (selection && selection.from >= 0 && selection.to <= state.doc.content.size) {
            dispatch(state.tr.setSelection(selection))
          }
        } catch (e) {
          // 如果无法创建 TextSelection，就不设置选择
          console.debug('Cannot create TextSelection at position:', after)
        }
      } catch (e) {
        console.debug('Error in scheduleHideIfNeeded:', e)
      }
    }, delay)
  }
  
  /**
   * 根据当前鼠标位置，重新判定"到底在 bubble 上还是在当前图片上"
   * 用来处理：点击居左/居右导致 bubble 瞬移，从而触发 pointerleave 的抖动问题
   */
  const syncHoverByPointer = () => {
    const ed = editor.value
    const s = hoverUI.value
    if (!ed || !s) return
  
    const el = document.elementFromPoint(lastPointer.x, lastPointer.y)
    if (!(el instanceof HTMLElement)) return
  
    // 是否在 bubble/tippy 上
    const overBubbleNow =
      !!el.closest('.kb-image-bubble') ||
      !!el.closest('.tippy-box') ||
      !!el.closest('[data-tippy-root]')
  
    // 是否在"当前选中 image"的 nodeView 上（避免误判到别的图片）
    let overActiveImageNow = false
    const { state, view } = ed
    const sel = state.selection
  
    if (sel instanceof NodeSelection && sel.node?.type?.name === 'image') {
      // 取当前选中图片的 dom，定位它的 image-block-view
      const dom = view.nodeDOM(sel.from)
      const activeHost =
        dom instanceof HTMLElement ? (dom.closest('.image-block-view') || dom) : null
  
      const hitHost = el.closest('.image-block-view')
      overActiveImageNow = !!activeHost && activeHost === hitHost
    }
  
    s.overBubble = overBubbleNow
    s.overImage = overActiveImageNow
  }
  
  /**
   * 进入"操作宽限期"：对齐/重置等动作后 bubble 不要因为瞬移触发 leave 而消失
   * - 期间强制 overBubble=true
   * - 并"钉住"直到鼠标下一次移动再重新判定
   */
  const beginActionGrace = async (ms = ACTION_GRACE_MS) => {
    const s = hoverUI.value
    if (!s) return
  
    graceUntil = Date.now() + ms
    actionPinned = true
  
    s.overBubble = true
    clearHideTimer()
  
    // 等 Vue + tippy/Popper 完成一次布局重算，再同步一次 hover 状态
    await nextTick()
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            syncHoverByPointer()

            // 如果此刻既不在 bubble 也不在图片上，则允许隐藏（更自然）
            const ss = hoverUI.value
            if (ss && !ss.overBubble && !ss.overImage) scheduleHideIfNeeded(80)  // 从 200ms 减少到 80ms
          })
        })
  }
  
  /** 记录鼠标位置；并在 actionPinned 时，鼠标一动就解除"钉住"并重算状态 */
  const onWinPointerMove = (e) => {
    lastPointer.x = e.clientX
    lastPointer.y = e.clientY
  
    if (actionPinned) {
      actionPinned = false
      syncHoverByPointer()

      const s = hoverUI.value
      if (s && !s.overBubble && !s.overImage) scheduleHideIfNeeded(100)  // 从 180ms 减少到 100ms
    }
  }
  
  onMounted(() => window.addEventListener('pointermove', onWinPointerMove, { passive: true }))
  onBeforeUnmount(() => window.removeEventListener('pointermove', onWinPointerMove))
  
  /** bubble hover */
  const onBubbleEnter = () => {
    const s = hoverUI.value
    if (!s) return
    s.overBubble = true
    clearHideTimer()
  }
  
  const onBubbleLeave = () => {
    const s = hoverUI.value
    if (!s) return

    // ✅ 飞书式：操作宽限期/钉住期间忽略 leave
    if (Date.now() < graceUntil) return
    if (actionPinned) return

    s.overBubble = false
    scheduleHideIfNeeded(100)
  }
  
  /** icons */
  const Icons = {
    AlignLeft: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>`,
    AlignCenter: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>`,
    AlignRight: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>`,
    Reset: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`,
    Comment: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`,
    Delete: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  }
  
  const align = computed(() => editor.value?.getAttributes('image')?.align || 'left')
  
  /** 只在 NodeSelection(image) 时显示（和你 ImageBlock 的 hover->NodeSelection 配套） */
  const shouldShow = ({ state }) => {
    const sel = state.selection
    return sel instanceof NodeSelection && sel.node?.type?.name === 'image'
  }
  
  /**
   * 位置策略：
   * - 正常：bubble 在图片上方
   * - 吸顶：bubble 固定在顶部 toolbar 下方
   *   且 X 轴跟随图片自身 rect（解决居右吸顶跑中间）
   */
  const tippyOptions = computed(() => ({
    appendTo: () => document.body,
    interactive: true, // 重要：bubble 可交互（飞书式）
    placement: 'top',
    offset: [0, props.gap],
    arrow: false, // 禁用默认三角
    theme: '', // 清空主题，不使用任何默认 tippy 样式

    onMount(instance) {
      tippyInstance.value = instance
      // 彻底清除所有默认 tippy 样式
      if (instance.popper) {
        instance.popper.classList.remove('light')
        const box = instance.popper.querySelector('.tippy-box')
        if (box) {
          box.removeAttribute('data-theme')
          box.style.backgroundColor = 'transparent !important'
          box.style.boxShadow = 'none !important'
          box.style.border = 'none !important'
          box.style.padding = '0 !important'
          box.style.color = 'inherit !important'
        }
        const arrow = instance.popper.querySelector('.tippy-arrow')
        if (arrow) {
          arrow.style.display = 'none !important'
        }
      }
    },

    popperOptions: {
      strategy: 'fixed',
      modifiers: [
        { name: 'preventOverflow', options: { padding: 8 } },
        { name: 'flip', enabled: false }, // 不翻到图片下方
      ],
    },

    getReferenceClientRect: () => {
      const ed = editor.value
      if (!ed) return null
  
      const { state, view } = ed
      const sel = state.selection
      if (!(sel instanceof NodeSelection) || sel.node?.type?.name !== 'image') return null
  
      const dom = view.nodeDOM(sel.from)
      if (!(dom instanceof HTMLElement)) return null
  
      const host = dom.closest('.image-block-view') || dom
      const wrapper = host.querySelector('.image-block-wrapper') || host
      const imgRect = wrapper.getBoundingClientRect()
  
      // 顶部工具栏 bottom
      const toolbarEl = document.querySelector(TOP_TOOLBAR_SELECTOR)
      const toolbarRect = toolbarEl?.getBoundingClientRect?.()
      const toolbarBottom = toolbarRect ? toolbarRect.bottom : props.stickyTop
  
      const needSpace = bubbleHeight.value + props.gap
      const bubbleTopIfNormal = imgRect.top - needSpace
  
      // 吸顶：虚拟 rect 放在 toolbarBottom 下方
      if (bubbleTopIfNormal < toolbarBottom + 4) {
        const contentEl = document.querySelector(EDITOR_WRAP_SELECTOR) || view.dom
        const contentRect = contentEl.getBoundingClientRect()
  
        // ✅ X 轴跟随图片自身位置（居左/居中/居右都正确）
        const imgLeft = imgRect.left
        const imgWidth = imgRect.width
  
        // clamp 到内容区内，避免溢出
        const width = Math.max(Math.min(imgWidth, contentRect.width), 20)
        const maxLeft = contentRect.right - width
        const left = Math.min(Math.max(imgLeft, contentRect.left), maxLeft)
  
        const virtualTop = toolbarBottom + needSpace
        return new DOMRect(left, virtualTop, width, 20)
      }
  
      return imgRect
    },
  }))
  
  /** actions：更新属性后保持选中状态，进入宽限期 */
  const setAlign = async (value) => {
    const ed = editor.value
    if (!ed) return
    
    // 更新对齐方式，保持选中状态
    ed.chain().focus().updateAttributes('image', { align: value }).run()
    
    // 进入操作宽限期，防止 bubble 因位置变化而闪烁
    await beginActionGrace()
  }
  
  const resetSize = async () => {
    const ed = editor.value
    if (!ed) return
    
    ed.chain().focus().updateAttributes('image', { width: null }).run()
    await beginActionGrace()
  }
  
  const addComment = async () => {
    editor.value.view?.dom?.dispatchEvent(
      new CustomEvent('add-comment-to-selection', { bubbles: true }),
    )
    await beginActionGrace()
  }
  
  const deleteNode = () => {
    // 删除不需要宽限期，删完 bubble 自然消失
    editor.value.chain().focus().deleteSelection().run()
  }
  </script>
  
  <style scoped>
/* 彻底去除 tippy 默认样式（黑底、阴影等） */
:global(.kb-image-bubble) {
  --tippy-border-radius: 6px;
}

:global(.tippy-box) {
  background-color: transparent !important;
  color: inherit !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
}

:global(.tippy-box[data-theme~='image-bubble']) {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
}

:global(.tippy-box > .tippy-arrow) {
  display: none !important;
}

:global(.tippy-box[data-theme~='image-bubble'] > .tippy-arrow) {
  display: none !important;
}

.kb-image-bubble {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 4px 6px;
    border-radius: 6px;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    white-space: nowrap;
    /* 平滑进入动画 */
    animation: bubble-fade-in 0.16s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  
  @keyframes bubble-fade-in {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(2px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  .kb-bubble-btn {
    width: 24px;
    height: 24px;
    padding: 4px;
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
  .kb-bubble-btn.active {
    color: #3370ff;
  }
  .kb-bubble-btn.danger {
    color: #d14343;
  }
  
  .kb-bubble-divider {
    width: 1px;
    height: 14px;
    background: rgba(0, 0, 0, 0.1);
  }
  </style>
  