import { Extension } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'

export default Extension.create({
  name: 'trailingParagraph',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          // 只有 doc 变化才处理
          if (!transactions.some(tr => tr.docChanged)) return null

          const { doc, schema } = newState
          const last = doc.lastChild
          const paragraph = schema.nodes.paragraph

          // 没 paragraph 节点或最后已经是 paragraph -> 不处理
          if (!paragraph || !last || last.type === paragraph) return null

          // 在文档末尾补一个 paragraph
          const tr = newState.tr.insert(doc.content.size, paragraph.create())
          return tr
        },
      }),
    ]
  },
})
