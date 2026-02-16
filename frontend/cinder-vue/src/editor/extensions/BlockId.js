import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

function newId() {
  return crypto.randomUUID()
}

export default Extension.create({
  name: 'blockId',

  addOptions() {
    return {
      // 只对这些节点类型挂载 blockId，并参与缺失/重复修复
      types: [
        'paragraph',
        'heading',
        'blockquote',
        'codeBlock',
        'listItem',
        'taskItem',
        'documentCard', // 视你实际命名
      ],
      // HTML 上的 attribute 名
      htmlAttribute: 'data-block-id',
      // node.attrs 上的字段名
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

            // 关键：拆分节点（Enter 等）时不要继承旧 blockId
            keepOnSplit: false,

            parseHTML: el => el.getAttribute(htmlAttribute),
            renderHTML: attrs =>
              attrs && attrs[attrName] ? { [htmlAttribute]: attrs[attrName] } : {},
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    const { types, attrName } = this.options
    const allowed = new Set(types)

    const isAllowedBlock = node =>
      node && node.type && node.type.isBlock && allowed.has(node.type.name)

    const fixDoc = state => {
      const tr = state.tr
      const seen = new Set()
      let changed = false

      state.doc.descendants((node, pos) => {
        if (!isAllowedBlock(node)) return

        const id = node.attrs && node.attrs[attrName]

        // 缺失或重复：生成新 ID
        if (!id || seen.has(id)) {
          const id2 = newId()
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            [attrName]: id2,
          })
          seen.add(id2)
          changed = true
        } else {
          seen.add(id)
        }
      })

      return changed ? tr : null
    }

    return [
      new Plugin({
        // 初始化时修复一次（解决历史数据缺失/重复）
        view: view => {
          const tr = fixDoc(view.state)
          if (tr) view.dispatch(tr)
          return {}
        },

        // 文档每次变化后自动修复（解决 split 新块为 null、粘贴带来重复等）
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some(t => t.docChanged)) return null
          return fixDoc(newState)
        },
      }),
    ]
  },
})
