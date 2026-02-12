/**
 * ImageBlock Extension
 *
 * 图片块扩展，支持：
 * - 拖拽调整大小
 * - 对齐方式（左/中/右）
 * - 选中状态高亮
 * - 加载失败占位符
 */
import { mergeAttributes } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import type { Editor } from '@tiptap/vue-3'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface ImageBlockOptions {
  HTMLAttributes: Record<string, unknown>
}

export interface ImageBlockAttrs {
  src: string | null
  alt: string | null
  title: string | null
  width: string | null
  align: 'left' | 'center' | 'right'
}

export interface ImageHoverUIState {
  pos: number | null
  overImage: boolean
  overBubble: boolean
  hideTimer: ReturnType<typeof setTimeout> | null
}

declare module '@tiptap/core' {
  /** ======== 存储扩展 ======== */
  interface Storage {
    image: {
      hoverUI: ImageHoverUIState
    }
  }

  interface Commands<ReturnType> {
    imageBlock: {
      /**
       * 设置图片对齐
       */
      setImageAlign: (align: 'left' | 'center' | 'right') => ReturnType
      /**
       * 设置图片宽度
       */
      setImageWidth: (width: string) => ReturnType
    }
  }
}

export const ImageBlock = Image.extend<ImageBlockOptions>({
  name: 'image',

  addStorage() {
    return {
      hoverUI: {
        pos: null,
        overImage: false,
        overBubble: false,
        hideTimer: null,
      } as ImageHoverUIState,
    }
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: (element) =>
          element.style.width || element.getAttribute('width'),
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          return { width: attributes.width, style: `width: ${attributes.width}` }
        },
      },
      align: {
        default: 'left',
        parseHTML: (element) => element.getAttribute('data-align') || 'left',
        renderHTML: (attributes) => {
          if (!attributes.align) return {}
          return { 'data-align': attributes.align }
        },
      },
    }
  },

  /** ======== 命令扩展 ======== */
  /**
   * 扩展图片命令并保留父级命令（包含 setImage）
   */
  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { align })
        },
      setImageWidth:
        (width) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { width })
        },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const hoverUI = (editor as Editor).storage.image.hoverUI as ImageHoverUIState
      let currentNode = node

      // ========== 辅助函数 ==========

      const getNodePosSafe = (): number | null => {
        if (typeof getPos !== 'function') return null
        try {
          const p = getPos()
          return typeof p === 'number' ? p : null
        } catch {
          return null
        }
      }

      const notifyBubbleHost = (type: string, data: Record<string, unknown> = {}) => {
        editor.view.dom.dispatchEvent(
          new CustomEvent('bubble-state-change', {
            bubbles: true,
            detail: { type, nodeType: 'image', ...data },
          })
        )
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
      img.src = node.attrs.src || ''
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

      // 选中边框
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
      const handles = ['nw', 'ne', 'sw', 'se'] as const
      const handleElements: HTMLDivElement[] = []

      handles.forEach((pos) => {
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
        handle.style.cursor = pos === 'nw' || pos === 'se' ? 'nwse-resize' : 'nesw-resize'

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
      let isSelected = false

      const updateVisualState = () => {
        if (hasError) {
          handleElements.forEach((h) => {
            h.style.opacity = '0'
            h.style.pointerEvents = 'none'
          })
          overlay.style.borderColor = 'transparent'
          return
        }

        overlay.style.borderColor = isSelected ? '#3b82f6' : 'transparent'

        handleElements.forEach((h) => {
          h.style.opacity = isSelected && isLoaded ? '1' : '0'
          h.style.pointerEvents = isSelected && isLoaded ? 'auto' : 'none'
        })
      }

      const updateAlign = (align: string) => {
        if (align === 'center') dom.style.justifyContent = 'center'
        else if (align === 'right') dom.style.justifyContent = 'flex-end'
        else dom.style.justifyContent = 'flex-start'
      }
      updateAlign(node.attrs.align || 'left')

      const calculateInitialWidth = (naturalWidth: number, naturalHeight: number): string => {
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
        return `${Math.round(Math.min(targetHeight * (4 / 3), editorWidth * 0.5))}px`
      }

      // ========== 图片加载 ==========

      img.onload = () => {
        isLoaded = true
        hasError = false
        img.style.display = 'block'
        errorPlaceholder.style.display = 'none'

        if (!currentNode.attrs.width) {
          const initialWidth = calculateInitialWidth(img.naturalWidth, img.naturalHeight)
          wrapper.style.width = initialWidth
          const p = getNodePosSafe()
          if (typeof p === 'number') {
            setTimeout(() => {
              try {
                editor.view.dispatch(
                  editor.state.tr.setNodeMarkup(p, undefined, {
                    ...currentNode.attrs,
                    width: initialWidth,
                  })
                )
              } catch {
                // ignore
              }
            }, 0)
          }
        } else {
          wrapper.style.width = currentNode.attrs.width
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

          notifyBubbleHost('resize-start')

          const startX = e.clientX
          const startWidth = wrapper.getBoundingClientRect().width
          const maxWidth = dom.parentElement?.clientWidth || 2000

          const onMouseMove = (moveEvent: MouseEvent) => {
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

            notifyBubbleHost('resize-end')

            const p = getNodePosSafe()
            if (typeof p === 'number') {
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(p, undefined, {
                  ...currentNode.attrs,
                  width: wrapper.style.width,
                })
              )
            }
          }

          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp)
        })
      })

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

        update(updatedNode: ProseMirrorNode) {
          if (updatedNode.type !== currentNode.type) return false

          if (updatedNode.attrs.src !== currentNode.attrs.src) {
            img.src = updatedNode.attrs.src || ''
            isLoaded = false
            hasError = false
            img.style.display = 'block'
            errorPlaceholder.style.display = 'none'
          }
          if (updatedNode.attrs.width !== currentNode.attrs.width) {
            wrapper.style.width = updatedNode.attrs.width || 'auto'
          }
          if (updatedNode.attrs.align !== currentNode.attrs.align) {
            updateAlign(updatedNode.attrs.align || 'left')
          }

          currentNode = updatedNode
          return true
        },

        destroy() {
          const p = getNodePosSafe()
          if (hoverUI.pos === p) {
            hoverUI.pos = null
            hoverUI.overImage = false
            hoverUI.overBubble = false
          }
        },
      }
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        style: HTMLAttributes.width ? `width: ${HTMLAttributes.width}` : '',
      }),
    ]
  },
})

export default ImageBlock

