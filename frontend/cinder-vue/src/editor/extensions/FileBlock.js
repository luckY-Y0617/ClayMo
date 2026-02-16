// src/editor/extensions/FileBlock.js
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeSelection } from 'prosemirror-state'

/**
 * 大厂设计：Hover ≠ Selection
 * 
 * - Hover 状态：纯视觉 UI，鼠标移开就消失
 * - Selection 状态：点击后创建，点击其他地方才消失
 * - Bubble 显示：基于 hover 或 selection，统一由 BubbleHost 管理
 */
export const FileBlock = Node.create({
  name: 'fileBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      resolvePreviewUrl: (attrs) => {
        const id = attrs?.fileId
        if (!id) return null
        const ext = (attrs?.fileExt || '').toLowerCase() || guessExt(attrs?.fileName)
        if (ext === 'ofd') return `/preview/ofd/${id}`
        if (isOfficeExt(ext)) return `/preview/office/${id}`
        return `/api/files/${id}/content?disposition=inline`
      },
      resolveDownloadUrl: (attrs) => {
        const id = attrs?.fileId
        if (!id) return null
        return `/api/files/${id}/content?disposition=attachment`
      },
      resolveShareUrl: (attrs) => {
        const id = attrs?.fileId
        if (!id) return null
        return `${location.origin}/file/${id}`
      },
      downloadStrategy: 'auto',
      blobThresholdBytes: 20 * 1024 * 1024,
      onPreview: null,
      onDownload: null,
      onRemove: null,
      onRename: null,
    }
  },

  addStorage() {
    return {
      // FileBubble 使用的状态对象
      hoverUI: {
        pos: null,           // 当前选中的节点位置
        overFile: false,     // 是否在文件卡片上
        overBubble: false,   // 是否在 bubble 上
        hideTimer: null,     // 隐藏定时器
      },
    }
  },

  addAttributes() {
    return {
      src: { default: null },
      fileId: { default: null },
      fileName: { default: '未知文件' },
      fileSize: { default: 0 },
      fileType: { default: '' },
      fileExt: { default: '' },
      status: { default: 'ready' },
      progress: { default: 0 },
      error: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="file-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'file-block' })]
  },

  addCommands() {
    return {
      setFileBlock: (attrs) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: normalizeAttrs(attrs),
        })
      },
      updateFileBlock: (partial) => ({ tr, state, dispatch }) => {
        const sel = state.selection
        if (!(sel instanceof NodeSelection)) return false
        const node = sel.node
        if (!node || node.type.name !== 'fileBlock') return false
        dispatch(tr.setNodeMarkup(sel.from, undefined, normalizeAttrs({ ...node.attrs, ...partial })))
        return true
      },
      removeFileBlock: () => ({ commands }) => commands.deleteSelection(),
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const hoverUI = editor.storage.fileBlock.hoverUI
      let currentNode = node

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

      const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i]
      }

      const getFileIcon = (fileType, fileName) => {
        const type = (fileType || '').toLowerCase()
        const ext = guessExt(fileName)
        const t = `${type} ${ext}`
        if (t.includes('pdf')) return svgFile('#e74c3c')
        if (t.includes('word') || t.includes('doc')) return svgFile('#2980b9')
        if (t.includes('excel') || t.includes('xls') || t.includes('sheet') || t.includes('csv')) return svgFile('#27ae60')
        if (t.includes('ppt')) return svgFile('#d35400')
        if (t.includes('zip') || t.includes('rar') || t.includes('7z') || t.includes('tar')) return svgFolder('#9b59b6')
        if (ext === 'ofd') return svgFile('#111827')
        return svgFile('#7f8c8d')
      }

      // ========== DOM 构建 ==========

      const dom = document.createElement('div')
      dom.classList.add('file-block-view')
      dom.style.cssText = `
        position: relative;
        margin: 8px 0;
        display: inline-block;
        max-width: 100%;
      `

      const card = document.createElement('div')
      card.classList.add('file-block-card')
      card.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 8px;
        border: 1px solid #e8e8e8;
        background: #fafafa;
        cursor: pointer;
        transition: all 0.15s ease;
        min-width: 280px;
        max-width: 400px;
      `

      const iconWrapper = document.createElement('div')
      iconWrapper.style.cssText = `
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e8e8e8;
      `
      iconWrapper.innerHTML = getFileIcon(currentNode.attrs.fileType, currentNode.attrs.fileName)

      const info = document.createElement('div')
      info.style.cssText = 'flex: 1; min-width: 0; overflow: hidden;'

      const fileNameEl = document.createElement('div')
      fileNameEl.style.cssText = `
        font-weight: 500;
        font-size: 14px;
        color: #1a1a1a;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `
      fileNameEl.textContent = currentNode.attrs.fileName

      const metaEl = document.createElement('div')
      metaEl.style.cssText = 'font-size: 12px; color: #999; margin-top: 2px;'
      metaEl.textContent = buildMeta(currentNode.attrs, formatFileSize)

      info.appendChild(fileNameEl)
      info.appendChild(metaEl)

      const previewIcon = document.createElement('div')
      previewIcon.style.cssText = `
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
        transition: all 0.15s ease;
      `
      previewIcon.innerHTML = eyeSvg()
      previewIcon.title = '预览'

      card.appendChild(iconWrapper)
      card.appendChild(info)
      card.appendChild(previewIcon)

      // 选中边框
      const overlay = document.createElement('div')
      overlay.style.cssText = `
        position: absolute;
        inset: 0;
        border: 2px solid transparent;
        border-radius: 8px;
        pointer-events: none;
        box-sizing: border-box;
        transition: border-color 0.15s ease;
      `

      dom.appendChild(card)
      dom.appendChild(overlay)

      // ========== 状态管理 ==========

      let isSelected = false

      const updateVisualState = () => {
        if (isSelected) {
          // 选中态：蓝色边框 + 浅蓝背景
          overlay.style.borderColor = '#3b82f6'
          card.style.background = '#f0f7ff'
          card.style.borderColor = '#3b82f6'
        } else {
          // 默认态
          overlay.style.borderColor = 'transparent'
          card.style.background = '#fafafa'
          card.style.borderColor = '#e8e8e8'
        }
      }

      // ========== 大厂设计：纯 CSS Hover ==========
      card.style.transition = 'all 0.15s ease'
      
      // 使用 CSS :hover 伪类，不在 JS 中处理
      const style = document.createElement('style')
      style.textContent = `
        .file-block-card:hover {
          background: #f5f5f5 !important;
          border-color: #d0d0d0 !important;
        }
        .file-block-card.selected {
          background: #f0f7ff !important;
          border-color: #3b82f6 !important;
        }
      `
      document.head.appendChild(style)

      // 预览按钮
      previewIcon.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()

        const attrs = currentNode.attrs
        const opts = this.options

        try {
          if (typeof opts.onPreview === 'function') {
            await opts.onPreview(attrs, { editor })
            return
          }
          const url = typeof opts.resolvePreviewUrl === 'function'
            ? opts.resolvePreviewUrl(attrs)
            : (attrs.src || null)
          if (url) window.open(url, '_blank', 'noopener')
        } catch (err) {
          console.error(err)
        }
      })

      previewIcon.addEventListener('mouseenter', () => {
        previewIcon.style.background = 'rgba(0,0,0,0.06)'
        previewIcon.style.color = '#1a1a1a'
      })
      previewIcon.addEventListener('mouseleave', () => {
        previewIcon.style.background = 'transparent'
        previewIcon.style.color = '#999'
      })

      // ========== NodeView 接口 ==========

      return {
        dom,

        selectNode() {
          isSelected = true
          card.classList.add('selected')
          const p = getNodePosSafe()
          if (typeof p === 'number') {
            hoverUI.pos = p
          }
        },

        deselectNode() {
          isSelected = false
          card.classList.remove('selected')
          hoverUI.pos = null
        },

        update(updatedNode) {
          if (updatedNode.type.name !== 'fileBlock') return false
          currentNode = updatedNode

          fileNameEl.textContent = updatedNode.attrs.fileName
          metaEl.textContent = buildMeta(updatedNode.attrs, formatFileSize)
          iconWrapper.innerHTML = getFileIcon(updatedNode.attrs.fileType, updatedNode.attrs.fileName)

          return true
        },

        destroy() {
          const p = getNodePosSafe()
          if (hoverUI.pos === p) {
            hoverUI.pos = null
            hoverUI.overFile = false
            hoverUI.overBubble = false
          }
          // 清理 style 标签
          if (style && style.parentNode) {
            style.parentNode.removeChild(style)
          }
        },

        stopEvent(event) {
          if (event.target instanceof HTMLElement && previewIcon.contains(event.target)) return true
          return false
        },

        ignoreMutation: () => true,
      }
    }
  },

  // 不需要自定义 Plugin
  // ProseMirror 会自动处理 atom + selectable 节点
})

// ========== Helpers ==========

function normalizeAttrs(attrs = {}) {
  const a = { ...attrs }
  if (!a.fileExt) a.fileExt = guessExt(a.fileName)
  if (!a.status) a.status = 'ready'
  if (!Number.isFinite(Number(a.progress))) a.progress = 0
  return a
}

function guessExt(name = '') {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/)
  return m?.[1] || ''
}

function isOfficeExt(ext) {
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)
}

function buildMeta(attrs, formatFileSize) {
  const status = (attrs.status || 'ready').toLowerCase()
  const size = formatFileSize(attrs.fileSize)
  if (status === 'uploading') return `上传中 ${Math.min(100, Math.max(0, attrs.progress))}% · ${size}`
  if (status === 'processing') return `处理中 · ${size}`
  if (status === 'failed') return `失败${attrs.error ? `：${attrs.error}` : ''} · ${size}`
  return size
}

function eyeSvg() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
}

function svgFile(color) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`
}

function svgFolder(color) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
}
