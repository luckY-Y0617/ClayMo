import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import SlashCommandList from '@/components/knowledge/SlashCommandList.vue'

const COMMAND_ITEMS = [
  {
    title: '文本块',
    description: '恢复为普通段落',
    icon: '¶',
    shortcut: 'Enter',
    keywords: ['text', 'paragraph', 'p'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run()
    },
  },
  {
    title: '一级标题',
    description: 'Large title section',
    icon: 'H1',
    shortcut: '#',
    keywords: ['h1', 'heading 1'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
    },
  },
  {
    title: '二级标题',
    description: 'Sub section title',
    icon: 'H2',
    shortcut: '##',
    keywords: ['h2', 'heading 2'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
    },
  },
  {
    title: '项目列表',
    description: '无序列表',
    icon: '•',
    shortcut: '-',
    keywords: ['list', 'bullet', 'unordered'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
  },
  {
    title: '编号列表',
    description: '有序列表',
    icon: '1.',
    shortcut: '1.',
    keywords: ['ordered', 'list', 'ol'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
  },
  {
    title: '任务列表',
    description: '适合代办/检查项',
    icon: '☑',
    shortcut: '[]',
    keywords: ['task', 'todo'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    },
  },
  {
    title: '引用块',
    description: '引用语句/摘要',
    icon: '❝',
    shortcut: '>',
    keywords: ['quote', 'blockquote'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
  },
  {
    title: '代码块',
    description: '插入高亮代码片段',
    icon: '</>',
    shortcut: '```',
    keywords: ['code', 'snippet', 'dev'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
  },
  {
    title: '分割线',
    description: '视觉上的内容分隔',
    icon: '—',
    shortcut: '---',
    keywords: ['divider', 'hr', 'line'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
  },
  {
    title: '图片',
    description: '插入本地或在线图片',
    icon: '🖼',
    shortcut: 'Img',
    keywords: ['image', 'photo', 'picture'],
    command: ({ editor, range }) => {
      const url = window.prompt('请输入图片链接 (URL)：')
      if (!url) {
        return false
      }
      editor.chain().focus().setImage({ src: url, size: 'md', align: 'center' }).run()
    },
  },
  {
    title: '嵌入文档',
    description: '插入文档卡片引用',
    icon: '📎',
    shortcut: 'Doc',
    keywords: ['document', 'embed', 'card', 'doc'],
    command: ({ editor, range }) => {
      // 触发自定义事件，由 Editor 组件处理文档选择
      const event = new CustomEvent('insert-document-card', {
        detail: { editor, range },
        bubbles: true,
      })
      editor.view.dom.dispatchEvent(event)
    },
  },
]

const createSuggestionItems = ({ query }) => {
  if (!query) {
    return COMMAND_ITEMS
  }
  return COMMAND_ITEMS.filter((item) => {
    const q = query.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      item.keywords?.some((keyword) => keyword.includes(q))
    )
  })
}

export const SlashCommand = Extension.create({
  name: 'slash-command',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
        startOfLine: true,
        items: createSuggestionItems,
        render: () => {
          let component
          let popup
          const safeHide = () => {
            if (!popup || popup.state?.isDestroyed) {
              return
            }
            popup.hide()
          }
          const safeDestroy = () => {
            if (!popup || popup.state?.isDestroyed) {
              return
            }
            popup.destroy()
          }
          const withCommonProps = (props) => ({
            ...props,
            hide: safeHide,
          })

          return {
            onStart: (props) => {
              component = new VueRenderer(SlashCommandList, {
                props: withCommonProps(props),
                editor: props.editor,
              })

              if (!props.clientRect) {
                return
              }

              const instance = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                offset: [0, 8],
                theme: 'slash',
                arrow: false,
              })
              popup = Array.isArray(instance) ? instance[0] : instance
            },
            onUpdate(props) {
              component.updateProps(withCommonProps(props))
              if (!props.clientRect) {
                return
              }
              popup?.setProps({
                getReferenceClientRect: props.clientRect,
              })
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                safeHide()
                return true
              }

              return component?.ref?.onKeyDown(props)
            },
            onExit() {
              safeDestroy()
              component?.destroy()
            },
          }
        },
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
      },
    }
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('slashCommandSuggestion'),
        ...this.options.suggestion,
      }),
    ]
  },
})

export default SlashCommand

