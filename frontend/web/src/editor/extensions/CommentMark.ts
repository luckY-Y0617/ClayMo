import { Mark, mergeAttributes } from '@tiptap/core'

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, unknown>
}

export interface CommentMarkAttributes {
  commentId: string | null
  commentIds: string[] | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentMark: {
      /**
       * 设置评论标记
       */
      setCommentMark: (attributes: Partial<CommentMarkAttributes>) => ReturnType
      /**
       * 切换评论标记
       */
      toggleCommentMark: (attributes: Partial<CommentMarkAttributes>) => ReturnType
      /**
       * 取消评论标记
       */
      unsetCommentMark: () => ReturnType
    }
  }
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: 'commentMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => {
          if (!attributes.commentId) {
            return {}
          }
          return {
            'data-comment-id': attributes.commentId,
          }
        },
      },
      commentIds: {
        default: null,
        parseHTML: (element) => {
          const idsStr = element.getAttribute('data-comment-ids')
          if (!idsStr) return null
          try {
            return JSON.parse(idsStr)
          } catch {
            return null
          }
        },
        renderHTML: (attributes) => {
          if (!attributes.commentIds || !Array.isArray(attributes.commentIds)) {
            return {}
          }
          return {
            'data-comment-ids': JSON.stringify(attributes.commentIds),
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-type="comment-mark"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'comment-mark',
        class: 'comment-mark',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setCommentMark:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      toggleCommentMark:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes)
        },
      unsetCommentMark:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})

export default CommentMark

