/**
 * AtMention Extension
 *
 * @提及扩展，用于引用文档
 * 输入 @ 后弹出文档搜索列表
 */
import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { VueRenderer } from '@tiptap/vue-3'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { Editor } from '@tiptap/vue-3'

// PluginKey 必须在模块级别创建，确保只有一个实例
// 否则编辑器重新挂载时会报 "Adding different instances of a keyed plugin" 错误
const atMentionPluginKey = new PluginKey('atMentionSuggestion')

export interface MentionItem {
  docId: string
  docTitle: string
}

export interface AtMentionOptions {
  suggestion: {
    char: string
    allowSpaces: boolean
    items: (props: { query: string }) => MentionItem[]
    render: () => {
      onStart: (props: SuggestionProps<MentionItem>) => void
      onUpdate: (props: SuggestionProps<MentionItem>) => void
      onKeyDown: (props: SuggestionKeyDownProps) => boolean
      onExit: () => void
    }
    command: (props: {
      editor: Editor
      range: { from: number; to: number }
      props: MentionItem
    }) => void
  }
  /** 文档提及列表组件 */
  mentionListComponent?: unknown
}

export const AtMention = Extension.create<AtMentionOptions>({
  name: 'atMention',

  addOptions() {
    return {
      mentionListComponent: null,
      suggestion: {
        char: '@',
        allowSpaces: false,
        items: () => {
          // 搜索逻辑在组件中实现
          return []
        },
        render: () => {
          let component: VueRenderer | null = null
          let popup: TippyInstance | null = null

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

          const withCommonProps = <T extends object>(props: T) => ({
            ...props,
            hide: safeHide,
          })

          return {
            onStart: (props: SuggestionProps<MentionItem>) => {
              if (!this.options.mentionListComponent) {
                console.warn('AtMention: mentionListComponent not provided')
                return
              }

              component = new VueRenderer(
                this.options.mentionListComponent as Parameters<typeof VueRenderer>[0],
                {
                  props: withCommonProps(props),
                  editor: props.editor,
                }
              )

              if (!props.clientRect) {
                return
              }

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

            onUpdate(props: SuggestionProps<MentionItem>) {
              component?.updateProps(withCommonProps(props))
              if (!props.clientRect) {
                return
              }
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
        },
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor
          range: { from: number; to: number }
          props: MentionItem
        }) => {
          const { docId, docTitle } = props
          if (docId && docTitle) {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent({
                type: 'inlineDocumentReference',
                attrs: {
                  docId,
                  docTitle,
                },
              })
              .run()
          }
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: atMentionPluginKey,
        ...this.options.suggestion,
      }),
    ]
  },
})

export default AtMention

