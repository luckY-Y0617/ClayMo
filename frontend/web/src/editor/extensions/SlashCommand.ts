/**
 * SlashCommand Extension
 *
 * 斜杠命令菜单，用于快速插入各种内容块
 * 支持搜索过滤和键盘导航
 */
import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { VueRenderer } from '@tiptap/vue-3'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { Editor } from '@tiptap/vue-3'

// PluginKey 必须在模块级别创建，确保只有一个实例
// 否则编辑器重新挂载时会报 "Adding different instances of a keyed plugin" 错误
const slashCommandPluginKey = new PluginKey('slashCommandSuggestion')

export interface SlashCommandItem {
  title: string
  description: string
  icon: string
  shortcut?: string
  keywords?: string[]
  command: (props: { editor: Editor; range: { from: number; to: number } }) => void
}

export interface SlashCommandOptions {
  suggestion: {
    char: string
    allowSpaces: boolean
    startOfLine: boolean
    items: (props: { query: string }) => SlashCommandItem[]
    render: () => {
      onStart: (props: SuggestionProps<SlashCommandItem>) => void
      onUpdate: (props: SuggestionProps<SlashCommandItem>) => void
      onKeyDown: (props: SuggestionKeyDownProps) => boolean
      onExit: () => void
    }
    command: (props: {
      editor: Editor
      range: { from: number; to: number }
      props: SlashCommandItem
    }) => void
  }
  /** 命令列表组件 */
  commandListComponent?: unknown
}

/**
 * 默认命令列表
 */
export const DEFAULT_COMMAND_ITEMS: SlashCommandItem[] = [
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
    title: '三级标题',
    description: 'Smaller section title',
    icon: 'H3',
    shortcut: '###',
    keywords: ['h3', 'heading 3'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
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
        return
      }
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setImage({ src: url } as Record<string, unknown>)
        .run()
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

/**
 * 创建过滤后的命令列表
 */
const createSuggestionItems = ({ query }: { query: string }): SlashCommandItem[] => {
  if (!query) {
    return DEFAULT_COMMAND_ITEMS
  }
  return DEFAULT_COMMAND_ITEMS.filter((item) => {
    const q = query.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      item.keywords?.some((keyword) => keyword.includes(q))
    )
  })
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slash-command',

  addOptions() {
    return {
      commandListComponent: null,
      suggestion: {
        char: '/',
        allowSpaces: false,
        startOfLine: true,
        items: createSuggestionItems,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor
          range: { from: number; to: number }
          props: SlashCommandItem
        }) => {
          props.command({ editor, range })
        },
      },
    }
  },

  addProseMirrorPlugins() {
    const { commandListComponent } = this.options

    const render = () => {
      let component: VueRenderer | null = null
      let popup: TippyInstance | null = null

      const safeHide = () => {
        if (!popup || popup.state?.isDestroyed) return
        popup.hide()
      }

      const safeDestroy = () => {
        if (!popup || popup.state?.isDestroyed) return
        popup.destroy()
      }

      const withCommonProps = <T extends object>(props: T) => ({
        ...props,
        hide: safeHide,
      })

      return {
        onStart: (props: SuggestionProps<SlashCommandItem>) => {
          if (!commandListComponent) {
            console.warn('SlashCommand: commandListComponent not provided')
            return
          }

          component = new VueRenderer(
            commandListComponent as Parameters<typeof VueRenderer>[0],
            {
              props: withCommonProps(props),
              editor: props.editor,
            }
          )

          if (!props.clientRect) return

          const instance = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
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

        onUpdate(props: SuggestionProps<SlashCommandItem>) {
          component?.updateProps(withCommonProps(props))
          if (!props.clientRect) return
          popup?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        },

        onKeyDown(props: SuggestionKeyDownProps): boolean {
          if (props.event.key === 'Escape') {
            safeHide()
            return true
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (component?.ref as any)?.onKeyDown?.(props) ?? false
        },

        onExit() {
          safeDestroy()
          component?.destroy()
        },
      }
    }

    return [
      Suggestion({
        editor: this.editor,
        pluginKey: slashCommandPluginKey,
        ...this.options.suggestion,
        render,
      }),
    ]
  },
})

export default SlashCommand

