import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { kbApi } from '@/api/kb.api'
import {
  buildCommentTree,
  normalizeCommentTree,
  findCommentInTree,
} from '@/utils/comment'

import {
  applyCommentMarkFromPosition,
  scrollToComment,
} from '@/utils/commentAnchor'

/**
 * 评论管理 Composable
 * - 数据：load/create/delete/like + tree normalize
 * - 视图（可选）：注入 editor 后自动渲染 mark + 支持跳转
 */
export function useComments() {
  const comments = ref([])
  const loading = ref(false)

  // 可选：由外部注入 tiptap editor（用于渲染 mark / 跳转）
  const editorRef = ref(null)

  /**
   * 注入编辑器实例（在编辑器创建完成后调用一次）
   */
  const attachEditor = (editor) => {
    editorRef.value = editor || null
  }

  /**
   * 将树结构评论拍平成数组，方便批量处理
   */
  const flattenComments = (list) => {
    const res = []
    const walk = (arr) => {
      for (const c of arr || []) {
        res.push(c)
        if (Array.isArray(c.replies) && c.replies.length) {
          walk(c.replies)
        }
      }
    }
    walk(list)
    return res
  }

  /**
   * 将当前 comments 的 position 渲染为 commentMark
   * 建议调用时机：
   * - editor.setContent(...) 之后
   * - loadComments(...) 完成后（本实现会自动调用）
   */
  const renderCommentMarks = () => {
    const editor = editorRef.value
    if (!editor) return

    const all = flattenComments(comments.value)
    for (const c of all) {
      if (!c || !c.id || !c.position) continue
      applyCommentMarkFromPosition(editor, c.position, c.id)
    }
  }

  /**
   * 加载评论列表
   */
  const loadComments = async (baseId, docId) => {
    if (!baseId || !docId) {
      comments.value = []
      return
    }

    loading.value = true
    try {
      const res = await kbApi.document.comment.getList(baseId, docId)
      const payload = Array.isArray(res) ? res : (res.list ?? [])

      // 判断是否已经是树形结构
      const isTree = payload.some(c => Array.isArray(c.replies) && c.replies.length > 0)
      const tree = isTree ? payload : buildCommentTree(payload)

      comments.value = normalizeCommentTree(tree)

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
   * 统一语义：只提交 content/parentId/position
   */
  const createComment = async (baseId, docId, { content, parentId, position }) => {
    try {
      const payload = { content, parentId, position }
      await kbApi.document.comment.create(baseId, docId, payload)

      // 重新拉取列表（确保树/点赞/权限等信息与服务端一致）
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
  const deleteComment = async (baseId, docId, commentId) => {
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
   * 查找评论
   */
  const findComment = (commentId) => {
    return findCommentInTree(comments.value, commentId)
  }

  /**
   * 跳转到评论（依赖 editor）
   * 返回 true/false 表示是否定位成功
   */
  const jumpToComment = (commentId) => {
    const editor = editorRef.value
    if (!editor) return false

    const c = findCommentInTree(comments.value, commentId)
    if (!c || !c.position) return false

    const ok = scrollToComment(editor, c.position)
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
    findComment,
  }
}
