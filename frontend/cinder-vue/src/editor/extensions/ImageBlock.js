// src/editor/extensions/ImageBlock.js
import { mergeAttributes } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { NodeSelection } from 'prosemirror-state'

/**
 * 大厂设计：Hover ≠ Selection
 * 
 * - Hover 状态：纯视觉 UI，鼠标移开就消失
 * - Selection 状态：点击后创建，点击其他地方才消失
 * - Bubble 显示：基于 hover 或 selection，统一由 BubbleHost 管理
 */
export const ImageBlock = Image.extend({
  name: 'image',

  addStorage() {
    return {
      // ImageBubble 使用的状态对象
      hoverUI: {
        pos: null,           // 当前选中的节点位置
        overImage: false,    // 是否在图片上
        overBubble: false,   // 是否在 bubble 上
        hideTimer: null,     // 隐藏定时器
      },
    }
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: element => element.style.width || element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {}
          return { width: attributes.width, style: `width: ${attributes.width}` }
        },
      },
      align: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-align'),
        renderHTML: attributes => {
          if (!attributes.align) return {}
          return { 'data-align': attributes.align }
        },
      },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const hoverUI = editor.storage.image.hoverUI

      // ========== 辅助函数 ==========
      
      const getNodePosSafe = () => {
        if (typeof getPos !== 'function') return null
        try {
          const p = getPos()
          return typeof p === 'number' ? p : null
        } catch {
          return null
        }
      }

      // 通知 BubbleHost 更新
      const notifyBubbleHost = (type, data = {}) => {
        editor.view.dom.dispatchEvent(new CustomEvent('bubble-state-change', {
          bubbles: true,
          detail: { type, nodeType: 'image', ...data }
        }))
      }

      // ========== DOM 构建 ==========

      const dom = document.createElement('div')
      dom.classList.add('image-block-view')
      dom.style.cssText = `
        position: relative;
        display: flex;
        margin: 0.75rem 0;
        line-height: 0;
      `

      const wrapper = document.createElement('div')
      wrapper.classList.add('image-block-wrapper')
      wrapper.style.cssText = `
        position: relative;
        line-height: 0;
        font-size: 0;
        box-sizing: border-box;
        display: block;
        max-width: 100%;
      `

      const img = document.createElement('img')
      img.src = node.attrs.src
      img.alt = node.attrs.alt || ''
      img.style.cssText = 'display: block; width: 100%; height: auto;'
      img.draggable = false

      // 错误占位
      const errorPlaceholder = document.createElement('div')
      errorPlaceholder.style.cssText = `
        display: none;
        width: 100%;
        min-height: 100px;
        background: #fafafa;
        border: 1px dashed #e0e0e0;
        border-radius: 8px;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        color: #999;
        font-size: 13px;
        padding: 24px;
        box-sizing: border-box;
      `
      errorPlaceholder.innerHTML = `
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>图片加载失败</span>
      `

      // 选中/Hover 边框
      const overlay = document.createElement('div')
      overlay.classList.add('image-overlay')
      overlay.style.cssText = `
        position: absolute;
        inset: 0;
        border: 2px solid transparent;
        pointer-events: none;
        box-sizing: border-box;
        z-index: 10;
        transition: border-color 0.15s ease;
      `

      // Resize handles
      const handles = ['nw', 'ne', 'sw', 'se']
      const handleElements = []

      handles.forEach(pos => {
        const handle = document.createElement('div')
        handle.classList.add('image-resize-handle')
        handle.style.cssText = `
          position: absolute;
          width: 10px;
          height: 10px;
          background: #fff;
          border: 1px solid #3b82f6;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          z-index: 50;
          opacity: 0;
          pointer-events: none;
          box-sizing: border-box;
          transition: opacity 0.15s ease;
        `

        if (pos.includes('n')) handle.style.top = '0'
        else handle.style.bottom = '0'
        if (pos.includes('w')) handle.style.left = '0'
        else handle.style.right = '0'

        const tx = pos.includes('w') ? '-50%' : '50%'
        const ty = pos.includes('n') ? '-50%' : '50%'
        handle.style.transform = `translate(${tx}, ${ty})`
        handle.style.cursor = (pos === 'nw' || pos === 'se') ? 'nwse-resize' : 'nesw-resize'

        wrapper.appendChild(handle)
        handleElements.push(handle)
      })

      wrapper.appendChild(img)
      wrapper.appendChild(errorPlaceholder)
      wrapper.appendChild(overlay)
      dom.appendChild(wrapper)

      // ========== 状态管理 ==========

      let isLoaded = false
      let hasError = false
      let isResizing = false
      let isSelected = false

      // 更新视觉状态
      const updateVisualState = () => {
        if (hasError) {
          handleElements.forEach(h => { h.style.opacity = '0'; h.style.pointerEvents = 'none' })
          overlay.style.borderColor = 'transparent'
          return
        }

        // 边框颜色
        if (isSelected) {
          overlay.style.borderColor = '#3b82f6'
        } else {
          overlay.style.borderColor = 'transparent'
        }

        // Resize handles：只在选中时显示
        handleElements.forEach(h => {
          h.style.opacity = isSelected && isLoaded ? '1' : '0'
          h.style.pointerEvents = isSelected && isLoaded ? 'auto' : 'none'
        })
      }
      
      // ========== 大厂设计：纯 CSS Hover ==========
      const style = document.createElement('style')
      style.textContent = `
        .image-block-view:hover .image-overlay {
          border-color: rgba(59, 130, 246, 0.3) !important;
        }
        .image-block-view.selected .image-overlay {
          border-color: #3b82f6 !important;
        }
      `
      document.head.appendChild(style)

      // 对齐
      const updateAlign = (align) => {
        if (align === 'center') dom.style.justifyContent = 'center'
        else if (align === 'right') dom.style.justifyContent = 'flex-end'
        else dom.style.justifyContent = 'flex-start'
      }
      updateAlign(node.attrs.align)

      // 初始宽度
      const calculateInitialWidth = (naturalWidth, naturalHeight) => {
        const editorWrap = dom.closest('.editor-content') || dom.parentElement
        const editorWidth = editorWrap ? editorWrap.clientWidth : 800
        const viewportHeight = window.innerHeight
        const targetHeight = viewportHeight / 4
        
        if (naturalWidth && naturalHeight && naturalHeight > 0) {
          const aspectRatio = naturalWidth / naturalHeight
          const calculatedWidth = targetHeight * aspectRatio
          const maxWidth = editorWidth * 0.8
          return `${Math.round(Math.min(calculatedWidth, maxWidth))}px`
        }
        return `${Math.round(Math.min(targetHeight * (4/3), editorWidth * 0.5))}px`
      }

      // ========== 图片加载 ==========

      img.onload = () => {
        isLoaded = true
        hasError = false
        img.style.display = 'block'
        errorPlaceholder.style.display = 'none'

        if (!node.attrs.width) {
          const initialWidth = calculateInitialWidth(img.naturalWidth, img.naturalHeight)
          wrapper.style.width = initialWidth
          const p = getNodePosSafe()
          if (typeof p === 'number') {
            setTimeout(() => {
              try {
                editor.view.dispatch(
                  editor.state.tr.setNodeMarkup(p, undefined, { ...node.attrs, width: initialWidth })
                )
              } catch {}
            }, 0)
          }
        } else {
          wrapper.style.width = node.attrs.width
        }
        updateVisualState()
      }

      img.onerror = () => {
        isLoaded = false
        hasError = true
        img.style.display = 'none'
        errorPlaceholder.style.display = 'flex'
        wrapper.style.width = '300px'
        updateVisualState()
      }

      if (node.attrs.width) {
        wrapper.style.width = node.attrs.width
      }

      // ========== Resize ==========

      handleElements.forEach((handle, idx) => {
        const pos = handles[idx]

        handle.addEventListener('mousedown', (e) => {
          if (hasError) return
          e.preventDefault()
          e.stopPropagation()

          isResizing = true
          notifyBubbleHost('resize-start')

          const startX = e.clientX
          const startWidth = wrapper.getBoundingClientRect().width
          const maxWidth = (dom.parentElement?.clientWidth || 2000)

          const onMouseMove = (moveEvent) => {
            moveEvent.preventDefault()
            let dx = moveEvent.clientX - startX
            if (pos.includes('w')) dx = -dx
            const newWidth = Math.max(20, Math.min(startWidth + dx, maxWidth))
            wrapper.style.width = `${newWidth}px`
            notifyBubbleHost('resize-move')
          }

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)

            isResizing = false
            notifyBubbleHost('resize-end')

            const p = getNodePosSafe()
            if (typeof p === 'number') {
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(p, undefined, { ...node.attrs, width: wrapper.style.width })
              )
            }
          }

          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp)
        })
      })

      // ========== ProseMirror 原生处理选择 ==========
      // atom + selectable 会自动处理 NodeSelection
      // 不需要手动监听任何鼠标事件

      // ========== NodeView 接口 ==========

      return {
        dom,

        selectNode() {
          isSelected = true
          dom.classList.add('selected')
          const p = getNodePosSafe()
          if (typeof p === 'number') {
            hoverUI.pos = p
            hoverUI.overImage = true
          }
          updateVisualState()
        },

        deselectNode() {
          isSelected = false
          dom.classList.remove('selected')
          hoverUI.pos = null
          hoverUI.overImage = false
          updateVisualState()
        },

        update(updatedNode) {
          if (updatedNode.type !== node.type) return false

          if (updatedNode.attrs.src !== node.attrs.src) {
            img.src = updatedNode.attrs.src
            isLoaded = false
            hasError = false
            img.style.display = 'block'
            errorPlaceholder.style.display = 'none'
          }
          if (updatedNode.attrs.width !== node.attrs.width) {
            wrapper.style.width = updatedNode.attrs.width || 'auto'
          }
          if (updatedNode.attrs.align !== node.attrs.align) {
            updateAlign(updatedNode.attrs.align)
          }

          node = updatedNode
          return true
        },

        destroy() {
          const p = getNodePosSafe()
          if (hoverUI.pos === p) {
            hoverUI.pos = null
            hoverUI.overImage = false
            hoverUI.overBubble = false
          }
          // 清理 style 标签
          if (style && style.parentNode) {
            style.parentNode.removeChild(style)
          }
        },
      }
    }
  },

  // 不需要自定义 Plugin
  // ProseMirror 会自动处理 atom + selectable 节点

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, {
      style: HTMLAttributes.width ? `width: ${HTMLAttributes.width}` : '',
    })]
  },
})
