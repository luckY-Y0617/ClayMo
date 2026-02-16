// src/editor/extensions/AttachmentBlock.js
import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, NodeSelection, TextSelection } from 'prosemirror-state'

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 根据文件名获取文件图标
 */
function getFileIcon(fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase() || ''
  
  // 文档类型图标
  const docExts = ['doc', 'docx', 'odt', 'rtf']
  const spreadsheetExts = ['xls', 'xlsx', 'csv', 'ods']
  const presentationExts = ['ppt', 'pptx', 'odp']
  const pdfExts = ['pdf']
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz']
  const codeExts = ['js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'json', 'xml']
  const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv']
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma']
  
  if (docExts.includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="#2b6cb0" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
  }
  if (spreadsheetExts.includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="#38a169" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><rect x="8" y="12" width="8" height="6" rx="1"></rect></svg>`
  }
  if (presentationExts.includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="#d69e2e" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><rect x="8" y="12" width="8" height="4" rx="1"></rect></svg>`
  }
  if (pdfExts.includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><text x="7" y="17" font-size="6" fill="#e53e3e" stroke="none">PDF</text></svg>`
  }
  if (archiveExts.includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="#805ad5" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><rect x="10" y="11" width="4" height="2"></rect><rect x="10" y="14" width="4" height="2"></rect></svg>`
  }
  if (codeExts.includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="#4a5568" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><polyline points="10 15 8 13 10 11"></polyline><polyline points="14 11 16 13 14 15"></polyline></svg>`
  }
  if (videoExts.includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="#3182ce" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><polygon points="10 11 15 14 10 17 10 11"></polygon></svg>`
  }
  if (audioExts.includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="#ed8936" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15v-2a2 2 0 1 1 4 0v2"></path><line x1="9" y1="15" x2="13" y2="15"></line></svg>`
  }
  
  // 默认文件图标
  return `<svg viewBox="0 0 24 24" fill="none" stroke="#718096" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`
}

export const AttachmentBlock = Node.create({
  name: 'attachment',
  
  group: 'block',
  
  atom: true,
  
  draggable: true,

  addStorage() {
    return {
      hoverUI: {
        pos: null,
        overAttachment: false,
        overBubble: false,
        hideTimer: null,
      },
    }
  },
  
  addAttributes() {
    return {
      src: {
        default: null,
      },
      fileName: {
        default: 'Unknown file',
      },
      fileSize: {
        default: 0,
      },
      fileId: {
        default: null,
      },
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const hoverUI = editor.storage.attachment.hoverUI

      const getNodePosSafe = () => {
        if (typeof getPos !== 'function') return null
        try {
          const p = getPos()
          return typeof p === 'number' ? p : null
        } catch {
          return null
        }
      }

      const clearHideTimer = () => {
        if (hoverUI.hideTimer) {
          clearTimeout(hoverUI.hideTimer)
          hoverUI.hideTimer = null
        }
      }

      const setNodeSelectionAt = (pos) => {
        const { state, dispatch } = editor.view
        if (state.selection instanceof NodeSelection && state.selection.from === pos) return
        dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)))
      }

      const restoreCaretAfterPos = (pos) => {
        const { state, dispatch } = editor.view
        const n = state.doc.nodeAt(pos)
        const after = n ? pos + n.nodeSize : pos + 1
        const safeAfter = Math.min(after, state.doc.content.size)
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, safeAfter)))
      }

      const scheduleHideIfNeeded = (delay = 180) => {
        clearHideTimer()
        hoverUI.hideTimer = setTimeout(() => {
          if (hoverUI.overAttachment || hoverUI.overBubble) return
          if (typeof hoverUI.pos !== 'number') return

          const pos = hoverUI.pos
          hoverUI.pos = null
          restoreCaretAfterPos(pos)
        }, delay)
      }

      // 容器
      const dom = document.createElement('div')
      dom.classList.add('attachment-block-view')
      dom.style.position = 'relative'
      dom.style.userSelect = 'none'
      dom.style.display = 'flex'
      dom.style.marginTop = '0.5rem'
      dom.style.marginBottom = '0.5rem'

      // 附件卡片
      const card = document.createElement('div')
      card.classList.add('attachment-card')
      card.style.display = 'flex'
      card.style.alignItems = 'center'
      card.style.gap = '12px'
      card.style.padding = '12px 16px'
      card.style.backgroundColor = '#f8fafc'
      card.style.border = '1px solid #e2e8f0'
      card.style.borderRadius = '8px'
      card.style.cursor = 'pointer'
      card.style.transition = 'all 0.2s ease'
      card.style.maxWidth = '400px'
      card.style.minWidth = '240px'

      // 文件图标
      const iconWrapper = document.createElement('div')
      iconWrapper.classList.add('attachment-icon')
      iconWrapper.style.width = '40px'
      iconWrapper.style.height = '40px'
      iconWrapper.style.flexShrink = '0'
      iconWrapper.style.display = 'flex'
      iconWrapper.style.alignItems = 'center'
      iconWrapper.style.justifyContent = 'center'
      iconWrapper.style.backgroundColor = '#fff'
      iconWrapper.style.borderRadius = '8px'
      iconWrapper.style.border = '1px solid #e2e8f0'
      iconWrapper.innerHTML = getFileIcon(node.attrs.fileName)
      iconWrapper.querySelector('svg').style.width = '24px'
      iconWrapper.querySelector('svg').style.height = '24px'

      // 文件信息
      const info = document.createElement('div')
      info.classList.add('attachment-info')
      info.style.flex = '1'
      info.style.minWidth = '0'
      info.style.overflow = 'hidden'

      const fileName = document.createElement('div')
      fileName.classList.add('attachment-name')
      fileName.style.fontSize = '14px'
      fileName.style.fontWeight = '500'
      fileName.style.color = '#1a202c'
      fileName.style.whiteSpace = 'nowrap'
      fileName.style.overflow = 'hidden'
      fileName.style.textOverflow = 'ellipsis'
      fileName.textContent = node.attrs.fileName

      const fileSize = document.createElement('div')
      fileSize.classList.add('attachment-size')
      fileSize.style.fontSize = '12px'
      fileSize.style.color = '#718096'
      fileSize.style.marginTop = '2px'
      fileSize.textContent = formatFileSize(node.attrs.fileSize)

      info.appendChild(fileName)
      info.appendChild(fileSize)

      // 预览按钮
      const previewBtn = document.createElement('div')
      previewBtn.classList.add('attachment-preview-btn')
      previewBtn.style.width = '32px'
      previewBtn.style.height = '32px'
      previewBtn.style.flexShrink = '0'
      previewBtn.style.display = 'flex'
      previewBtn.style.alignItems = 'center'
      previewBtn.style.justifyContent = 'center'
      previewBtn.style.borderRadius = '6px'
      previewBtn.style.color = '#718096'
      previewBtn.style.cursor = 'pointer'
      previewBtn.style.transition = 'all 0.2s ease'
      previewBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
      previewBtn.title = '预览'

      previewBtn.addEventListener('mouseenter', () => {
        previewBtn.style.backgroundColor = '#e2e8f0'
        previewBtn.style.color = '#3182ce'
      })
      previewBtn.addEventListener('mouseleave', () => {
        previewBtn.style.backgroundColor = 'transparent'
        previewBtn.style.color = '#718096'
      })
      previewBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (node.attrs.src) {
          window.open(node.attrs.src, '_blank')
        }
      })

      card.appendChild(iconWrapper)
      card.appendChild(info)
      card.appendChild(previewBtn)

      // 选中边框
      const overlay = document.createElement('div')
      overlay.style.position = 'absolute'
      overlay.style.top = '0'
      overlay.style.left = '0'
      overlay.style.right = '0'
      overlay.style.bottom = '0'
      overlay.style.border = '2px solid #3b82f6'
      overlay.style.borderRadius = '8px'
      overlay.style.pointerEvents = 'none'
      overlay.style.display = 'none'
      overlay.style.boxSizing = 'border-box'
      overlay.style.zIndex = '10'

      dom.appendChild(card)
      dom.appendChild(overlay)

      let isHovered = false
      let isSelected = false

      const updateVisibility = () => {
        const visible = isSelected || isHovered
        overlay.style.display = visible ? 'block' : 'none'
        card.style.borderColor = visible ? '#3b82f6' : '#e2e8f0'
        card.style.backgroundColor = visible ? '#f0f7ff' : '#f8fafc'
      }

      // hover 样式
      card.addEventListener('mouseenter', () => {
        clearHideTimer()
        const p = getNodePosSafe()
        if (typeof p === 'number') {
          hoverUI.pos = p
          hoverUI.overAttachment = true
          setNodeSelectionAt(p)
        }
        isHovered = true
        updateVisibility()
      })

      card.addEventListener('mouseleave', (e) => {
        hoverUI.overAttachment = false
        isHovered = false
        updateVisibility()

        const rt = e.relatedTarget
        if (rt instanceof HTMLElement) {
          if (rt.closest('.kb-attachment-bubble') || rt.closest('[data-tippy-root]') || rt.closest('.tippy-box')) {
            scheduleHideIfNeeded(220)
            return
          }
        }

        scheduleHideIfNeeded(220)
      })

      card.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const p = getNodePosSafe()
        if (typeof p === 'number') {
          hoverUI.pos = p
          hoverUI.overAttachment = false
          scheduleHideIfNeeded(0)
        }
        editor.view.focus()
      })

      return {
        dom,

        selectNode: () => {
          isSelected = true
          updateVisibility()
        },

        deselectNode: () => {
          isSelected = false
          updateVisibility()
        },

        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false

          if (updatedNode.attrs.fileName !== node.attrs.fileName) {
            fileName.textContent = updatedNode.attrs.fileName
            iconWrapper.innerHTML = getFileIcon(updatedNode.attrs.fileName)
            iconWrapper.querySelector('svg').style.width = '24px'
            iconWrapper.querySelector('svg').style.height = '24px'
          }
          if (updatedNode.attrs.fileSize !== node.attrs.fileSize) {
            fileSize.textContent = formatFileSize(updatedNode.attrs.fileSize)
          }

          node = updatedNode
          return true
        },

        destroy: () => {
          clearHideTimer()
        },
      }
    }
  },

  addCommands() {
    return {
      setAttachment: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClickOn() {
            return false
          },
        },
      }),
    ]
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="attachment"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'attachment' })]
  },
})

