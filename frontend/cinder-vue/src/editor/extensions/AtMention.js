import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import DocumentMentionList from '@/components/knowledge/DocumentMentionList.vue'

export const AtMention = Extension.create({
  name: 'atMention',

  addOptions() {
    return {
      suggestion: {
        char: '@',
        allowSpaces: false,
        items: ({ query }) => {
          // 这个函数会在 DocumentMentionList 组件中实现搜索逻辑
          return []
        },
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
              component = new VueRenderer(DocumentMentionList, {
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
        pluginKey: new PluginKey('atMentionSuggestion'),
        ...this.options.suggestion,
      }),
    ]
  },
})

export default AtMention

