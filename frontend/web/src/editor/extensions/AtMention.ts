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

// PluginKey 必须在模块级别创建，确保只有一个实例
// 否则编辑器重新挂载时会报 "Adding different instances of a keyed plugin" 错误
const atMentionPluginKey = new PluginKey('atMentionSuggestion')

export interface MentionItem {
  docId: string
  docTitle: string
}

export interface AtMentionOptions {
  mentionListComponent?: unknown
}

export const AtMention = Extension.create<AtMentionOptions>({
  name: 'atMention',

  addOptions() {
    return {
      mentionListComponent: null,
    }
  },

  addProseMirrorPlugins() {
    // 在这里捕获 mentionListComponent，通过闭包传递给 render
    const mentionListComponent = this.options.mentionListComponent

    return [
      Suggestion({
        editor: this.editor,
        pluginKey: atMentionPluginKey,
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
              if (!mentionListComponent) {
                console.warn('AtMention: mentionListComponent not provided')
                return
              }

              component = new VueRenderer(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mentionListComponent as any,
                {
                  props: withCommonProps(props),
                  editor: props.editor,
                }
              )

              if (!props.clientRect || !component.element) {
                return
              }

              const container = document.createElement('div')
              container.appendChild(component.element)

              const instance = tippy(container, {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
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
          props: mentionItem,
        }) => {
          const { docId, docTitle } = mentionItem
          if (docId && docTitle) {
            (editor as any)
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
      }),
    ]
  },
})

export default AtMention

