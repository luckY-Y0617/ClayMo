/**
 * 编辑器相关类型定义
 */
import type { Editor } from '@tiptap/vue-3'
import type { JSONContent } from '@tiptap/core'

// ============================================
// 编辑器会话状态
// ============================================

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export interface EditorSessionState {
  currentDocument: EditorDocument | null
  editor: Editor | null
  isSaving: boolean
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  unsavedChanges: boolean
}

export interface EditorSession {
  // State (readonly)
  currentDocument: Readonly<EditorDocument | null>
  editor: Readonly<Editor | null>
  isSaving: Readonly<boolean>
  saveStatus: Readonly<SaveStatus>
  lastSavedAt: Readonly<Date | null>
  unsavedChanges: Readonly<boolean>

  // Computed
  hasUnsavedChanges: boolean
  canSave: boolean

  // Actions
  setCurrentDocument: (doc: EditorDocument | null) => void
  setEditor: (editor: Editor | null) => void
  setSaving: (status: SaveStatus) => void
  markUnsaved: () => void
  markSaved: () => void
  markError: () => void
  updateCurrentDocument: (updates: Partial<EditorDocument>) => void
}

// ============================================
// 文档类型
// ============================================

export interface EditorDocument {
  id: string
  title: string
  content: JSONContent | string
  parentId?: string
  knowledgeBaseId: string
  tags: string[]
  type?: string
  order?: number
  isPinned?: boolean
  status?: string
  lastModificationTime?: string
  lastContentUpdateTime?: string
  creationTime?: string
  contentJson?: string
  contentHtml?: string
  plainText?: string
}

export interface DocumentContentInput {
  contentJson: string
  contentHtml: string
  plainText: string
  contentFormat?: string
  isAutoSave?: boolean
  changeSummary?: string
}

export interface DocumentSavePayload {
  json: JSONContent
  html: string
  plainText: string
  isAutoSave?: boolean
  changeSummary?: string
}

// ============================================
// 评论类型
// ============================================

export interface CommentPosition {
  type: 'range' | 'block'
  blockId?: string
  // Range anchor (for precise positioning)
  startOffset?: number
  endOffset?: number
  startText?: string
  endText?: string
}

export interface CommentAuthor {
  id: string
  name: string
  avatar?: string
}

export interface Comment {
  id: string
  content: string
  author?: CommentAuthor
  authorId?: string
  authorAvatar?: string
  createdAt: string
  updatedAt?: string
  parentId?: string
  position?: CommentPosition & { from?: number; to?: number }
  likeCount?: number
  isLiked?: boolean
  replies?: Comment[]
  children?: Comment[] // 树状结构子评论
  replyContent?: string // 用于 UI 状态
}

export interface CommentCreateInput {
  content: string
  parentId?: string | null
  position?: CommentPosition | null
}

// ============================================
// 分享/导出类型
// ============================================

export interface ShareSettings {
  visibility: 'private' | 'public' | 'team'
  allowComment: boolean
  allowEdit: boolean
  expiresAt: string
  shareLink: string
}

export interface ExportOptions {
  formats: ('markdown' | 'html' | 'pdf')[]
  includeComments?: boolean
  includeMetadata?: boolean
}

export interface ExportState {
  loading: boolean
  progress: number
}

// ============================================
// 版本类型
// ============================================

export interface DocumentVersion {
  id: string
  version: number
  changeSummary?: string
  createdAt: string
  createdBy?: string
  createdByName?: string
}

export interface VersionState {
  saving: boolean
}

// ============================================
// 文档搜索类型
// ============================================

export interface DocumentSearchResult {
  id: string
  title: string
  summary?: string
  knowledgeBaseId: string
}

export interface DocumentSearchState {
  loading: boolean
  results: DocumentSearchResult[]
  keyword: string
  pendingAction: {
    editor: Editor
    range: { from: number; to: number }
    type: 'card' | 'inline'
  } | null
}

// ============================================
// 布局状态
// ============================================

export type LayoutMode = 'write' | 'preview' | 'manage'

export interface LayoutState {
  sidebarCollapsed: boolean
  mode: LayoutMode
}

export interface ModalsState {
  share: boolean
  export: boolean
  saveVersion: boolean
  versionHistory: boolean
  manage: boolean
  documentSearch: boolean
  commentDrawer: boolean
}

// ============================================
// TipTap 扩展类型
// ============================================

export interface BlockIdOptions {
  types: string[]
  htmlAttribute: string
  attrName: string
}

export interface CommentMarkAttrs {
  commentId: string
}

export interface ImageBlockAttrs {
  src: string
  alt?: string
  title?: string
  width?: number
  height?: number
  alignment?: 'left' | 'center' | 'right'
  fileId?: string
}

export interface FileBlockAttrs {
  fileId: string
  fileName: string
  fileSize: number
  mimeType: string
  url?: string
}

export interface CardDocumentReferenceAttrs {
  docId: string
  knowledgeBaseId: string
  title?: string
  summary?: string
}

export interface InlineDocumentReferenceAttrs {
  docId: string
  knowledgeBaseId: string
  title?: string
}

// ============================================
// Slash Command 类型
// ============================================

export interface SlashCommandItem {
  title: string
  description?: string
  icon?: string
  command: (props: { editor: Editor; range: { from: number; to: number } }) => void
  keywords?: string[]
  group?: string
}

export interface SlashCommandGroup {
  title: string
  items: SlashCommandItem[]
}

