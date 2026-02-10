/**
 * 编辑器会话状态管理
 *
 * 职责：
 * - 管理编辑器实例和文档状态
 * - 追踪保存状态和未保存更改
 * - 每个编辑器页面实例拥有独立状态
 * - 随组件卸载自动销毁，避免状态污染
 */
import { ref, computed, readonly, type Ref, type ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { EditorDocument, SaveStatus } from '@/types/editor'

export interface EditorSession {
  // State (readonly for safety)
  currentDocument: Readonly<Ref<EditorDocument | null>>
  editor: Readonly<Ref<Editor | null>>
  isSaving: Readonly<Ref<boolean>>
  saveStatus: Readonly<Ref<SaveStatus>>
  lastSavedAt: Readonly<Ref<Date | null>>
  unsavedChanges: Readonly<Ref<boolean>>

  // Computed
  hasUnsavedChanges: ComputedRef<boolean>
  canSave: ComputedRef<boolean>

  // Actions
  setCurrentDocument: (doc: EditorDocument | null) => void
  setEditor: (editor: Editor | null) => void
  setSaving: (status: SaveStatus) => void
  markUnsaved: () => void
  markSaved: () => void
  markError: () => void
  updateCurrentDocument: (updates: Partial<EditorDocument>) => void
}

export function useEditorSession(): EditorSession {
  const currentDocument = ref<EditorDocument | null>(null)
  const editor = ref<Editor | null>(null)
  const isSaving = ref(false)
  const saveStatus = ref<SaveStatus>('saved')
  const lastSavedAt = ref<Date | null>(null)
  const unsavedChanges = ref(false)

  const hasUnsavedChanges = computed(() => unsavedChanges.value)
  const canSave = computed(() => currentDocument.value !== null && !isSaving.value)

  const setCurrentDocument = (doc: EditorDocument | null) => {
    currentDocument.value = doc
    unsavedChanges.value = false
    saveStatus.value = 'saved'
  }

  const setEditor = (editorInstance: Editor | null) => {
    editor.value = editorInstance
  }

  const setSaving = (status: SaveStatus) => {
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

  const updateCurrentDocument = (updates: Partial<EditorDocument>) => {
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

// 导出类型别名（方便其他模块使用）
export type { EditorDocument, SaveStatus } from '@/types/editor'

