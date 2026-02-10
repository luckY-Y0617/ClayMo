/**
 * FileBlock Extension
 *
 * 文件块扩展，支持：
 * - 文件预览
 * - 文件下载
 * - 上传进度显示
 * - 多种文件类型图标
 */
import { Node, mergeAttributes } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'

export interface FileBlockOptions {
  resolvePreviewUrl: (attrs: FileBlockAttrs) => string | null
  resolveDownloadUrl: (attrs: FileBlockAttrs) => string | null
  resolveShareUrl: (attrs: FileBlockAttrs) => string | null
  downloadStrategy: 'auto' | 'blob' | 'link'
  blobThresholdBytes: number
  onPreview: ((attrs: FileBlockAttrs, ctx: { editor: Editor }) => Promise<void>) | null
  onDownload: ((attrs: FileBlockAttrs, ctx: { editor: Editor }) => Promise<void>) | null
  onRemove: ((attrs: FileBlockAttrs, ctx: { editor: Editor }) => Promise<void>) | null
  onRename: ((attrs: FileBlockAttrs, ctx: { editor: Editor }) => Promise<void>) | null
}

export interface FileBlockAttrs {
  src: string | null
  fileId: string | null
  fileName: string
  fileSize: number
  fileType: string
  fileExt: string
  status: 'ready' | 'uploading' | 'processing' | 'failed'
  progress: number
  error: string
}

export interface FileHoverUIState {
  pos: number | null
  overFile: boolean
  overBubble: boolean
  hideTimer: ReturnType<typeof setTimeout> | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileBlock: {
      /**
       * 插入文件块
       */
      setFileBlock: (attrs: Partial<FileBlockAttrs>) => ReturnType
      /**
       * 更新文件块属性
       */
      updateFileBlock: (partial: Partial<FileBlockAttrs>) => ReturnType
      /**
       * 删除文件块
       */
      removeFileBlock: () => ReturnType
    }
  }
}

// ========== Helpers ==========

function normalizeAttrs(attrs: Partial<FileBlockAttrs> = {}): FileBlockAttrs {
  const a = { ...attrs } as FileBlockAttrs
  if (!a.fileExt) a.fileExt = guessExt(a.fileName)
  if (!a.status) a.status = 'ready'
  if (!Number.isFinite(Number(a.progress))) a.progress = 0
  return a
}

function guessExt(name = ''): string {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/)
  return m?.[1] || ''
}

function isOfficeExt(ext: string): boolean {
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i]
}

function buildMeta(attrs: FileBlockAttrs): string {
  const status = (attrs.status || 'ready').toLowerCase()
  const size = formatFileSize(attrs.fileSize)
  if (status === 'uploading')
    return `上传中 ${Math.min(100, Math.max(0, attrs.progress))}% · ${size}`
  if (status === 'processing') return `处理中 · ${size}`
  if (status === 'failed') return `失败${attrs.error ? `：${attrs.error}` : ''} · ${size}`
  return size
}

function eyeSvg(): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
}

function svgFile(color: string): string {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`
}

function svgFolder(color: string): string {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
}

function getFileIcon(fileType: string, fileName: string): string {
  const type = (fileType || '').toLowerCase()
  const ext = guessExt(fileName)
  const t = `${type} ${ext}`
  if (t.includes('pdf')) return svgFile('#e74c3c')
  if (t.includes('word') || t.includes('doc')) return svgFile('#2980b9')
  if (
    t.includes('excel') ||
    t.includes('xls') ||
    t.includes('sheet') ||
    t.includes('csv')
  )
    return svgFile('#27ae60')
  if (t.includes('ppt')) return svgFile('#d35400')
  if (t.includes('zip') || t.includes('rar') || t.includes('7z') || t.includes('tar'))
    return svgFolder('#9b59b6')
  if (ext === 'ofd') return svgFile('#111827')
  return svgFile('#7f8c8d')
}

export const FileBlock = Node.create<FileBlockOptions>({
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
      hoverUI: {
        pos: null,
        overFile: false,
        overBubble: false,
        hideTimer: null,
      } as FileHoverUIState,
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
      setFileBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: normalizeAttrs(attrs),
          })
        },
      updateFileBlock:
        (partial) =>
        ({ tr, state, dispatch }) => {
          const sel = state.selection
          if (!(sel instanceof NodeSelection)) return false
          const node = sel.node
          if (!node || node.type.name !== 'fileBlock') return false
          if (dispatch) {
            dispatch(
              tr.setNodeMarkup(
                sel.from,
                undefined,
                normalizeAttrs({ ...(node.attrs as FileBlockAttrs), ...partial })
              )
            )
          }
          return true
        },
      removeFileBlock:
        () =>
        ({ commands }) =>
          commands.deleteSelection(),
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const hoverUI = (editor as Editor).storage.fileBlock.hoverUI as FileHoverUIState
      let currentNode = node

      const getNodePosSafe = (): number | null => {
        if (typeof getPos !== 'function') return null
        try {
          const p = getPos()
          return typeof p === 'number' ? p : null
        } catch {
          return null
        }
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
      iconWrapper.innerHTML = getFileIcon(
        currentNode.attrs.fileType as string,
        currentNode.attrs.fileName as string
      )

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
      fileNameEl.textContent = currentNode.attrs.fileName as string

      const metaEl = document.createElement('div')
      metaEl.style.cssText = 'font-size: 12px; color: #999; margin-top: 2px;'
      metaEl.textContent = buildMeta(currentNode.attrs as FileBlockAttrs)

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

      // 预览按钮事件
      previewIcon.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()

        const attrs = currentNode.attrs as FileBlockAttrs
        const opts = this.options

        try {
          if (typeof opts.onPreview === 'function') {
            await opts.onPreview(attrs, { editor: editor as Editor })
            return
          }
          const url =
            typeof opts.resolvePreviewUrl === 'function'
              ? opts.resolvePreviewUrl(attrs)
              : attrs.src || null
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
          card.classList.add('selected')
          overlay.style.borderColor = '#3b82f6'
          card.style.background = '#f0f7ff'
          card.style.borderColor = '#3b82f6'
          const p = getNodePosSafe()
          if (typeof p === 'number') {
            hoverUI.pos = p
          }
        },

        deselectNode() {
          card.classList.remove('selected')
          overlay.style.borderColor = 'transparent'
          card.style.background = '#fafafa'
          card.style.borderColor = '#e8e8e8'
          hoverUI.pos = null
        },

        update(updatedNode: ProseMirrorNode) {
          if (updatedNode.type.name !== 'fileBlock') return false
          currentNode = updatedNode

          fileNameEl.textContent = updatedNode.attrs.fileName as string
          metaEl.textContent = buildMeta(updatedNode.attrs as FileBlockAttrs)
          iconWrapper.innerHTML = getFileIcon(
            updatedNode.attrs.fileType as string,
            updatedNode.attrs.fileName as string
          )

          return true
        },

        destroy() {
          const p = getNodePosSafe()
          if (hoverUI.pos === p) {
            hoverUI.pos = null
            hoverUI.overFile = false
            hoverUI.overBubble = false
          }
        },

        stopEvent(event: Event) {
          if (event.target instanceof HTMLElement && previewIcon.contains(event.target))
            return true
          return false
        },

        ignoreMutation: () => true,
      }
    }
  },
})

export default FileBlock

