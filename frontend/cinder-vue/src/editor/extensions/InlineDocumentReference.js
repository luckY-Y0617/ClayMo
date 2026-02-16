import { Node, mergeAttributes } from '@tiptap/core'

export const InlineDocumentReference = Node.create({
  name: 'inlineDocumentReference',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      docId: {
        default: null,
        parseHTML: element => element.getAttribute('data-doc-id'),
        renderHTML: attributes => {
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
        parseHTML: element => element.getAttribute('data-doc-title') || element.textContent,
        renderHTML: attributes => {
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
      mergeAttributes(HTMLAttributes, {
        'data-type': 'inline-doc-ref',
        class: 'inline-doc-ref',
        contenteditable: 'false',
      }),
      `〔${node.attrs.docTitle || '文档'}〕`,
    ]
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
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
})

export default InlineDocumentReference

