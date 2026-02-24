/**
 * GapCursorFix Extension
 *
 * 修复 Tiptap 中代码块之间无法插入文字的问题
 * 允许在两个代码块之间按 Enter 键时自动创建新段落
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

const gapCursorFixPluginKey = new PluginKey('gapCursorFix')

export const GapCursorFix = Extension.create({
  name: 'gapCursorFix',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: gapCursorFixPluginKey,
        appendTransaction: (transactions, oldState, newState) => {
          // 检查是否有文档变化
          if (!transactions.some((tr) => tr.docChanged)) return null

          const { state } = newState
          const { selection } = state
          const { $from, from, to } = selection

          // 检查光标是否在两个代码块之间
          const nodeBefore = $from.nodeBefore
          const nodeAfter = $from.nodeAfter

          // 如果光标在两个代码块之间（都没有选中文字）
          if (
            from === to &&
            nodeBefore &&
            nodeAfter &&
            nodeBefore.type.name === 'codeBlock' &&
            nodeAfter.type.name === 'codeBlock'
          ) {
            // 在两个代码块之间插入一个段落
            const insertPos = $from.after($from.depth)
            const tr = newState.tr.insert(insertPos, state.schema.nodes.paragraph.create())
            // 将光标移动到新段落中
            tr.setSelection(TextSelection.create(tr.doc, insertPos + 1))
            return tr
          }

          return null
        },
        props: {
          handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
            const { state, dispatch } = view
            const { selection } = state
            const { $from, from, to } = selection

            if (event.key === 'Enter') {
              const nodeBefore = $from.nodeBefore
              const nodeAfter = $from.nodeAfter

              // 情况1: 在代码块后面且后面是代码块或标题等块级节点
              if (nodeBefore && nodeBefore.type.name === 'codeBlock') {
                // 检查后面是否是块级节点
                if (nodeAfter && isBlockNode(nodeAfter)) {
                  // 在代码块后面插入新段落
                  const pos = $from.after($from.depth)
                  const tr = state.tr.insert(pos, state.schema.nodes.paragraph.create())
                  tr.setSelection(TextSelection.create(tr.doc, pos + 1))
                  dispatch(tr)
                  event.preventDefault()
                  return true
                }
              }

              // 情况2: 在代码块前面
              if (nodeAfter && nodeAfter.type.name === 'codeBlock') {
                const pos = $from.before($from.depth)
                const tr = state.tr.insert(pos, state.schema.nodes.paragraph.create())
                tr.setSelection(TextSelection.create(tr.doc, pos + 1))
                dispatch(tr)
                event.preventDefault()
                return true
              }
            }

            return false
          },
        },
      }),
    ]
  },
})

// 判断是否是块级节点
function isBlockNode(node: any): boolean {
  const blockTypes = [
    'paragraph',
    'heading',
    'codeBlock',
    'blockquote',
    'bulletList',
    'orderedList',
    'taskList',
    'image',
    'table',
  ]
  return blockTypes.includes(node.type.name)
}

export default GapCursorFix
