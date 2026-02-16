/**
 * useBubbleContext.js
 * 
 * BubbleHost 的核心逻辑：场景识别、仲裁、定位、生命周期
 * 
 * 大厂做法（飞书/语雀级）：
 * - 单实例浮层系统
 * - 结构性判断（不依赖 instanceof）
 * - 有条件的优先级规则
 * - 统一的安全执行器 runActionSafely
 * - scroll/resize 节流更新
 * - lastRect 回退机制
 */

import { ref, computed, watch, onBeforeUnmount, shallowRef } from 'vue'

// ============ 常量 ============

/** 场景类型 */
export const CONTEXT_TYPES = {
  NONE: 'none',
  COMMENT: 'comment',        // 文本选区可评论
  LINK: 'link',              // 链接编辑
  IMAGE: 'image',            // 图片节点
  FILE: 'file',              // 文件节点
  TABLE: 'table',            // 表格节点
  CODE_BLOCK: 'codeBlock',   // 代码块节点
}

/** 状态机状态 */
export const BUBBLE_STATES = {
  HIDDEN: 'hidden',
  SHOWING: 'showing',
  LOCKED: 'locked',      // 面板内部输入锁定
  SUSPENDED: 'suspended', // 预览或拖拽导致暂停
  CLOSING: 'closing',
}

/** DOM 选择器 */
const TOP_TOOLBAR_SELECTOR = '.format-toolbar'
const EDITOR_WRAP_SELECTOR = '.editor-content'

// ============ 结构性判断辅助函数（不依赖 instanceof） ============

/**
 * 判断是否为 NodeSelection
 * 结构性判断：有 node 属性且 from === $from.pos
 */
const isNodeSelection = (selection) => {
  if (!selection) return false
  // NodeSelection 的特征：有 node 属性
  return selection.node !== undefined && selection.node !== null
}

/**
 * 判断是否为 TextSelection（或其他非 NodeSelection 的范围选区）
 * 结构性判断：没有 node 属性
 */
const isTextRangeSelection = (selection) => {
  if (!selection) return false
  return selection.node === undefined || selection.node === null
}

/**
 * 判断选区是否为空
 */
const isEmptySelection = (selection) => {
  if (!selection) return true
  return selection.from === selection.to
}

/**
 * 判断是否为大范围选区（跨多个字符）
 * 用于区分"光标在链接内"和"选中了一段文本"
 */
const isLargeRangeSelection = (selection, threshold = 1) => {
  if (!selection) return false
  return Math.abs(selection.to - selection.from) > threshold
}

// ============ 辅助函数 ============

/** 安全获取 DOM Rect，永不返回 null */
let lastRect = new DOMRect(0, 0, 1, 1)

const safeGetRect = (fn) => {
  try {
    const rect = fn()
    if (rect && rect.width > 0 && rect.height > 0) {
      lastRect = rect
      return rect
    }
    return lastRect
  } catch {
    return lastRect
  }
}

/** 检查选区是否在 codeBlock 内 */
const isInCodeBlock = (state) => {
  const { from, to } = state.selection
  if (from === to) return false

  const $from = state.doc.resolve(from)
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'codeBlock') return true
  }

  let hasCodeBlock = false
  state.doc.nodesBetween(from, to, (node) => {
    if (node.type.name === 'codeBlock') {
      hasCodeBlock = true
      return false
    }
    return true
  })
  return hasCodeBlock
}

/**
 * 检查是否有文本选区且可评论
 * 结构性判断，不依赖 instanceof
 */
const canComment = (state, isFocused) => {
  if (!isFocused) return false

  const sel = state.selection
  if (isEmptySelection(sel)) return false

  // NodeSelection 不支持评论
  if (isNodeSelection(sel)) return false

  // codeBlock 内不支持评论
  if (isInCodeBlock(state)) return false

  // 检查选区紧邻 image 节点
  const $from = state.doc.resolve(sel.from)
  const nodeAfter = $from.nodeAfter
  if (nodeAfter?.type?.name === 'image') return false

  return true
}

/**
 * 检查是否选中了链接 - 带条件判断
 * 条件：
 * 1. 光标在链接内且无大范围选区 → 返回 'edit'（可编辑链接）
 * 2. 大范围选区包含链接 → 返回 false（优先 COMMENT）
 */
const getLinkContext = (state) => {
  const sel = state.selection
  const { from, $from, to, empty } = sel

  // 空选区：检查光标是否在链接内
  if (empty) {
    const marks = $from.marks()
    const hasLink = marks.some(m => m.type.name === 'link')
    if (hasLink) {
      return 'edit' // 可编辑链接
    }
    return null
  }

  // 大范围选区：优先 COMMENT，不显示 LinkPanel
  if (isLargeRangeSelection(sel, 0)) {
    return null // 交给 COMMENT 处理
  }

  return null
}

/**
 * 获取 NodeSelection 的节点类型
 * 结构性判断，不依赖 instanceof
 */
const getNodeSelectionType = (state) => {
  const sel = state.selection

  // 结构性判断：检查是否有 node 属性
  if (!isNodeSelection(sel)) return null

  const nodeName = sel.node?.type?.name
  if (nodeName === 'image') return CONTEXT_TYPES.IMAGE
  if (nodeName === 'fileBlock') return CONTEXT_TYPES.FILE
  if (nodeName === 'table') return CONTEXT_TYPES.TABLE
  if (nodeName === 'codeBlock') return CONTEXT_TYPES.CODE_BLOCK

  return null
}

/**
 * 检查选区是否在表格 cell 内
 * 用于处理 TABLE vs IMAGE/FILE 的优先级
 */
const isInTableCell = (state) => {
  const { from } = state.selection
  const $from = state.doc.resolve(from)

  for (let d = $from.depth; d > 0; d--) {
    const nodeName = $from.node(d).type.name
    if (nodeName === 'tableCell' || nodeName === 'tableHeader') {
      return true
    }
  }
  return false
}

// ============ 节流函数 ============

const throttle = (fn, delay) => {
  let lastCall = 0
  let timeoutId = null

  return (...args) => {
    const now = Date.now()
    const remaining = delay - (now - lastCall)

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      lastCall = now
      fn(...args)
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now()
        timeoutId = null
        fn(...args)
      }, remaining)
    }
  }
}

// ============ 主 Composable ============

export function useBubbleContext(editorRef, options = {}) {
  const {
    stickyTop = 88,
    gap = 8,
    scrollThrottle = 16, // 约 60fps
    resizeThrottle = 100,
  } = options

  // ============ 状态 ============

  /** 当前激活的场景 */
  const activeContext = ref(CONTEXT_TYPES.NONE)

  /** 当前选中节点的 attrs（用于 Panel 读取） */
  const nodeAttrs = shallowRef(null)

  /** 状态机状态 */
  const bubbleState = ref(BUBBLE_STATES.HIDDEN)

  /** 全局 Guards */
  const guards = ref({
    isPreviewing: false,
    isReadonly: false,
    isDragging: false,
    isModalOpen: false,
    isComposing: false,
    isResizing: false,        // 【新增】是否正在 resize 节点
    isTextSelecting: false,   // 【新增】是否正在拖动选择文字
  })

  /** 面板锁定（如正在输入评论） */
  const isLocked = ref(false)

  /** Hover 状态（用于 NodeView 与 Bubble 协同） */
  const hoverState = ref({
    overNode: false,
    overBubble: false,
    pos: null,
    hideTimer: null,
  })

  /** Bubble 高度（用于定位计算） */
  const bubbleHeight = ref(44)

  /** 正在执行动作（用于防止动作执行期间的干扰） */
  const isActionRunning = ref(false)

  // ============ 计算属性 ============

  const editor = computed(() => editorRef.value)

  /** 是否应该显示 Bubble */
  const shouldShow = computed(() => {
    if (!editor.value) return false
    if (guards.value.isPreviewing) return false
    if (guards.value.isReadonly) return false
    if (guards.value.isDragging) return false
    if (guards.value.isModalOpen) return false
    if (guards.value.isComposing) return false

    return activeContext.value !== CONTEXT_TYPES.NONE
  })

  // ============ 场景检测（有条件的优先级规则） ============

  const detectContext = () => {
    const ed = editor.value
    if (!ed || ed.isDestroyed) {
      activeContext.value = CONTEXT_TYPES.NONE
      nodeAttrs.value = null
      return
    }

    // 锁定状态下不切换（除非节点被删除）
    if (isLocked.value) {
      // 检查当前选区是否仍然有效
      const { state } = ed
      if (activeContext.value === CONTEXT_TYPES.IMAGE || activeContext.value === CONTEXT_TYPES.FILE) {
        if (!isNodeSelection(state.selection)) {
          // 节点被删除，解锁并重新检测
          isLocked.value = false
        } else {
          return // 保持锁定
        }
      } else {
        return // 保持锁定
      }
    }

    const { state } = ed
    const sel = state.selection

    // ===== 仲裁优先级规则（有条件的） =====

    // 1. NodeSelection 优先判断（图片/文件 Hover 触发）
    if (isNodeSelection(sel)) {
      const nodeType = getNodeSelectionType(state)

      if (nodeType) {
        activeContext.value = nodeType
        nodeAttrs.value = sel.node?.attrs || null
        bubbleState.value = BUBBLE_STATES.SHOWING
        
        // 记录当前 hover 的节点位置
        hoverState.value.pos = sel.from
        return
      }
    }

    // 2. 文本选区判断（需要编辑器聚焦）
    const isFocused = ed.isFocused
    
    if (!isEmptySelection(sel) && isTextRangeSelection(sel)) {
      // 2a. 链接编辑（条件：光标在链接内 + 无大范围选区）
      const linkContext = getLinkContext(state)
      if (linkContext === 'edit' && isFocused) {
        activeContext.value = CONTEXT_TYPES.LINK
        nodeAttrs.value = null
        bubbleState.value = BUBBLE_STATES.SHOWING
        return
      }

      // 2b. 评论（大范围选区或无链接）
      if (canComment(state, isFocused)) {
        activeContext.value = CONTEXT_TYPES.COMMENT
        nodeAttrs.value = null
        bubbleState.value = BUBBLE_STATES.SHOWING
        return
      }
    }

    // 3. 空选区但光标在链接内
    if (isEmptySelection(sel) && isFocused) {
      const linkContext = getLinkContext(state)
      if (linkContext === 'edit') {
        activeContext.value = CONTEXT_TYPES.LINK
        nodeAttrs.value = null
        bubbleState.value = BUBBLE_STATES.SHOWING
        return
      }
    }

    // 4. 无场景
    activeContext.value = CONTEXT_TYPES.NONE
    nodeAttrs.value = null
    bubbleState.value = BUBBLE_STATES.HIDDEN
  }

  // ============ 定位逻辑 ============

  const getReferenceClientRect = () => {
    return safeGetRect(() => {
      const ed = editor.value
      if (!ed) return null

      const { state, view } = ed
      const sel = state.selection

      // NodeSelection：使用 nodeDOM
      if (isNodeSelection(sel)) {
        const dom = view.nodeDOM(sel.from)
        if (!(dom instanceof HTMLElement)) return null

        // 图片
        if (sel.node?.type?.name === 'image') {
          const host = dom.closest('.image-block-view') || dom
          const wrapper = host.querySelector('.image-block-wrapper') || host
          return computeRectWithToolbarAvoid(wrapper.getBoundingClientRect(), view)
        }

        // 文件
        if (sel.node?.type?.name === 'fileBlock') {
          const host = dom.closest('.file-block-view') || dom
          const card = host.querySelector('.file-block-card') || host
          return computeRectWithToolbarAvoid(card.getBoundingClientRect(), view)
        }

        // 其他节点
        return computeRectWithToolbarAvoid(dom.getBoundingClientRect(), view)
      }

      // 文本选区：使用 selection range
      if (!isEmptySelection(sel)) {
        const { from, to } = sel
        try {
          const start = view.coordsAtPos(from)
          const end = view.coordsAtPos(to)

          const rect = new DOMRect(
            Math.min(start.left, end.left),
            Math.min(start.top, end.top),
            Math.abs(end.left - start.left) || 100,
            Math.abs(end.bottom - start.top) || 20
          )

          return computeRectWithToolbarAvoid(rect, view)
        } catch {
          return null
        }
      }

      return null
    })
  }

  /** 计算考虑顶部工具栏避让的 rect */
  const computeRectWithToolbarAvoid = (rawRect, view) => {
    if (!rawRect) return lastRect

    const toolbarEl = document.querySelector(TOP_TOOLBAR_SELECTOR)
    const toolbarRect = toolbarEl?.getBoundingClientRect?.()
    const toolbarBottom = toolbarRect ? toolbarRect.bottom : stickyTop

    const needSpace = bubbleHeight.value + gap
    const bubbleTopIfNormal = rawRect.top - needSpace

    // 需要避让：推到工具栏下方
    if (bubbleTopIfNormal < toolbarBottom + 4) {
      const contentEl = document.querySelector(EDITOR_WRAP_SELECTOR) || view.dom
      const contentRect = contentEl.getBoundingClientRect()

      const width = Math.max(Math.min(rawRect.width, contentRect.width), 20)
      const maxLeft = contentRect.right - width
      const left = Math.min(Math.max(rawRect.left, contentRect.left), maxLeft)

      const virtualTop = toolbarBottom + needSpace
      return new DOMRect(left, virtualTop, width, 20)
    }

    // 水平边界：确保不超出 viewport
    const vw = window.innerWidth
    const adjustedLeft = Math.max(8, Math.min(rawRect.left, vw - rawRect.width - 8))

    if (adjustedLeft !== rawRect.left) {
      return new DOMRect(adjustedLeft, rawRect.top, rawRect.width, rawRect.height)
    }

    return rawRect
  }

  // ============ 统一安全执行器 ============

  /**
   * runActionSafely - 所有 Panel 的外部动作一律走这个
   * 
   * 流程：blur → suspend → requestAnimationFrame → 执行动作 → 恢复
   * 
   * @param {Function} actionFn - 要执行的动作函数
   * @param {Object} options - 选项
   * @param {boolean} options.shouldClose - 执行后是否关闭 bubble
   * @param {boolean} options.shouldRestore - 执行后是否恢复光标
   */
  const runActionSafely = async (actionFn, options = {}) => {
    const { shouldClose = false, shouldRestore = false } = options

    if (isActionRunning.value) return

    try {
      isActionRunning.value = true
      clearHideTimer()

      // 1. blur - 让 tippy 进入稳定态
      const ed = editor.value
      if (ed && !ed.isDestroyed) {
        try {
          ed.commands?.blur?.()
        } catch {
          // ignore
        }
      }

      // 2. suspend - 暂停更新
      const prevState = bubbleState.value
      bubbleState.value = BUBBLE_STATES.SUSPENDED

      // 3. requestAnimationFrame - 确保 DOM 稳定
      await new Promise(resolve => requestAnimationFrame(resolve))

      // 4. 执行动作
      try {
        await actionFn()
      } catch (err) {
        console.error('[BubbleHost] Action error:', err)
      }

      // 5. 恢复
      if (shouldClose) {
        closeBubble()
      } else {
        bubbleState.value = prevState

        if (shouldRestore) {
          restoreCaretAfterNode()
        }
      }
    } finally {
      isActionRunning.value = false
    }
  }

  // ============ 生命周期 ============

  const clearHideTimer = () => {
    if (hoverState.value.hideTimer) {
      clearTimeout(hoverState.value.hideTimer)
      hoverState.value.hideTimer = null
    }
  }

  const scheduleHide = (delay = 80) => {
    clearHideTimer()
    hoverState.value.hideTimer = setTimeout(() => {
      if (hoverState.value.overNode || hoverState.value.overBubble) return
      if (isLocked.value) return
      if (isActionRunning.value) return

      // 恢复光标
      restoreCaretAfterNode()

      hoverState.value.pos = null
      detectContext()
    }, delay)
  }

  /** 恢复光标到节点后面 */
  const restoreCaretAfterNode = () => {
    try {
      const ed = editor.value
      if (!ed || ed.isDestroyed) return

      const pos = hoverState.value.pos
      if (typeof pos !== 'number') return

      const { state, dispatch } = ed.view
      if (pos < 0 || pos > state.doc.content.size) return

      const n = state.doc.nodeAt(pos)
      let after = n ? pos + n.nodeSize : pos + 1
      after = Math.max(0, Math.min(after, state.doc.content.size))

      // 安全创建 TextSelection
      try {
        const $after = state.doc.resolve(after)
        // 检查目标位置是否可以放置光标
        if ($after.parent.isTextblock || $after.parent.inlineContent) {
          const { TextSelection } = require('prosemirror-state')
          const selection = TextSelection.create(state.doc, after)
          dispatch(state.tr.setSelection(selection))
        }
      } catch {
        // ignore - 位置无效
      }
    } catch {
      // ignore
    }
  }

  /** 安全模糊：在打开外部链接前调用 */
  const safeBlurBeforeExternal = () => {
    try {
      clearHideTimer()
      hoverState.value.overNode = false
      hoverState.value.overBubble = false
      isLocked.value = false
      editor.value?.commands?.blur?.()
    } catch {
      // ignore
    }
  }

  // ============ 获取扩展的 hoverUI ============

  const getExtensionHoverUI = (contextType) => {
    const ed = editor.value
    if (!ed) return null

    if (contextType === CONTEXT_TYPES.IMAGE) {
      return ed.storage?.image?.hoverUI || null
    }
    if (contextType === CONTEXT_TYPES.FILE) {
      return ed.storage?.fileBlock?.hoverUI || null
    }
    return null
  }

  // ============ 事件处理 ============

  const onBubbleEnter = () => {
    hoverState.value.overBubble = true
    clearHideTimer()

    // 同步到扩展的 hoverUI
    const extHoverUI = getExtensionHoverUI(activeContext.value)
    if (extHoverUI) {
      extHoverUI.overBubble = true
      if (extHoverUI.hideTimer) {
        clearTimeout(extHoverUI.hideTimer)
        extHoverUI.hideTimer = null
      }
    }
  }

  const onBubbleLeave = () => {
    hoverState.value.overBubble = false

    // 同步到扩展的 hoverUI
    const extHoverUI = getExtensionHoverUI(activeContext.value)
    if (extHoverUI) {
      extHoverUI.overBubble = false
    }

    if (!isLocked.value && !isActionRunning.value) {
      scheduleHide(100)
    }
  }

  const onNodeEnter = (pos) => {
    hoverState.value.overNode = true
    hoverState.value.pos = pos
    clearHideTimer()
  }

  const onNodeLeave = () => {
    hoverState.value.overNode = false
    if (!isLocked.value && !isActionRunning.value) {
      scheduleHide(80)
    }
  }

  /** 选中节点 */
  const selectNodeAt = (pos) => {
    const ed = editor.value
    if (!ed || ed.isDestroyed) return

    const { state, dispatch } = ed.view
    
    // 结构性判断
    if (isNodeSelection(state.selection) && state.selection.from === pos) return

    try {
      const { NodeSelection } = require('prosemirror-state')
      dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)))
      hoverState.value.pos = pos
      clearHideTimer()
    } catch {
      // ignore
    }
  }

  /** 锁定面板（如输入评论时） */
  const lockPanel = () => {
    isLocked.value = true
    bubbleState.value = BUBBLE_STATES.LOCKED
    clearHideTimer()
  }

  const unlockPanel = () => {
    isLocked.value = false
    if (bubbleState.value === BUBBLE_STATES.LOCKED) {
      bubbleState.value = BUBBLE_STATES.SHOWING
    }
  }

  /** 关闭 Bubble */
  const closeBubble = () => {
    bubbleState.value = BUBBLE_STATES.CLOSING

    // 下一帧完成关闭
    requestAnimationFrame(() => {
      activeContext.value = CONTEXT_TYPES.NONE
      nodeAttrs.value = null
      hoverState.value.pos = null
      isLocked.value = false
      bubbleState.value = BUBBLE_STATES.HIDDEN
      clearHideTimer()
    })
  }

  // ============ Guard 设置 ============

  const setGuard = (key, value) => {
    if (key in guards.value) {
      guards.value[key] = value

      // 某些 guard 变为 true 时立即关闭
      if (value && (key === 'isPreviewing' || key === 'isDragging' || key === 'isModalOpen')) {
        bubbleState.value = BUBBLE_STATES.SUSPENDED
      }
    }
  }

  // ============ Scroll/Resize 节流更新 ============

  let scrollCleanup = null
  let resizeCleanup = null

  const setupScrollResizeListeners = () => {
    const ed = editor.value
    if (!ed) return

    // Scroll 节流更新
    const onScroll = throttle(() => {
      if (bubbleState.value === BUBBLE_STATES.SHOWING) {
        // 触发 tippy 位置更新（通过 getReferenceClientRect）
        detectContext()
      }
    }, scrollThrottle)

    // Resize 节流更新
    const onResize = throttle(() => {
      if (bubbleState.value === BUBBLE_STATES.SHOWING) {
        detectContext()
      }
    }, resizeThrottle)

    // 监听编辑器容器滚动
    const editorWrap = document.querySelector(EDITOR_WRAP_SELECTOR)
    const scrollTarget = editorWrap || ed.view.dom.parentElement

    if (scrollTarget) {
      scrollTarget.addEventListener('scroll', onScroll, { passive: true })
      scrollCleanup = () => scrollTarget.removeEventListener('scroll', onScroll)
    }

    // 监听窗口 resize
    window.addEventListener('resize', onResize, { passive: true })
    resizeCleanup = () => window.removeEventListener('resize', onResize)
  }

  // ============ Editor 事件监听 ============

  let cleanupFns = []

  const setupListeners = () => {
    const ed = editor.value
    if (!ed) return

    // selectionUpdate
    const onSelectionUpdate = () => {
      if (!isLocked.value && !isActionRunning.value) {
        detectContext()
      }
    }

    // transaction
    const onTransaction = () => {
      if (!isLocked.value && !isActionRunning.value) {
        detectContext()
      }
    }

    // blur
    const onBlur = () => {
      if (!isLocked.value && !isActionRunning.value) {
        setTimeout(() => {
          if (!hoverState.value.overBubble) {
            closeBubble()
          }
        }, 150)
      }
    }

    // compositionstart / compositionend
    const onCompositionStart = () => {
      setGuard('isComposing', true)
    }
    const onCompositionEnd = () => {
      setGuard('isComposing', false)
    }

    // dragstart / dragend
    const onDragStart = () => {
      setGuard('isDragging', true)
    }
    const onDragEnd = () => {
      setGuard('isDragging', false)
      // 拖拽结束后重新检测
      setTimeout(() => detectContext(), 100)
    }

    ed.on('selectionUpdate', onSelectionUpdate)
    ed.on('transaction', onTransaction)
    ed.on('blur', onBlur)

    const dom = ed.view.dom
    dom.addEventListener('compositionstart', onCompositionStart)
    dom.addEventListener('compositionend', onCompositionEnd)
    dom.addEventListener('dragstart', onDragStart)
    dom.addEventListener('dragend', onDragEnd)

    cleanupFns.push(() => {
      ed.off('selectionUpdate', onSelectionUpdate)
      ed.off('transaction', onTransaction)
      ed.off('blur', onBlur)
      dom.removeEventListener('compositionstart', onCompositionStart)
      dom.removeEventListener('compositionend', onCompositionEnd)
      dom.removeEventListener('dragstart', onDragStart)
      dom.removeEventListener('dragend', onDragEnd)
    })

    // 设置 scroll/resize 监听
    setupScrollResizeListeners()
  }

  // ============ Watch ============

  watch(editor, (ed) => {
    // 清理旧监听
    cleanupFns.forEach(fn => fn())
    cleanupFns = []
    scrollCleanup?.()
    resizeCleanup?.()

    if (ed) {
      setupListeners()
      detectContext()
    }
  }, { immediate: true })

  onBeforeUnmount(() => {
    cleanupFns.forEach(fn => fn())
    cleanupFns = []
    scrollCleanup?.()
    resizeCleanup?.()
    clearHideTimer()
  })

  // ============ 返回 ============

  return {
    // 状态
    activeContext,
    nodeAttrs,
    guards,
    isLocked,
    hoverState,
    bubbleHeight,
    bubbleState,
    shouldShow,
    isActionRunning,

    // 方法
    detectContext,
    getReferenceClientRect,
    clearHideTimer,
    scheduleHide,
    safeBlurBeforeExternal,
    restoreCaretAfterNode,
    runActionSafely,

    // 事件处理
    onBubbleEnter,
    onBubbleLeave,
    onNodeEnter,
    onNodeLeave,
    selectNodeAt,
    lockPanel,
    unlockPanel,
    closeBubble,

    // Guard
    setGuard,

    // 常量
    CONTEXT_TYPES,
    BUBBLE_STATES,
  }
}

// ============ 辅助工具函数导出 ============

/** 安全打开新标签页（走 runActionSafely） */
export const safeOpenNewTab = (url, beforeOpen) => {
  if (!url) return
  beforeOpen?.()
  requestAnimationFrame(() => {
    try {
      window.open(url, '_blank', 'noopener')
    } catch {
      // ignore
    }
  })
}

/** 下载文件（通过 anchor） */
export const downloadByAnchor = (url, fileName) => {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'download'
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** 下载文件（通过 blob） */
export const downloadByBlob = async (url, fileName) => {
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

/** 复制到剪贴板 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
    return true
  }
}
