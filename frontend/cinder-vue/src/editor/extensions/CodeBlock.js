import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import CodeBlockComponent from '@/components/knowledge/CodeBlock.vue'

const lowlight = createLowlight(common)

export const CustomCodeBlock = CodeBlockLowlight
  .extend({
    addAttributes() {
      return {
        language: { default: 'plaintext' },
        folded: { default: false },
      }
    },

    addKeyboardShortcuts() {
      return {
        'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
      }
    },

    addNodeView() {
      return VueNodeViewRenderer(CodeBlockComponent)
    },
  })
  .configure({
    lowlight,
    defaultLanguage: 'plaintext',
  })
