import { ref, nextTick } from 'vue'

/**
 * 图片加载（文件选择 + 拖拽上传 + FileReader -> dataURL）
 * 只负责得到 imageSrc，不负责居中/裁剪几何（交给 useImageCropper）
 */
export function useImageLoader(options = {}) {
  const { fileInput, onBeforeLoad, onAfterLoad } = options

  const imageSrc = ref('')
  const isDragOver = ref(false)

  const selectImage = () => {
    fileInput?.value?.click?.()
  }

  const loadImageFile = (file) => {
    if (!file || !file.type?.startsWith?.('image/')) {
      alert('请选择有效的图片文件')
      return
    }

    onBeforeLoad?.(file)

    // 清空以确保同文件也能重新触发
    imageSrc.value = ''

    const reader = new FileReader()
    reader.onload = async (e) => {
      const result = e.target?.result
      if (!result) {
        alert('读取文件失败，结果为空')
        return
      }
      await nextTick()
      imageSrc.value = String(result)
      onAfterLoad?.(file, imageSrc.value)
    }
    reader.onerror = () => {
      alert('读取文件失败，请重试')
    }
    reader.readAsDataURL(file)
  }

  const handleFileSelect = (event) => {
    const input = event?.target
    const file = input?.files?.[0]
    if (file) loadImageFile(file)
    // 清空 input，允许重复选择同一文件
    if (input) input.value = ''
  }

  // 拖拽上传
  const handleDragOver = (event) => {
    event.preventDefault()
    isDragOver.value = true
  }
  const handleDragEnter = (event) => {
    event.preventDefault()
    isDragOver.value = true
  }
  const handleDragLeave = (event) => {
    event.preventDefault()
    isDragOver.value = false
  }
  const handleDrop = (event) => {
    event.preventDefault()
    isDragOver.value = false

    const files = event.dataTransfer?.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (file?.type?.startsWith?.('image/')) {
      loadImageFile(file)
    }
  }

  return {
    imageSrc,
    isDragOver,

    selectImage,
    loadImageFile,
    handleFileSelect,

    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop
  }
}
