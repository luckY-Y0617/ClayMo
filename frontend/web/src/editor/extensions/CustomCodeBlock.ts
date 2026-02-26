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
   * 语言列表 - 字节系风格：纯文本，无 emoji
   */
  const LANGUAGES = [
    { value: 'plaintext', label: 'Plain Text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'json', label: 'JSON' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'sql', label: 'SQL' },
    { value: 'bash', label: 'Bash' },
    { value: 'yaml', label: 'YAML' },
    { value: 'xml', label: 'XML' },
  ]
  
  /**
   * Vue NodeView 组件 - 字节系极简风格
   */
  const CodeBlockComponent = defineComponent({
    props: {
      editor: Object,
      node: Object,
      updateAttributes: Function,
      extension: Object,
    } as any,
  
  setup(props: NodeViewProps) {
      const copied = ref(false)
      const dropdownOpen = ref(false)
      const collapsed = ref(false)

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

      const toggleDropdown = (e: Event) => {
        e.stopPropagation()
        e.preventDefault()
        dropdownOpen.value = !dropdownOpen.value
      }

      const toggleCollapse = () => {
        collapsed.value = !collapsed.value
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
        languages: LANGUAGES,
        changeLanguage,
        copyCode,
        copied,
        dropdownOpen,
        toggleDropdown,
        toggleCollapse,
        collapsed,
      }
    },

    render() {
      const node = this.node as any
      const language = node?.attrs?.language || 'plaintext'
      const collapsed = this.collapsed
      const langInfo = this.languages.find(l => l.value === language) || this.languages[0]

      return h(NodeViewWrapper, { 
        class: ['code-block-wrapper', { 'is-collapsed': collapsed }],
      }, {
        default: () => [
          // 工具栏 - 固定显示
          h('div', { 
            class: 'code-block-toolbar'
          }, [
            // 左侧：折叠 + 语言下拉
            h('div', { class: 'code-block-left' }, [
              // 折叠按钮
              h('button', {
                class: 'code-block-collapse',
                onClick: this.toggleCollapse,
              }, collapsed ? '▶' : '▼'),
              
              h('div', { class: 'code-block-lang' }, [
                h('span', { 
                  class: 'code-block-lang-current',
                  onClick: this.toggleDropdown,
                }, [
                  langInfo.label,
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
                      }, lang.label)
                    )
                  )
                ]) : null
              ]),
            ]),
            // 右侧：复制按钮
            h('button', {
              class: 'code-block-copy',
              onClick: this.copyCode,
            }, this.copied ? '已复制' : '复制')
          ]),
          // 代码区域 - 使用 CSS 控制显示/隐藏，而不是条件渲染
          h('pre', { 
            class: ['code-block-pre', { 'is-hidden': collapsed }],
          },
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
        // Tab: 插入缩进
        Tab: ({ editor }) => {
          if (!editor.isActive('codeBlock')) return false
          
          editor.chain().focus().insertContent('  ').run()
          return true
        },
        // Shift+Tab: 移除缩进
        'Shift-Tab': ({ editor }) => {
          if (!editor.isActive('codeBlock')) return false
          
          const { $from } = editor.state.selection
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)
          
          if (textBefore.startsWith('  ')) {
            // 删除两个空格
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
        // Shift+Enter: 退出代码块
        ShiftEnter: ({ editor }) => {
          if (!editor.isActive('codeBlock')) return false

          const { $from } = editor.state.selection

          // 光标在 codeBlock 末尾时退出
          if ($from.parentOffset === $from.parent.content.size) {
            return editor.commands.exitCode()
          }

          return false
        },
        // Enter: 空行时退出代码块
        Enter: ({ editor }) => {
          if (!editor.isActive('codeBlock')) return false

          const { $from } = editor.state.selection
          const isEmptyLine = $from.parent.textContent.trim() === ''

          if (isEmptyLine) {
            return editor.commands.exitCode()
          }

          return false
        },
        // Mod+Enter: 强制退出
        'ModEnter': ({ editor }) => {
          if (!editor.isActive('codeBlock')) return false
          return editor.commands.exitCode()
        },
      }
    },
  })
