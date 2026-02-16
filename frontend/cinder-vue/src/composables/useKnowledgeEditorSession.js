import { ref, computed, readonly } from 'vue'

/**
 * 编辑器会话状态管理
 * 
 * 职责：
 * - 管理编辑器实例和文档状态
 * - 追踪保存状态和未保存更改
 * - 每个编辑器页面实例拥有独立状态
 * - 随组件卸载自动销毁，避免状态污染
 */
export function useKnowledgeEditorSession() {
  const currentDocument = ref(null)
  const editor = ref(null)
  const isSaving = ref(false)
  const saveStatus = ref('saved') // 'saved' | 'saving' | 'unsaved' | 'error'
  const lastSavedAt = ref(null)
  const unsavedChanges = ref(false)

  const hasUnsavedChanges = computed(() => unsavedChanges.value)
  const canSave = computed(() => currentDocument.value && !isSaving.value)

  const setCurrentDocument = (doc) => {
    currentDocument.value = doc
    unsavedChanges.value = false
    saveStatus.value = 'saved'
  }

  const setEditor = (editorInstance) => {
    editor.value = editorInstance
  }

  const setSaving = (status) => {
    isSaving.value = status === 'saving'
    saveStatus.value = status
  }

  const markUnsaved = () => {
    unsavedChanges.value = true
    saveStatus.value = 'unsaved'
  }

  const markSaved = () => {
    unsavedChanges.value = false
    saveStatus.value = 'saved'
    lastSavedAt.value = new Date()
  }

  const markError = () => {
    saveStatus.value = 'error'
    isSaving.value = false
  }

  const updateCurrentDocument = (updates) => {
    if (!currentDocument.value) return
    Object.assign(currentDocument.value, updates)
  }

  return {
    // State (readonly for safety)
    currentDocument: readonly(currentDocument),
    editor: readonly(editor),
    isSaving: readonly(isSaving),
    saveStatus: readonly(saveStatus),
    lastSavedAt: readonly(lastSavedAt),
    unsavedChanges: readonly(unsavedChanges),

    // Computed
    hasUnsavedChanges,
    canSave,

    // Actions
    setCurrentDocument,
    setEditor,
    setSaving,
    markUnsaved,
    markSaved,
    markError,
    updateCurrentDocument,
  }
}
