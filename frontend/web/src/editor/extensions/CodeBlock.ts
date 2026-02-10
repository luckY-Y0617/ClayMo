/**
 * CodeBlock Extension
 *
 * 代码块扩展，支持：
 * - 语法高亮（基于 lowlight）
 * - 语言选择
 * - 折叠/展开
 * - 自定义 Vue 组件渲染
 */
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import type { Component } from 'vue'

export interface CustomCodeBlockOptions {
  lowlight: ReturnType<typeof createLowlight>
  defaultLanguage: string
  /** 代码块 Vue 组件 */
  codeBlockComponent?: Component
}

// 创建 lowlight 实例
const lowlight = createLowlight(common)

/**
 * 创建自定义代码块扩展
 *
 * @param component - 可选的自定义代码块 Vue 组件
 */
export function createCustomCodeBlock(component?: Component) {
  const extension = CodeBlockLowlight.extend({
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
      if (component) {
        return VueNodeViewRenderer(component)
      }
      // 使用默认渲染
      return undefined as unknown as ReturnType<typeof VueNodeViewRenderer>
    },
  }).configure({
    lowlight,
    defaultLanguage: 'plaintext',
  })

  return extension
}

/**
 * 默认代码块扩展（不带自定义组件）
 */
export const CustomCodeBlock = CodeBlockLowlight.extend({
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
}).configure({
  lowlight,
  defaultLanguage: 'plaintext',
})

export { lowlight }
export default CustomCodeBlock

