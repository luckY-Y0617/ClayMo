import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { kbApi } from '@/api/kb.api'
import { useDocumentTreeStore } from '@/stores/documentTree'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useRoute } from 'vue-router'

/**
 * 文档管理 Composable
 * @param {Object} editorSession - 编辑器会话对象
 */
export function useDocument(editorSession) {
  const currentDocument = ref(null)
  const documentTreeStore = useDocumentTreeStore()
  const baseStore = useKnowledgeBaseStore()
  const route = useRoute()

  /**
   * 解析编辑器内容
   */
  const parseEditorContent = (content) => {
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
  const transformDocument = (response) => {
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
  const loadDocument = async (docId) => {
    if (!docId) {
      currentDocument.value = null
      editorSession.setCurrentDocument(null)
      return
    }

    try {
      const knowledgeBaseId = route.params.baseId || baseStore.currentBase?.id
      if (!knowledgeBaseId) {
        ElMessage.error('无法确定知识库ID')
        return
      }

      // 并行请求元数据和内容
      const [meta, content] = await Promise.all([
        kbApi.document.get(knowledgeBaseId, docId),
        kbApi.document.content.get(knowledgeBaseId, docId),
      ])

      // 合并元数据和内容
      const fullDocumentData = { ...meta, content }

      const document = transformDocument(fullDocumentData)

      currentDocument.value = document
      editorSession.setCurrentDocument(document)

      if (document.knowledgeBaseId) {
        documentTreeStore.setSelectedKey(document.knowledgeBaseId, docId)
      }

      return document
    } catch (error) {
      // 保留这个错误日志，因为它对生产环境下的问题排查很重要
      console.error('加载文档失败:', error)
      ElMessage.error('加载文档失败')
      throw error
    }
  }

  /**
   * 保存文档内容
   */
  const saveContent = async (docId, { json, html, plainText, isAutoSave = true, changeSummary }) => {
    const knowledgeBaseId = currentDocument.value?.knowledgeBaseId 
      || route.params.baseId 
      || baseStore.currentBase?.id
    
    if (!knowledgeBaseId) {
      ElMessage.error('保存失败：无法确定知识库')
      editorSession.markError()
      return
    }
    
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
      console.error('保存内容失败:', error) // 保留重要错误日志
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
