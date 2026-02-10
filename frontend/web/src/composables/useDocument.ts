/**
 * 文档管理 Composable
 */
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { kbApi } from '@/api'
import { useDocumentTreeStore, useKbWorkspaceStore } from '@/stores'
import type { EditorSession } from './useEditorSession'
import type { EditorDocument, DocumentSavePayload } from '@/types/editor'
import type { JSONContent } from '@tiptap/core'

interface DocumentContentResponse {
  contentJson?: string
  contentHtml?: string
  plainText?: string
  updatedTime?: string
}

interface DocumentMetaResponse {
  id: string
  title: string
  parentId?: string
  knowledgeBaseId: string
  tags?: string[]
  type?: string
  order?: number
  isPinned?: boolean
  status?: string
  lastModificationTime?: string
  lastContentUpdateTime?: string
  creationTime?: string
}

interface FullDocumentResponse extends DocumentMetaResponse {
  content?: DocumentContentResponse
}

/**
 * 文档管理 Composable
 * @param editorSession - 编辑器会话对象
 */
export function useDocument(editorSession: EditorSession) {
  const currentDocument = ref<EditorDocument | null>(null)
  const documentTreeStore = useDocumentTreeStore()
  const kbWorkspaceStore = useKbWorkspaceStore()
  const route = useRoute()

  /**
   * 解析编辑器内容
   */
  const parseEditorContent = (content?: DocumentContentResponse): JSONContent | string => {
    if (!content?.contentJson) {
      return content?.contentHtml ?? '<p></p>'
    }

    try {
      return typeof content.contentJson === 'string'
        ? JSON.parse(content.contentJson)
        : content.contentJson
    } catch {
      return content.contentHtml ?? '<p></p>'
    }
  }

  /**
   * 转换 API 返回的文档数据为编辑器格式
   */
  const transformDocument = (response: FullDocumentResponse): EditorDocument => {
    const editorContent = parseEditorContent(response.content)

    return {
      id: response.id,
      title: response.title,
      content: editorContent,
      parentId: response.parentId,
      knowledgeBaseId: response.knowledgeBaseId,
      tags: response.tags ?? [],
      type: response.type,
      order: response.order,
      isPinned: response.isPinned,
      status: response.status,
      lastModificationTime: response.lastModificationTime ?? response.content?.updatedTime,
      lastContentUpdateTime: response.lastContentUpdateTime,
      creationTime: response.creationTime,
      contentJson: response.content?.contentJson,
      contentHtml: response.content?.contentHtml,
      plainText: response.content?.plainText,
    }
  }

  /**
   * 加载文档
   */
  const loadDocument = async (docId: string): Promise<EditorDocument | null> => {
    if (!docId) {
      currentDocument.value = null
      editorSession.setCurrentDocument(null)
      return null
    }

    try {
      const knowledgeBaseId =
        (route.params.baseId as string) || kbWorkspaceStore.currentBaseId || ''

      if (!knowledgeBaseId) {
        ElMessage.error('无法确定知识库ID')
        return null
      }

      // 并行请求元数据和内容
      const [meta, content] = await Promise.all([
        kbApi.document.get(knowledgeBaseId, docId),
        kbApi.document.content.get(knowledgeBaseId, docId),
      ])

      // 合并元数据和内容
      const fullDocumentData: FullDocumentResponse = { ...meta, content }

      const document = transformDocument(fullDocumentData)

      currentDocument.value = document
      editorSession.setCurrentDocument(document)

      if (document.knowledgeBaseId) {
        documentTreeStore.setSelectedKey(document.knowledgeBaseId, docId)
      }

      return document
    } catch (error) {
      console.error('加载文档失败:', error)
      ElMessage.error('加载文档失败')
      throw error
    }
  }

  /**
   * 保存文档内容
   */
  const saveContent = async (
    docId: string,
    payload: DocumentSavePayload
  ): Promise<void> => {
    const knowledgeBaseId =
      currentDocument.value?.knowledgeBaseId ||
      (route.params.baseId as string) ||
      kbWorkspaceStore.currentBaseId ||
      ''

    if (!knowledgeBaseId) {
      ElMessage.error('保存失败：无法确定知识库')
      editorSession.markError()
      return
    }

    const { json, html, plainText, isAutoSave = true, changeSummary } = payload

    const saveInput = {
      contentJson: JSON.stringify(json),
      contentHtml: html,
      plainText,
      contentFormat: 'tiptap',
      isAutoSave,
      changeSummary,
    }

    editorSession.setSaving('saving')

    try {
      await kbApi.document.content.save(knowledgeBaseId, docId, saveInput)
      editorSession.markSaved()

      if (currentDocument.value && !currentDocument.value.knowledgeBaseId) {
        currentDocument.value.knowledgeBaseId = knowledgeBaseId
      }

      // 更新本地文档数据（避免触发编辑器重置）
      if (currentDocument.value) {
        editorSession.updateCurrentDocument({
          contentJson: saveInput.contentJson,
          contentHtml: html,
          plainText,
        })

        Object.assign(currentDocument.value, {
          contentJson: saveInput.contentJson,
          contentHtml: html,
          plainText,
        })
      }
    } catch (error) {
      console.error('保存内容失败:', error)
      editorSession.markError()
      throw error
    }
  }

  return {
    currentDocument,
    loadDocument,
    saveContent,
  }
}

