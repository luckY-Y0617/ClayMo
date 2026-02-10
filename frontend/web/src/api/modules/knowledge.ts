import { http, API } from '@/utils/http'

/** 知识库可见性 */
export enum KbVisibility {
  Private = 0,
  Team = 1,
  Public = 2,
}

/** 知识库成员角色 */
export enum KbMemberRole {
  Owner = 0,
  Admin = 1,
  Editor = 2,
  Viewer = 3,
}

/** 文档类型 */
export enum DocumentType {
  Normal = 'Normal',
  Folder = 'Folder',
}

/** 知识库统计信息 */
export interface KbStats {
  docs: number
  members?: number
  views?: number
}

/** 知识库基本信息 */
export interface KnowledgeBase {
  id: string
  name: string
  description?: string
  icon?: string
  visibility: KbVisibility
  teamId?: string | null
  creatorId?: string
  creationTime?: string
  lastModificationTime?: string
  allowMembersCreateDoc?: boolean
  stats?: KbStats
}

/** 知识库列表查询参数 */
export interface KbListParams {
  filter?: string | null
  visibility?: KbVisibility | null
  sorting?: string | null
  skipCount?: number
  maxResultCount?: number
}

/** 知识库创建参数 */
export interface KbCreateInput {
  name: string
  description?: string
  icon?: string
  visibility: KbVisibility
  teamId?: string
  allowMembersCreateDoc?: boolean
}

/** 知识库更新参数 */
export interface KbUpdateInput {
  name?: string
  description?: string
  icon?: string
  visibility?: KbVisibility
  allowMembersCreateDoc?: boolean
}

/** 知识库上下文信息 */
export interface KbContext {
  knowledgeBase: KnowledgeBase
  currentUserRole: KbMemberRole | null
  membership?: {
    isMember: boolean
    role: KbMemberRole | null
    isActive: boolean
    joinedTime?: string
  }
}

/** 文档节点 */
export interface DocumentNode {
  id: string
  title: string
  type: DocumentType
  parentId?: string | null
  knowledgeBaseId: string
  order?: number
  creationTime?: string
  lastModificationTime?: string
  children?: DocumentNode[]
}

/** 文档详情 */
export interface DocumentDetail extends DocumentNode {
  contentJson?: string
  contentHtml?: string
  contentPlainText?: string
  summary?: string
  wordCount?: number
  creatorId?: string
  lastEditorId?: string
}

/** 文档创建参数 */
export interface DocumentCreateInput {
  knowledgeBaseId?: string
  parentId?: string | null
  title: string
  type?: DocumentType
  initialContentJson?: string | null
}

/** 文档重命名参数 */
export interface DocumentRenameInput {
  title: string
}

/** 文档移动参数 */
export interface DocumentMoveInput {
  parentId?: string | null
}

/** 文档内容 */
export interface DocumentContent {
  contentJson?: string
  contentHtml?: string
  contentPlainText?: string
}

/** 文档内容保存参数 */
export interface DocumentContentSaveInput {
  contentJson?: string
  contentHtml?: string
  contentPlainText?: string
  changeSummary?: string | null
}

/** 文档版本 */
export interface DocumentVersion {
  id: string
  documentId: string
  version: number
  changeSummary?: string
  creatorId?: string
  creationTime: string
  contentJson?: string
}

/** 标签 */
export interface Tag {
  id: string
  name: string
  slug?: string
  color?: string
  knowledgeBaseId?: string
  usageCount?: number
  creationTime?: string
}

/** 标签创建参数 */
export interface TagCreateInput {
  name: string
  color?: string
  knowledgeBaseId?: string
}

/** 标签更新参数 */
export interface TagUpdateInput {
  name?: string
  color?: string
}

/** 评论位置 */
export interface CommentPosition {
  type: 'block' | 'range'
  blockId?: string
  startOffset?: number
  endOffset?: number
  startPath?: number[]
  endPath?: number[]
  quote?: string
}

/** 评论 */
export interface Comment {
  id: string
  documentId: string
  content: string
  parentId?: string | null
  position?: CommentPosition | null
  isResolved?: boolean
  likeCount?: number
  likedByCurrentUser?: boolean
  creatorId?: string
  creatorName?: string
  creationTime: string
  children?: Comment[]
}

/** 评论创建参数 */
export interface CommentCreateInput {
  content: string
  parentId?: string | null
  position?: CommentPosition | null
}

/** 知识库成员 */
export interface KbMember {
  id?: string
  userId: string
  userName?: string
  role: KbMemberRole
  creationTime?: string
}

/** 成员添加/更新参数 */
export interface KbMemberInput {
  userId: string
  role: KbMemberRole | string
}

/** 知识库能力（权限） */
export interface KbCapabilities {
  knowledgeBaseId: string
  role: KbMemberRole | string
  isActiveMember: boolean
  caps: Record<string, boolean>
}

// ==================== API 实现 ====================

/** 知识库 API */
export const kbApi = {
  /* -------------------- 知识库（Knowledge Base） -------------------- */
  kb: {
    /**
     * 获取知识库列表
     */
    list(params: KbListParams = {}) {
      return http.get<{ items: KnowledgeBase[]; totalCount: number }>(`${API}/app/kbs`, {
        params: {
          filter: null,
          visibility: null,
          sorting: null,
          skipCount: 0,
          maxResultCount: 20,
          ...params,
        },
      })
    },

    /**
     * 获取知识库上下文（包含当前用户角色信息）
     */
    getContext(id: string) {
      return http.get<KbContext>(`${API}/app/kbs/${id}`)
    },

    /**
     * 创建知识库
     */
    create(data: KbCreateInput) {
      return http.post<KnowledgeBase>(`${API}/app/kbs`, data)
    },

    /**
     * 更新知识库
     */
    update(id: string, data: KbUpdateInput) {
      return http.put<KnowledgeBase>(`${API}/app/kbs/${id}`, data)
    },

    /**
     * 删除知识库
     */
    delete(id: string) {
      return http.delete(`${API}/app/kbs/${id}`)
    },
  },

  /* -------------------- 文档（Document） -------------------- */
  document: {
    /**
     * 获取文档详情
     */
    get(baseId: string, docId: string) {
      return http.get<DocumentDetail>(`${API}/app/kbs/${baseId}/documents/${docId}`)
    },

    /**
     * 获取文档树
     */
    getTree(baseId: string) {
      return http.get<DocumentNode[]>(`${API}/app/kbs/${baseId}/documents/tree`)
    },

    /**
     * 创建文档
     */
    create(baseId: string, data: DocumentCreateInput) {
      return http.post<DocumentNode>(
        `${API}/app/kbs/${baseId}/documents`,
        {
          knowledgeBaseId: data.knowledgeBaseId || baseId,
          parentId: data.parentId || null,
          title: data.title,
          type: data.type || DocumentType.Normal,
          initialContentJson: data.initialContentJson || null,
        }
      )
    },

    /**
     * 重命名文档
     */
    rename(baseId: string, docId: string, data: DocumentRenameInput) {
      return http.put(`${API}/app/kbs/${baseId}/documents/${docId}/rename`, data)
    },

    /**
     * 删除文档
     */
    delete(baseId: string, docId: string, includeChildren = false) {
      return http.delete(`${API}/app/kbs/${baseId}/documents/${docId}`, {
        params: { includeChildren },
      })
    },

    /**
     * 移动文档
     */
    move(baseId: string, docId: string, data: DocumentMoveInput) {
      return http.put(`${API}/app/kbs/${baseId}/documents/${docId}/move`, data)
    },

    /* -------------------- 文档内容 -------------------- */
    content: {
      /**
       * 获取文档内容
       */
      get(baseId: string, docId: string) {
        return http.get<DocumentContent>(`${API}/app/kbs/${baseId}/documents/${docId}/content`)
      },

      /**
       * 保存文档内容
       */
      save(baseId: string, docId: string, data: DocumentContentSaveInput) {
        return http.put(`${API}/app/kbs/${baseId}/documents/${docId}/content`, data)
      },
    },

    /* -------------------- 文档版本 -------------------- */
    version: {
      /**
       * 获取文档版本列表
       */
      list(baseId: string, docId: string) {
        return http.get<{ items: DocumentVersion[] }>(
          `${API}/app/kbs/${baseId}/documents/${docId}/versions`
        )
      },

      /**
       * 创建/保存版本
       */
      save(baseId: string, docId: string, data: { description?: string }) {
        return http.post<DocumentVersion>(
          `${API}/app/kbs/${baseId}/documents/${docId}/versions`,
          data
        )
      },

      /**
       * 恢复到指定版本
       */
      restore(baseId: string, docId: string, versionId: string) {
        return http.post(
          `${API}/app/kbs/${baseId}/documents/${docId}/versions/${versionId}/restore`,
          null
        )
      },
    },

    /* -------------------- 标签 -------------------- */
    tag: {
      /**
       * 获取知识库标签列表
       */
      list(baseId: string, params: Record<string, unknown> = {}) {
        return http.get<{ items: Tag[] }>(`${API}/app/kbs/${baseId}/tags`, {
          params,
        })
      },

      /**
       * 获取标签详情
       */
      get(id: string) {
        return http.get<Tag>(`${API}/app/tag/${id}`)
      },

      /**
       * 创建标签
       */
      create(data: TagCreateInput) {
        return http.post<Tag>(`${API}/app/tag`, data)
      },

      /**
       * 更新标签
       */
      update(id: string, data: TagUpdateInput) {
        return http.put<Tag>(`${API}/app/tag/${id}`, data)
      },

      /**
       * 删除标签
       */
      delete(id: string) {
        return http.delete(`${API}/app/tag/${id}`)
      },

      /**
       * 设置文档标签
       */
      setDocumentTags(documentId: string, tagIds: string[]) {
        return http.post(
          `${API}/app/document/tags`,
          { documentId, tagIds }
        )
      },
    },

    /* -------------------- 评论 -------------------- */
    comment: {
      /**
       * 获取文档评论列表
       */
      getList(baseId: string, documentId: string) {
        return http.get<{ items: Comment[] }>(
          `${API}/app/kbs/${baseId}/documents/${documentId}/comments`
        )
      },

      /**
       * 创建评论
       */
      create(baseId: string, documentId: string, body: CommentCreateInput) {
        const requestPayload = {
          content: body.content,
          parentId: body.parentId || null,
          position: body.position || null,
        }
        return http.post<Comment>(
          `${API}/app/kbs/${baseId}/documents/${documentId}/comments`,
          requestPayload
        )
      },

      /**
       * 删除评论
       */
      remove(baseId: string, documentId: string, commentId: string) {
        return http.delete(
          `${API}/app/kbs/${baseId}/documents/${documentId}/comments/${commentId}`
        )
      },

      /**
       * 点赞/取消点赞
       */
      toggleLike(baseId: string, documentId: string, commentId: string) {
        return http.post<{ likeCount: number; likedByCurrentUser: boolean }>(
          `${API}/app/kbs/${baseId}/documents/${documentId}/comments/${commentId}/like`,
          null
        )
      },

      /**
       * 解决评论（标记为已解决）
       */
      resolve(baseId: string, documentId: string, commentId: string) {
        return http.post(
          `${API}/app/kbs/${baseId}/documents/${documentId}/comments/${commentId}/resolve`,
          null
        )
      },

      /**
       * 重新打开评论
       */
      reopen(baseId: string, documentId: string, commentId: string) {
        return http.post(
          `${API}/app/kbs/${baseId}/documents/${documentId}/comments/${commentId}/reopen`,
          null
        )
      },
    },
  },

  /* -------------------- 成员管理 -------------------- */
  members: {
    /**
     * 获取知识库成员列表
     */
    list(baseId: string) {
      return http.get<{ items: KbMember[] }>(`${API}/app/kbs/${baseId}/members`)
    },

    /**
     * 添加或更新成员
     */
    addOrUpdate(baseId: string, payload: KbMemberInput) {
      return http.put(`${API}/app/kbs/${baseId}/members`, payload)
    },

    /**
     * 修改成员角色
     */
    changeRole(baseId: string, userId: string, role: KbMemberRole | string) {
      return http.put(`${API}/app/kbs/${baseId}/members/${userId}/role`, { role })
    },

    /**
     * 移除成员
     */
    remove(baseId: string, userId: string) {
      return http.delete(`${API}/app/kbs/${baseId}/members/${userId}`)
    },
  },

  /* -------------------- 权限能力 -------------------- */
  capabilities: {
    /**
     * 获取知识库权限
     */
    getKbCapabilities(kbId: string) {
      return http.get<KbCapabilities>(`${API}/app/kbs/${kbId}/caps`)
    },

    /**
     * 批量获取知识库权限
     */
    getBatchKbCapabilities(kbIds: string[]) {
      return http.post<KbCapabilities[]>(
        `${API}/app/kbs/caps:batch`,
        { knowledgeBaseIds: kbIds }
      )
    },
  },
}

export default kbApi
