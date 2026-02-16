/**
 * 文件系统工具函数
 * 用于选择文件夹和保存文件
 */

/**
 * 检查浏览器是否支持 File System Access API
 */
export const isFileSystemSupported = () => {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window && 'showSaveFilePicker' in window
}

/**
 * 选择文件夹
 * @returns {Promise<FileSystemDirectoryHandle|null>} 返回文件夹句柄，如果不支持则返回null
 */
export const selectDirectory = async () => {
  if (!isFileSystemSupported()) {
    return null
  }
  
  try {
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite'
    })
    return directoryHandle
  } catch (error) {
    // 用户取消了选择
    if (error.name === 'AbortError') {
      return null
    }
    console.error('选择文件夹失败:', error)
    throw error
  }
}

/**
 * 保存文件到指定文件夹
 * @param {FileSystemDirectoryHandle} directoryHandle - 文件夹句柄
 * @param {Blob} blob - 要保存的文件blob
 * @param {string} fileName - 文件名
 * @returns {Promise<void>}
 */
export const saveFileToDirectory = async (directoryHandle, blob, fileName) => {
  if (!directoryHandle) {
    throw new Error('文件夹句柄无效')
  }
  
  try {
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
  } catch (error) {
    console.error('保存文件失败:', error)
    throw error
  }
}

/**
 * 将base64数据URL转换为Blob
 * @param {string} dataURL - base64数据URL
 * @returns {Blob}
 */
export const dataURLToBlob = (dataURL) => {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * 传统下载方式（降级方案）
 * @param {string} dataURL - base64数据URL
 * @param {string} fileName - 文件名
 */
export const downloadFile = (dataURL, fileName) => {
  const link = document.createElement('a')
  link.href = dataURL
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

