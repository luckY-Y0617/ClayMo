import { ref, onMounted } from 'vue'
import {
  selectDirectory,
  saveFileToDirectory,
  dataURLToBlob,
  downloadFile,
  isFileSystemSupported as checkFileSystemSupport
} from '@/utils/fileSystem.js'

/**
 * 目录保存（File System Access API）+ fallback 下载
 */
export function useDirectorySave() {
  const selectedFolderHandle = ref(null)
  const selectedFolderName = ref('')
  const isFileSystemSupported = ref(false)

  onMounted(() => {
    try {
      isFileSystemSupported.value = !!checkFileSystemSupport?.()
    } catch {
      isFileSystemSupported.value = false
    }
  })

  const selectOutputFolder = async () => {
    try {
      const directoryHandle = await selectDirectory()
      if (directoryHandle) {
        selectedFolderHandle.value = directoryHandle
        selectedFolderName.value = directoryHandle.name || '已选择文件夹'
      }
    } catch (error) {
      console.error('选择文件夹失败:', error)
      alert('选择文件夹失败，请重试')
    }
  }

  const clearFolderSelection = () => {
    selectedFolderHandle.value = null
    selectedFolderName.value = ''
  }

  /**
   * 尝试保存到已选目录，失败则返回 false（由上层决定是否 fallback 下载）
   */
  const saveToSelectedDirectory = async (dataUrl, fileName) => {
    if (!selectedFolderHandle.value) return false
    try {
      const blob = dataURLToBlob(dataUrl)
      await saveFileToDirectory(selectedFolderHandle.value, blob, fileName)
      return true
    } catch (error) {
      console.error('保存到文件夹失败:', error)
      return false
    }
  }

  /**
   * 保存：优先目录，否则 download fallback（或目录失败 fallback）
   */
  const saveWithFallback = async (dataUrl, fileName, opts = {}) => {
    const { fallbackDownload = true } = opts

    const saved = await saveToSelectedDirectory(dataUrl, fileName)
    if (saved) return { savedToFolder: true }

    if (fallbackDownload) {
      try {
        const blob = dataURLToBlob(dataUrl)
        downloadFile(blob, fileName)
      } catch (e) {
        console.error('下载失败:', e)
        alert('下载失败，请重试')
      }
    }

    return { savedToFolder: false }
  }

  return {
    selectedFolderHandle,
    selectedFolderName,
    isFileSystemSupported,

    selectOutputFolder,
    clearFolderSelection,

    saveToSelectedDirectory,
    saveWithFallback
  }
}
