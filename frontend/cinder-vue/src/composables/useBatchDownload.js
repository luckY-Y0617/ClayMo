import { ref } from 'vue'

/**
 * 批量下载处理
 */
export function useBatchDownload(imageList) {
  const selectedFolderHandle = ref(null)
  const selectedFolderName = ref('')
  const isFileSystemSupported = ref('showDirectoryPicker' in window)
  const downloading = ref(false)

  const selectOutputFolder = async () => {
    if (!isFileSystemSupported.value) return
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      selectedFolderHandle.value = handle
      selectedFolderName.value = handle.name
    } catch (e) {
      if (e.name !== 'AbortError') console.error('选择文件夹失败:', e)
    }
  }

  const clearFolderSelection = () => {
    selectedFolderHandle.value = null
    selectedFolderName.value = ''
  }

  const getOutputFileName = (originalName) => {
    const lastDot = originalName.lastIndexOf('.')
    const name = lastDot > 0 ? originalName.substring(0, lastDot) : originalName
    return `${name}_resized.png`
  }

  const downloadSingle = async (item) => {
    if (!item.resizedBlob) return
    const fileName = getOutputFileName(item.name)

    if (selectedFolderHandle.value) {
      try {
        const fileHandle = await selectedFolderHandle.value.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(item.resizedBlob)
        await writable.close()
        return
      } catch (e) {
        console.error('保存到文件夹失败，使用默认下载:', e)
      }
    }

    const url = URL.createObjectURL(item.resizedBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  const batchDownload = async () => {
    if (downloading.value) return
    downloading.value = true

    const processed = imageList.value.filter((item) => item.processed && item.resizedBlob)
    for (const item of processed) {
      await downloadSingle(item)
      await new Promise((r) => setTimeout(r, 100))
    }

    downloading.value = false
  }

  return {
    selectedFolderHandle,
    selectedFolderName,
    isFileSystemSupported,
    downloading,
    selectOutputFolder,
    clearFolderSelection,
    downloadSingle,
    batchDownload,
  }
}

