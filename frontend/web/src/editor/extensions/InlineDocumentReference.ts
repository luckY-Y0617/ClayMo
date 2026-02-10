/**
 * InlineDocumentReference Extension
 *
 * 行内文档引用，显示为 〔文档标题〕 的形式
 * 点击可跳转到对应文档
 */
import { Node, mergeAttributes } from '@tiptap/core'

export interface InlineDocumentReferenceOptions {
  HTMLAttributes: Record<string, unknown>
}

export interface InlineDocumentReferenceAttrs {
  docId: string | null
  docTitle: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineDocumentReference: {
      /**
       * 插入行内文档引用
       */
      insertInlineDocRef: (attrs: InlineDocumentReferenceAttrs) => ReturnType
    }
  }
}

export const InlineDocumentReference = Node.create<InlineDocumentReferenceOptions>({
  name: 'inlineDocumentReference',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
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
      docTitle: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-doc-title') || element.textContent || '',
        renderHTML: (attributes) => {
          if (!attributes.docTitle) {
            return {}
          }
          return {
            'data-doc-title': attributes.docTitle,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-doc-ref"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'inline-doc-ref',
        class: 'inline-doc-ref',
        contenteditable: 'false',
      }),
      `〔${node.attrs.docTitle || '文档'}〕`,
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')
      dom.setAttribute('data-type', 'inline-doc-ref')
      dom.className = 'inline-doc-ref'
      dom.setAttribute('contenteditable', 'false')
      dom.textContent = `〔${node.attrs.docTitle || '文档'}〕`

      // 添加点击事件，跳转到文档
      dom.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const docId = node.attrs.docId
        if (docId) {
          // 触发自定义事件，由父组件处理跳转
          const event = new CustomEvent('open-document', {
            detail: { docId },
            bubbles: true,
          })
          dom.dispatchEvent(event)
        }
      })

      return {
        dom,
      }
    }
  },

  addCommands() {
    return {
      insertInlineDocRef:
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

export default InlineDocumentReference

