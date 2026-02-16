import { Node, mergeAttributes } from '@tiptap/core'
import { VueRenderer } from '@tiptap/vue-3'
import EmbeddedDoc from '@/components/knowledge/components/EmbeddedDoc.vue'

export const CardDocumentReference = Node.create({
  name: 'cardDocumentReference',

  group: 'block',

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
      knowledgeBaseId: {
        default: null,
        parseHTML: element => element.getAttribute('data-kb-id'),
        renderHTML: attributes => {
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
      mergeAttributes(HTMLAttributes, {
        'data-type': 'card-doc-ref',
        class: 'card-doc-ref',
      }),
    ]
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const dom = document.createElement('div')
      dom.setAttribute('data-type', 'card-doc-ref')
      dom.className = 'card-doc-ref'
      dom.setAttribute('contenteditable', 'false')

      console.log('node.attrs.knowledgeBaseId', node.attrs.knowledgeBaseId)

      console.log('CardDocumentReference 渲染:', { 
        docId: node.attrs.docId, 
        knowledgeBaseId: node.attrs.knowledgeBaseId,
        allAttrs: node.attrs 
      })
      
      const component = new VueRenderer(EmbeddedDoc, {
        props: {
          docId: node.attrs.docId,
          knowledgeBaseId: node.attrs.knowledgeBaseId,
          showActions: true,
        },
        editor,
      })

      // 监听打开文档事件
      // 通过监听组件内部按钮点击事件
      const handleOpen = (doc) => {
        const event = new CustomEvent('open-document', {
          detail: { docId: doc?.id || node.attrs.docId },
          bubbles: true,
        })
        dom.dispatchEvent(event)
      }

      // 等待组件挂载后添加事件监听
      setTimeout(() => {
        const openButton = dom.querySelector('.el-button')
        if (openButton) {
          openButton.addEventListener('click', (e) => {
            e.stopPropagation()
            handleOpen({ id: node.attrs.docId })
          })
        }
        // 也监听整个卡片的点击
        const card = dom.querySelector('.embedded-doc__card')
        if (card) {
          card.addEventListener('click', (e) => {
            e.stopPropagation()
            handleOpen({ id: node.attrs.docId })
          })
        }
      }, 100)

      dom.appendChild(component.element)

      return {
        dom,
        contentDOM: null,
        destroy: () => {
          component.destroy()
        },
      }
    }
  },
})

export default CardDocumentReference

