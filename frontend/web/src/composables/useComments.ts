/**
 * 评论管理 Composable
 * - 数据：load/create/delete/like + tree normalize
 * - 视图（可选）：注入 editor 后自动渲染 mark + 支持跳转
 */
import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Editor } from '@tiptap/vue-3'

import { kbApi } from '@/api'
import type { Comment, CommentPosition, CommentCreateInput } from '@/types/editor'
import {
  buildCommentTree,
  normalizeCommentTree,
  findCommentInTree,
} from '@/utils/comment'
import {
  applyCommentMarkFromPosition,
  scrollToComment,
  type RangeAnchorPosition,
} from '@/utils/commentAnchor'

interface UseCommentsReturn {
  comments: Ref<Comment[]>
  loading: Ref<boolean>

  // editor 相关
  attachEditor: (editor: Editor | null) => void
  renderCommentMarks: () => void
  jumpToComment: (commentId: string) => boolean

  // CRUD
  loadComments: (baseId: string, docId: string) => Promise<void>
  createComment: (
    baseId: string,
    docId: string,
    input: CommentCreateInput
  ) => Promise<void>
  deleteComment: (baseId: string, docId: string, commentId: string) => Promise<void>
  toggleLike: (baseId: string, docId: string, commentId: string) => Promise<void>
  findComment: (commentId: string) => Comment | null
}

export function useComments(): UseCommentsReturn {
  const comments = ref<Comment[]>([])
  const loading = ref(false)

  // 可选：由外部注入 tiptap editor
  const editorRef = ref<Editor | null>(null)

  /**
   * 注入编辑器实例
   */
  const attachEditor = (editor: Editor | null): void => {
    editorRef.value = editor
  }

  /**
   * 将树结构评论拍平成数组
   */
  const flattenComments = (list: Comment[]): Comment[] => {
    const res: Comment[] = []
    const walk = (arr: Comment[]) => {
      for (const c of arr || []) {
        res.push(c)
        if (Array.isArray(c.replies) && c.replies.length) {
          walk(c.replies)
        }
        if (Array.isArray(c.children) && c.children.length) {
          walk(c.children)
        }
      }
    }
    walk(list)
    return res
  }

  /**
   * 将当前 comments 的 position 渲染为 commentMark
   */
  const renderCommentMarks = (): void => {
    const editor = editorRef.value
    if (!editor) return

    const all = flattenComments(comments.value)
    for (const c of all) {
      if (!c || !c.id || !c.position) continue
      // 将 position 转换为 RangeAnchorPosition 类型
      if (c.position.type === 'range') {
        applyCommentMarkFromPosition(editor, c.position as RangeAnchorPosition, c.id)
      }
    }
  }

  /**
   * 加载评论列表
   */
  const loadComments = async (baseId: string, docId: string): Promise<void> => {
    if (!baseId || !docId) {
      comments.value = []
      return
    }

    loading.value = true
    try {
      const res = await kbApi.document.comment.getList(baseId, docId)
      const payload = Array.isArray(res) ? res : (res.list ?? [])

      // 判断是否已经是树形结构
      const isTree = payload.some((c: Record<string, unknown>) => 
        Array.isArray(c.replies) && (c.replies as unknown[]).length > 0
      )
      const tree = isTree ? payload : buildCommentTree(payload as Comment[])

      comments.value = normalizeCommentTree(tree as Comment[])

      // 若已注入 editor，自动渲染 marks
      renderCommentMarks()
    } catch (error) {
      ElMessage.error('加载评论失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建评论
   */
  const createComment = async (
    baseId: string,
    docId: string,
    input: CommentCreateInput
  ): Promise<void> => {
    try {
      const payload = {
        content: input.content,
        parentId: input.parentId || null,
        position: input.position || null,
      }
      await kbApi.document.comment.create(baseId, docId, payload)

      // 重新拉取列表
      await loadComments(baseId, docId)

      ElMessage.success('评论已添加')
    } catch (error) {
      ElMessage.error('添加评论失败')
      throw error
    }
  }

  /**
   * 删除评论
   */
  const deleteComment = async (
    baseId: string,
    docId: string,
    commentId: string
  ): Promise<void> => {
    try {
      await kbApi.document.comment.remove(baseId, docId, commentId)
      await loadComments(baseId, docId)
      ElMessage.success('评论已删除')
    } catch (error) {
      ElMessage.error('删除失败')
      throw error
    }
  }

  /**
   * 切换点赞状态
   */
  const toggleLike = async (
    baseId: string,
    docId: string,
    commentId: string
  ): Promise<void> => {
    try {
      await kbApi.document.comment.toggleLike(baseId, docId, commentId)
      await loadComments(baseId, docId)
    } catch (error) {
      ElMessage.error('操作失败')
      throw error
    }
  }

  /**
   * 查找评论
   */
  const findComment = (commentId: string): Comment | null => {
    return findCommentInTree(comments.value, commentId)
  }

  /**
   * 跳转到评论
   */
  const jumpToComment = (commentId: string): boolean => {
    const editor = editorRef.value
    if (!editor) return false

    const c = findCommentInTree(comments.value, commentId)
    if (!c || !c.position) return false

    if (c.position.type !== 'range') return false

    const ok = scrollToComment(editor, c.position as RangeAnchorPosition)
    if (!ok) {
      ElMessage.warning('该评论锚点已失效，可能需要重新定位')
    }
    return ok
  }

  return {
    comments,
    loading,

    // editor 相关
    attachEditor,
    renderCommentMarks,
    jumpToComment,

    // CRUD
    loadComments,
    createComment,
    deleteComment,
    toggleLike,
    findComment,
  }
}
