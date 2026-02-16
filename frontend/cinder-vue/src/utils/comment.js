/**
 * 评论工具函数
 */

/**
 * 展平评论树，返回所有评论（包括回复）
 */
export function flattenCommentTree(comments) {
  const flat = []
  const walk = (list) => {
    if (!Array.isArray(list)) return
    list.forEach((c) => {
      if (c?.id) {
        flat.push(c)
      }
      if (Array.isArray(c.replies) && c.replies.length) {
        walk(c.replies)
      }
    })
  }
  walk(comments)
  return flat
}

/**
 * 在评论树中查找指定 ID 的评论
 */
export function findCommentInTree(comments, commentId) {
  for (const comment of comments) {
    if (comment.id === commentId) {
      return comment
    }
    if (Array.isArray(comment.replies) && comment.replies.length) {
      const found = findCommentInTree(comment.replies, commentId)
      if (found) return found
    }
  }
  return null
}

/**
 * 构建评论树（从扁平列表构建树形结构）
 */
export function buildCommentTree(flat) {
  if (!Array.isArray(flat) || flat.length === 0) return []
  
  const map = new Map()
  flat.forEach((c) => {
    map.set(c.id, { ...c, replies: [] })
  })
  
  const roots = []
  map.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId).replies.push(c)
    } else {
      roots.push(c)
    }
  })
  return roots
}

/**
 * 规范化评论数据，补充 author/createdAt 字段
 */
export function normalizeComment(comment) {
  return {
    ...comment,
    author: {
      name: comment.creatorName || comment.author?.name || '匿名',
      avatar: comment.creatorAvatar || comment.author?.avatar || '',
    },
    createdAt: comment.creationTime || comment.createdAt,
    replies: Array.isArray(comment.replies)
      ? comment.replies.map(normalizeComment)
      : [],
  }
}

/**
 * 规范化评论树
 */
export function normalizeCommentTree(items) {
  if (!Array.isArray(items)) return []
  return items.map(normalizeComment)
}

/**
 * 更新评论树中指定评论的属性
 */
export function patchCommentInTree(list, commentId, updater) {
  for (const item of list) {
    if (item.id === commentId) {
      updater(item)
      return true
    }
    if (Array.isArray(item.replies) && item.replies.length) {
      if (patchCommentInTree(item.replies, commentId, updater)) {
        return true
      }
    }
  }
  return false
}

