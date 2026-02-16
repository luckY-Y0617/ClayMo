/**
 * useBubbleContext.js
 * 
 * 场景识别与仲裁逻辑
 * 负责从 editor.state.selection 推导出当前场景，确定应该显示哪个 Panel
 */

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { NodeSelection, TextSelection } from 'prosemirror-state'

/**
 * Panel 类型枚举
 */
export const PanelType = {
  NONE: 'none',
  COMMENT: 'comment',
  IMAGE: 'image',
  FILE: 'file',
  LINK: 'link',
  TABLE: 'table',
  CODE_BLOCK: 'codeBlock',
}

/**
 * 状态机状态
 */
export const BubbleState = {
  HIDDEN: 'hidden',
  SHOWING: 'showing',
  LOCKED: 'locked',      // 面板内部输入锁定
  SUSPENDED: 'suspended', // 预览或拖拽导致暂停
  CLOSING: 'closing',
}

/**
 * 仲裁优先级（数值越大优先级越高）
 */
const PRIORITY = {
  [PanelType.NONE]: 0,
  [PanelType.CODE_BLOCK]: 10,
  [PanelType.TABLE]: 20,
  [PanelType.FILE]: 30,
  [PanelType.IMAGE]: 40,
  [PanelType.LINK]: 50,
  [PanelType.COMMENT]: 60,
}

/**
 * Bubble 上下文管理 Composable
 */
export function useBubbleContext(editor, options = {}) {
  const {
    isPreviewing = ref(false),
    isReadonly = ref(false),
  } = options

  // ========== 状态 ==========
  const bubbleState = ref(BubbleState.HIDDEN)
  const activePanel = ref(PanelType.NONE)
  const lastRect = ref(new DOMRect(0, 0, 1, 1))
  const lockedPanel = ref(null) // 锁定的面板（用于输入态）
  
  // Guards
  const isDragging = ref(false)
  const isComposing = ref(false)
  const isModalOpen = ref(false)

  // ========== 场景检测 ==========
  
  /**
   * 检测当前选区对应的场景类型
   */
  const detectContext = () => {
    if (!editor.value || editor.value.isDestroyed) return PanelType.NONE
    
    const { state } = editor.value
    const { selection } = state
    
    // NodeSelection 场景
    if (selection instanceof NodeSelection) {
      const node = selection.node
      if (!node) return PanelType.NONE
      
      const typeName = node.type.name
      
      if (typeName === 'image') return PanelType.IMAGE
      if (typeName === 'fileBlock') return PanelType.FILE
      if (typeName === 'table') return PanelType.TABLE
      if (typeName === 'codeBlock') return PanelType.CODE_BLOCK
      
      return PanelType.NONE
    }
    
    // TextSelection 场景
    if (selection instanceof TextSelection) {
      const { from, to, empty } = selection
      
      // 空选区不显示
      if (empty) return PanelType.NONE
      
      // 检查是否在 codeBlock 内
      const $from = state.doc.resolve(from)
      for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.name === 'codeBlock') return PanelType.NONE
      }
      
      // 检查选区是否包含 codeBlock
      let hasCodeBlock = false
      state.doc.nodesBetween(from, to, (node) => {
        if (node.type.name === 'codeBlock') {
          hasCodeBlock = true
          return false
        }
        return true
      })
      if (hasCodeBlock) return PanelType.NONE
      
      // 检查是否有 link mark（优先显示 link panel）
      // 暂时跳过，后续添加 LinkPanel 时启用
      // const marks = $from.marks()
      // if (marks.some(m => m.type.name === 'link')) return PanelType.LINK
      
      // 文本选区显示评论面板
      return PanelType.COMMENT
    }
    
    return PanelType.NONE
  }

  /**
   * 检测的场景类型
   */
  const detectedContext = computed(() => detectContext())

  // ========== 仲裁逻辑 ==========
  
  /**
   * 检查所有 guards
   */
  const shouldHide = computed(() => {
    return (
      isPreviewing.value ||
      isReadonly.value ||
      isDragging.value ||
      isComposing.value ||
      isModalOpen.value
    )
  })

  /**
   * 计算最终应该显示的面板
   */
  const resolvedPanel = computed(() => {
    // Guards 检查
    if (shouldHide.value) return PanelType.NONE
    
    // 如果有锁定的面板，优先显示锁定面板
    if (lockedPanel.value && bubbleState.value === BubbleState.LOCKED) {
      return lockedPanel.value
    }
    
    return detectedContext.value
  })

  // ========== 定位逻辑 ==========
  
  /**
   * 获取参考矩形
   */
  const getReferenceClientRect = () => {
    try {
      if (!editor.value || editor.value.isDestroyed) return lastRect.value
      
      const { state, view } = editor.value
      const { selection } = state
      
      // NodeSelection：使用节点 DOM
      if (selection instanceof NodeSelection) {
        const dom = view.nodeDOM(selection.from)
        if (!(dom instanceof HTMLElement)) return lastRect.value
        
        const node = selection.node
        const typeName = node?.type?.name
        
        // 针对不同节点类型选择合适的参考元素
        let refEl = dom
        
        if (typeName === 'image') {
          refEl = dom.closest('.image-block-view')?.querySelector('.image-block-wrapper') || dom
        } else if (typeName === 'fileBlock') {
          refEl = dom.closest('.file-block-view')?.querySelector('.file-block-card') || dom
        }
        
        if (!(refEl instanceof HTMLElement)) return lastRect.value
        
        const rect = refEl.getBoundingClientRect()
        if (!rect || rect.width === 0) return lastRect.value
        
        // 避让顶部工具栏
        const adjustedRect = avoidTopToolbar(rect, view)
        lastRect.value = adjustedRect
        return adjustedRect
      }
      
      // TextSelection：使用选区范围
      if (selection instanceof TextSelection && !selection.empty) {
        const { from, to } = selection
        const start = view.coordsAtPos(from)
        const end = view.coordsAtPos(to)
        
        if (!start || !end) return lastRect.value
        
        const rect = new DOMRect(
          Math.min(start.left, end.left),
          Math.min(start.top, end.top),
          Math.abs(end.right - start.left),
          Math.abs(end.bottom - start.top)
        )
        
        const adjustedRect = avoidTopToolbar(rect, view)
        lastRect.value = adjustedRect
        return adjustedRect
      }
      
      return lastRect.value
    } catch (e) {
      console.debug('getReferenceClientRect error:', e)
      return lastRect.value
    }
  }

  /**
   * 避让顶部工具栏
   */
  const avoidTopToolbar = (rect, view) => {
    const toolbarEl = document.querySelector('.format-toolbar')
    const toolbarRect = toolbarEl?.getBoundingClientRect()
    const toolbarBottom = toolbarRect ? toolbarRect.bottom : 88
    
    const bubbleHeight = 44 // 预估高度
    const gap = 8
    const needSpace = bubbleHeight + gap
    const bubbleTopIfNormal = rect.top - needSpace
    
    // 如果 bubble 会被 toolbar 遮挡
    if (bubbleTopIfNormal < toolbarBottom + 4) {
      const contentEl = document.querySelector('.editor-content') || view.dom
      const contentRect = contentEl.getBoundingClientRect()
      
      const width = Math.max(Math.min(rect.width, contentRect.width), 20)
      const maxLeft = contentRect.right - width
      const left = Math.min(Math.max(rect.left, contentRect.left), maxLeft)
      
      const virtualTop = toolbarBottom + needSpace
      return new DOMRect(left, virtualTop, width, 20)
    }
    
    return rect
  }

  // ========== 生命周期控制 ==========
  
  /**
   * 锁定面板（用于输入态）
   */
  const lockPanel = (panelType) => {
    lockedPanel.value = panelType
    bubbleState.value = BubbleState.LOCKED
  }

  /**
   * 解锁面板
   */
  const unlockPanel = () => {
    lockedPanel.value = null
    if (bubbleState.value === BubbleState.LOCKED) {
      bubbleState.value = BubbleState.SHOWING
    }
  }

  /**
   * 暂停（用于预览、拖拽等）
   */
  const suspend = () => {
    bubbleState.value = BubbleState.SUSPENDED
  }

  /**
   * 恢复
   */
  const resume = () => {
    if (bubbleState.value === BubbleState.SUSPENDED) {
      bubbleState.value = BubbleState.SHOWING
    }
  }

  /**
   * 关闭
   */
  const close = () => {
    bubbleState.value = BubbleState.CLOSING
    setTimeout(() => {
      bubbleState.value = BubbleState.HIDDEN
      lockedPanel.value = null
    }, 0)
  }

  /**
   * 安全地执行外部操作（如打开新标签页）
   */
  const safeExternalAction = (action) => {
    try {
      editor.value?.commands?.blur?.()
    } catch (e) {
      // ignore
    }
    
    requestAnimationFrame(() => {
      try {
        action()
      } catch (e) {
        console.error('External action error:', e)
      }
    })
  }

  // ========== 事件监听 ==========
  
  let rafId = null
  
  const onSelectionUpdate = () => {
    if (bubbleState.value === BubbleState.LOCKED) return
    if (bubbleState.value === BubbleState.SUSPENDED) return
    
    // 节流更新
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      const panel = resolvedPanel.value
      activePanel.value = panel
      bubbleState.value = panel === PanelType.NONE 
        ? BubbleState.HIDDEN 
        : BubbleState.SHOWING
    })
  }

  const onCompositionStart = () => {
    isComposing.value = true
  }

  const onCompositionEnd = () => {
    isComposing.value = false
  }

  const onDragStart = () => {
    isDragging.value = true
    suspend()
  }

  const onDragEnd = () => {
    isDragging.value = false
    resume()
  }

  const onBlur = () => {
    // 延迟关闭，给点击面板按钮留时间
    setTimeout(() => {
      if (bubbleState.value !== BubbleState.LOCKED) {
        // 检查焦点是否在 bubble 内
        const activeEl = document.activeElement
        if (activeEl?.closest('.bubble-host-panel')) {
          return
        }
        close()
      }
    }, 150)
  }

  // ========== 初始化与清理 ==========
  
  const setupListeners = () => {
    if (!editor.value) return
    
    editor.value.on('selectionUpdate', onSelectionUpdate)
    editor.value.on('blur', onBlur)
    
    const dom = editor.value.view?.dom
    if (dom) {
      dom.addEventListener('compositionstart', onCompositionStart)
      dom.addEventListener('compositionend', onCompositionEnd)
      dom.addEventListener('dragstart', onDragStart)
      dom.addEventListener('dragend', onDragEnd)
    }
  }

  const cleanupListeners = () => {
    if (!editor.value) return
    
    editor.value.off('selectionUpdate', onSelectionUpdate)
    editor.value.off('blur', onBlur)
    
    const dom = editor.value.view?.dom
    if (dom) {
      dom.removeEventListener('compositionstart', onCompositionStart)
      dom.removeEventListener('compositionend', onCompositionEnd)
      dom.removeEventListener('dragstart', onDragStart)
      dom.removeEventListener('dragend', onDragEnd)
    }
    
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  // 监听 editor 变化
  watch(
    () => editor.value,
    (newEditor, oldEditor) => {
      if (oldEditor) cleanupListeners()
      if (newEditor) setupListeners()
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    cleanupListeners()
  })

  return {
    // 状态
    bubbleState,
    activePanel,
    resolvedPanel,
    
    // Guards
    isDragging,
    isComposing,
    isModalOpen,
    shouldHide,
    
    // 定位
    getReferenceClientRect,
    lastRect,
    
    // 生命周期控制
    lockPanel,
    unlockPanel,
    suspend,
    resume,
    close,
    safeExternalAction,
    
    // 常量
    PanelType,
    BubbleState,
  }
}

