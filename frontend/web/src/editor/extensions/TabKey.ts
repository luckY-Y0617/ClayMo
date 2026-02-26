import { Extension } from '@tiptap/core'

export const TabKey = Extension.create({
  name: 'tabKey',

  addKeyboardShortcuts() {
    return {
      // Tab: 插入两个空格缩进
      Tab: ({ editor }) => {
        // 在 codeBlock 中让 CustomCodeBlock 处理
        if (editor.isActive('codeBlock')) {
          return false
        }

        editor.chain().focus().insertContent('  ').run()
        return true
      },
      // Shift+Tab: 移除缩进
      'Shift-Tab': ({ editor }) => {
        const { $from } = editor.state.selection
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

        if (textBefore.startsWith('  ')) {
          const deleteFrom = $from.pos - 2
          const deleteTo = $from.pos
          editor.chain()
            .focus()
            .deleteRange({ from: deleteFrom, to: deleteTo })
            .run()
          return true
        }
        return false
      },
    }
  },
})
