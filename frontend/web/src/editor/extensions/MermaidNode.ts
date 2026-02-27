/**
 * MermaidNode Extension
 *
 * Mermaid 图表节点扩展，支持：
 * - 在编辑器中渲染 Mermaid 流程图、时序图等
 * - 实时预览和编辑 Mermaid 代码
 * - 多种图表类型支持
 */
import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/vue-3'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import MermaidNodeView from './MermaidNodeView.vue'

export interface MermaidNodeOptions {
  HTMLAttributes: Record<string, unknown>
}

export interface MermaidNodeAttrs {
  code: string
  diagramType: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaidNode: {
      /**
       * 插入 Mermaid 图表
       */
      setMermaidNode: (code?: string, diagramType?: string) => ReturnType
      /**
       * 更新 Mermaid 代码
       */
      updateMermaidCode: (code: string) => ReturnType
      /**
       * 切换到编辑模式
       */
      setMermaidEditing: (editing: boolean) => ReturnType
    }
  }
}

export const MermaidNode = Node.create<MermaidNodeOptions>({
  name: 'mermaidNode',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      code: {
        default: `graph TD
A[Start] --> B{Is it?}
B -->|Yes| C[Do something]
B -->|No| D[Do something else]
C --> E[End]
D --> E`,
      },
      diagramType: {
        default: 'graph',
      },
      isEditing: {
        default: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mermaid-node',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['mermaid-node', mergeAttributes(HTMLAttributes)]
  },

  addCommands() {
    return {
      setMermaidNode:
        (code?: string, diagramType?: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              code: code || `graph TD
A[Start] --> B{Is it?}
B -->|Yes| C[Do something]
B -->|No| D[Do something else]
C --> E[End]
D --> E`,
              diagramType: diagramType || 'graph',
              isEditing: false,
            },
          })
        },
      updateMermaidCode:
        (code: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { code })
        },
      setMermaidEditing:
        (isEditing: boolean) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { isEditing })
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(MermaidNodeView)
  },
})

export default MermaidNode
