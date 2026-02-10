/**
 * CardDocumentReference Extension
 *
 * 卡片式文档引用，显示为嵌入的文档卡片
 * 支持预览文档内容和跳转
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { VueRenderer } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/vue-3'

export interface CardDocumentReferenceOptions {
  HTMLAttributes: Record<string, unknown>
  /** 嵌入文档组件 */
  embeddedDocComponent?: unknown
}

export interface CardDocumentReferenceAttrs {
  docId: string | null
  knowledgeBaseId: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cardDocumentReference: {
      /**
       * 插入卡片文档引用
       */
      insertCardDocRef: (attrs: CardDocumentReferenceAttrs) => ReturnType
    }
  }
}

export const CardDocumentReference = Node.create<CardDocumentReferenceOptions>({
  name: 'cardDocumentReference',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      embeddedDocComponent: null,
    }
  },

  addAttributes() {
    return {
      docId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-doc-id'),
        renderHTML: (attributes) => {
          if (!attributes.docId) {
            return {}
          }
          return {
            'data-doc-id': attributes.docId,
          }
        },
      },
      knowledgeBaseId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-kb-id'),
        renderHTML: (attributes) => {
          if (!attributes.knowledgeBaseId) {
            return {}
          }
          return {
            'data-kb-id': attributes.knowledgeBaseId,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="card-doc-ref"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'card-doc-ref',
        class: 'card-doc-ref',
      }),
    ]
  },

  addNodeView() {
    return ({ node, editor }) => {
      const dom = document.createElement('div')
      dom.setAttribute('data-type', 'card-doc-ref')
      dom.className = 'card-doc-ref'
      dom.setAttribute('contenteditable', 'false')

      let component: VueRenderer | null = null

      // 如果提供了嵌入文档组件，使用 VueRenderer 渲染
      if (this.options.embeddedDocComponent) {
        component = new VueRenderer(this.options.embeddedDocComponent as Parameters<typeof VueRenderer>[0], {
          props: {
            docId: node.attrs.docId,
            knowledgeBaseId: node.attrs.knowledgeBaseId,
            showActions: true,
          },
          editor: editor as Editor,
        })
        dom.appendChild(component.element)
      } else {
        // 简单的占位符渲染
        dom.innerHTML = `
          <div class="card-doc-ref-placeholder">
            <span class="card-doc-ref-icon">📄</span>
            <span class="card-doc-ref-text">文档引用: ${node.attrs.docId || '未知'}</span>
          </div>
        `
      }

      // 处理打开文档事件
      const handleOpen = () => {
        const event = new CustomEvent('open-document', {
          detail: { docId: node.attrs.docId },
          bubbles: true,
        })
        dom.dispatchEvent(event)
      }

      // 监听整个卡片的点击
      dom.addEventListener('click', (e) => {
        e.stopPropagation()
        handleOpen()
      })

      return {
        dom,
        contentDOM: null,
        destroy: () => {
          component?.destroy()
        },
      }
    }
  },

  addCommands() {
    return {
      insertCardDocRef:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },
})

export default CardDocumentReference

