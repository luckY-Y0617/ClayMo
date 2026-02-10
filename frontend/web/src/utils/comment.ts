/**
 * 评论工具函数
 */
import type { Comment } from '@/types/editor'

/**
 * 展平评论树，返回所有评论（包括回复）
 */
export function flattenCommentTree(comments: Comment[]): Comment[] {
  const flat: Comment[] = []
  const walk = (list: Comment[]) => {
    if (!Array.isArray(list)) return
    list.forEach((c) => {
      if (c?.id) {
        flat.push(c)
      }
      if (Array.isArray(c.replies) && c.replies.length) {
        walk(c.replies)
      }
      if (Array.isArray(c.children) && c.children.length) {
        walk(c.children)
      }
    })
  }
  walk(comments)
  return flat
}

/**
 * 在评论树中查找指定 ID 的评论
 */
export function findCommentInTree(comments: Comment[], commentId: string): Comment | null {
  for (const comment of comments) {
    if (comment.id === commentId) {
      return comment
    }
    if (Array.isArray(comment.replies) && comment.replies.length) {
      const found = findCommentInTree(comment.replies, commentId)
      if (found) return found
    }
    if (Array.isArray(comment.children) && comment.children.length) {
      const found = findCommentInTree(comment.children, commentId)
      if (found) return found
    }
  }
  return null
}

/**
 * 构建评论树（从扁平列表构建树形结构）
 */
export function buildCommentTree(flat: Comment[]): Comment[] {
  if (!Array.isArray(flat) || flat.length === 0) return []

  const map = new Map<string, Comment>()
  flat.forEach((c) => {
    map.set(c.id, { ...c, replies: [] })
  })

  const roots: Comment[] = []
  map.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) {
      const parent = map.get(c.parentId)!
      if (!parent.replies) parent.replies = []
      parent.replies.push(c)
    } else {
      roots.push(c)
    }
  })
  return roots
}

interface RawComment {
  id: string
  content: string
  creatorName?: string
  creatorAvatar?: string
  author?: { name?: string; avatar?: string }
  creationTime?: string
  createdAt?: string
  parentId?: string
  position?: unknown
  likeCount?: number
  isLiked?: boolean
  replies?: RawComment[]
  children?: RawComment[]
}

/**
 * 规范化评论数据，补充 author/createdAt 字段
 */
export function normalizeComment(comment: RawComment): Comment {
  return {
    ...comment,
    author: {
      id: '',
      name: comment.creatorName || comment.author?.name || '匿名',
      avatar: comment.creatorAvatar || comment.author?.avatar || '',
    },
    createdAt: comment.creationTime || comment.createdAt || '',
    replies: Array.isArray(comment.replies)
      ? comment.replies.map(normalizeComment)
      : [],
    children: Array.isArray(comment.children)
      ? comment.children.map(normalizeComment)
      : [],
  } as Comment
}

/**
 * 规范化评论树
 */
export function normalizeCommentTree(items: RawComment[]): Comment[] {
  if (!Array.isArray(items)) return []
  return items.map(normalizeComment)
}

/**
 * 更新评论树中指定评论的属性
 */
export function patchCommentInTree(
  list: Comment[],
  commentId: string,
  updater: (item: Comment) => void
): boolean {
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
    if (Array.isArray(item.children) && item.children.length) {
      if (patchCommentInTree(item.children, commentId, updater)) {
        return true
      }
    }
  }
  return false
}
