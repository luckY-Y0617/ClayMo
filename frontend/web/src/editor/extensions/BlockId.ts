/**
 * BlockId Extension
 * 为每个块级节点自动添加唯一 ID
 * 用于评论定位、协同编辑等场景
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

const blockIdPluginKey = new PluginKey('blockId')

export interface BlockIdOptions {
  /** 需要添加 blockId 的节点类型 */
  types: string[]
  /** HTML 属性名 */
  htmlAttribute: string
  /** Node attrs 中的字段名 */
  attrName: string
}

function generateId(): string {
  return crypto.randomUUID()
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockId: {
      /**
       * 为所有缺失 ID 的块生成新 ID
       */
      fixBlockIds: () => ReturnType
    }
  }
}

export const BlockId = Extension.create<BlockIdOptions>({
  name: 'blockId',

  addOptions() {
    return {
      types: [
        'paragraph',
        'heading',
        'blockquote',
        'codeBlock',
        'listItem',
        'taskItem',
        'documentCard',
      ],
      htmlAttribute: 'data-block-id',
      attrName: 'blockId',
    }
  },

  addGlobalAttributes() {
    const { types, htmlAttribute, attrName } = this.options

    return [
      {
        types,
        attributes: {
          [attrName]: {
            default: null,
            // 拆分节点（Enter 等）时不要继承旧 blockId
            keepOnSplit: false,
            parseHTML: (element) => element.getAttribute(htmlAttribute),
            renderHTML: (attributes) => {
              const id = attributes[attrName]
              return id ? { [htmlAttribute]: id } : {}
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      fixBlockIds:
        () =>
        ({ tr, state }) => {
          const { types, attrName } = this.options
          const allowed = new Set(types)
          const seen = new Set<string>()
          let changed = false

          state.doc.descendants((node, pos) => {
            if (!node.type.isBlock || !allowed.has(node.type.name)) return

            const id = node.attrs[attrName] as string | null

            if (!id || seen.has(id)) {
              const newId = generateId()
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                [attrName]: newId,
              })
              seen.add(newId)
              changed = true
            } else {
              seen.add(id)
            }
          })

          return changed
        },
    }
  },

  addProseMirrorPlugins() {
    const { types, attrName } = this.options
    const allowed = new Set(types)

    const isAllowedBlock = (node: ProseMirrorNode): boolean =>
      node && node.type && node.type.isBlock && allowed.has(node.type.name)

    const fixDoc = (state: EditorState): Transaction | null => {
      const tr = state.tr
      const seen = new Set<string>()
      let changed = false

      state.doc.descendants((node, pos) => {
        if (!isAllowedBlock(node)) return

        const id = node.attrs[attrName] as string | null

        // 缺失或重复：生成新 ID
        if (!id || seen.has(id)) {
          const newId = generateId()
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            [attrName]: newId,
          })
          seen.add(newId)
          changed = true
        } else {
          seen.add(id)
        }
      })

      return changed ? tr : null
    }

    return [
      new Plugin({
        key: blockIdPluginKey,
        // 初始化时修复一次（解决历史数据缺失/重复）
        view: (view: EditorView) => {
          const tr = fixDoc(view.state)
          if (tr) view.dispatch(tr)
          return {}
        },

        // 文档每次变化后自动修复（解决 split 新块为 null、粘贴带来重复等）
        appendTransaction: (
          transactions: readonly Transaction[],
          _oldState: EditorState,
          newState: EditorState
        ): Transaction | null | undefined => {
          if (!transactions.some((t) => t.docChanged)) return null
          return fixDoc(newState)
        },
      }),
    ]
  },
})

export default BlockId

