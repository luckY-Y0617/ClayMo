import {
    NodeViewWrapper,
    NodeViewContent,
    VueNodeViewRenderer,
  } from '@tiptap/vue-3'
  import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
  import { defineComponent, h, ref, onMounted, onUnmounted } from 'vue'
  import type { NodeViewProps } from '@tiptap/vue-3'
  import lowlight from './lowlight'
  
/**
 * Vue NodeView 组件
 */
const CodeBlockComponent = defineComponent({
  props: {
    editor: Object,
    node: Object,
    updateAttributes: Function,
    extension: Object,
  } as any,

  setup(props: NodeViewProps) {
    const languages = [
      { value: 'plaintext', label: 'Plain Text', icon: '📄' },
      { value: 'javascript', label: 'JavaScript', icon: '🟨' },
      { value: 'typescript', label: 'TypeScript', icon: '🔷' },
      { value: 'python', label: 'Python', icon: '🐍' },
      { value: 'java', label: 'Java', icon: '☕' },
      { value: 'csharp', label: 'C#', icon: '🟣' },
      { value: 'go', label: 'Go', icon: '🔵' },
      { value: 'rust', label: 'Rust', icon: '🦀' },
      { value: 'json', label: 'JSON', icon: '📋' },
      { value: 'html', label: 'HTML', icon: '🌐' },
      { value: 'css', label: 'CSS', icon: '🎨' },
      { value: 'sql', label: 'SQL', icon: '🗃️' },
      { value: 'bash', label: 'Bash', icon: '💻' },
      { value: 'yaml', label: 'YAML', icon: '📝' },
      { value: 'xml', label: 'XML', icon: '📄' },
    ]

    const copied = ref(false)
    const dropdownOpen = ref(false)

    const changeLanguage = (lang: string) => {
      props.updateAttributes?.({ language: lang })
      dropdownOpen.value = false
    }

    const copyCode = async () => {
      await navigator.clipboard.writeText(props.node?.textContent || '')
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    }

    const toggleDropdown = () => {
      dropdownOpen.value = !dropdownOpen.value
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.code-block-lang')) {
        dropdownOpen.value = false
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      languages,
      changeLanguage,
      copyCode,
      copied,
      dropdownOpen,
      toggleDropdown,
    }
  },

  render() {
    const language = (this.node as any)?.attrs?.language || 'plaintext'
    const langInfo = this.languages.find(l => l.value === language) || this.languages[0]

    return h(NodeViewWrapper, { class: 'code-block-wrapper' }, {
      default: () => [
        h('div', { class: 'code-block-header' }, [
          h('div', { class: 'code-block-lang' }, [
            h('span', { class: 'code-block-lang-icon' }, langInfo.icon),
            h('div', { 
              class: 'code-block-lang-current',
              onClick: this.toggleDropdown,
            }, [
              h('span', { class: 'code-block-lang-label' }, langInfo.label),
              h('span', { class: 'code-block-lang-arrow' }, '▾')
            ]),
            this.dropdownOpen ? h('div', { class: 'code-block-dropdown' }, [
              h('div', { class: 'code-block-dropdown-list' },
                this.languages.map(lang => 
                  h('div', { 
                    class: ['code-block-dropdown-item', { active: lang.value === language }],
                    onClick: (e: Event) => {
                      e.stopPropagation()
                      this.changeLanguage(lang.value)
                    },
                    key: lang.value
                  }, [
                    h('span', { class: 'code-block-dropdown-item-icon' }, lang.icon),
                    h('span', { class: 'code-block-dropdown-item-label' }, lang.label),
                    lang.value === language ? h('span', { class: 'code-block-dropdown-item-check' }, '✓') : null
                  ])
                )
              )
            ]) : null
          ]),
          h('button', {
            class: 'code-block-copy',
            onClick: this.copyCode,
          }, [
            this.copied
              ? h('span', { class: 'code-block-copy-icon' }, '✓')
              : h('span', { class: 'code-block-copy-icon' }, '📋'),
            h('span', { class: 'code-block-copy-text' }, this.copied ? '已复制' : '复制')
          ])
        ]),
        h('pre', { class: 'code-block-pre' },
          h(NodeViewContent, { as: 'code' })
        )
      ]
    })
  },
})

/**
 * 扩展 CodeBlockLowlight
 */
export const CustomCodeBlock = CodeBlockLowlight.configure({
  lowlight,
  defaultLanguage: 'plaintext',
}).extend({

  addNodeView() {
    return VueNodeViewRenderer(CodeBlockComponent)
  },

  addKeyboardShortcuts() {
    return {
      ShiftEnter: ({ editor }) => {
        if (!editor.isActive('codeBlock')) return false

        const { $from } = editor.state.selection

        // 光标在 codeBlock 末尾时退出
        if ($from.parentOffset === $from.parent.content.size) {
          return editor.commands.exitCode()
        }

        return false
      },
    }
  },
})