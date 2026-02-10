/**
 * TrailingParagraph Extension
 *
 * 确保文档末尾始终有一个段落节点
 * 方便用户在末尾继续输入
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Transaction } from '@tiptap/pm/state'

const trailingParagraphPluginKey = new PluginKey('trailingParagraph')

export const TrailingParagraph = Extension.create({
  name: 'trailingParagraph',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: trailingParagraphPluginKey,
        appendTransaction: (
          transactions: readonly Transaction[],
          _oldState,
          newState
        ): Transaction | null | undefined => {
          // 只有 doc 变化才处理
          if (!transactions.some((tr) => tr.docChanged)) return null

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

export default TrailingParagraph

