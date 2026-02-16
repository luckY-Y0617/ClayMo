import { ref } from 'vue'

/**
 * 批量图片输入处理
 */
export function useBatchImageInput({ imageList, processedCount }) {
  const fileInput = ref(null)
  const isDragOver = ref(false)

  const loadImageFile = (file) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        resolve({
          file,
          name: file.name,
          preview: url,
          originalSize: { width: img.naturalWidth, height: img.naturalHeight },
          resizedSize: null,
          resizedBlob: null,
          processed: false,
          processing: false,
        })
      }
      img.src = url
    })
  }

  const addFiles = async (files) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const items = await Promise.all(validFiles.map(loadImageFile))
    imageList.value.push(...items)
  }

  const selectImage = () => fileInput.value?.click()

  const addMoreImages = () => fileInput.value?.click()

  const handleFileSelect = (event) => {
    const files = event?.target?.files
    if (files?.length) addFiles(files)
    if (event?.target) event.target.value = ''
  }

  const handleDragOver = () => {}
  const handleDragEnter = () => { isDragOver.value = true }
  const handleDragLeave = () => { isDragOver.value = false }

  const handleDrop = (event) => {
    isDragOver.value = false
    const files = event.dataTransfer?.files
    if (files?.length) addFiles(files)
  }

  const resetInput = () => {
    imageList.value.forEach((item) => {
      if (item.preview) URL.revokeObjectURL(item.preview)
      if (item.resizedBlob) URL.revokeObjectURL(URL.createObjectURL(item.resizedBlob))
    })
    imageList.value = []
    processedCount.value = 0
  }

  return {
    fileInput,
    isDragOver,
    selectImage,
    addMoreImages,
    handleFileSelect,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    resetInput,
  }
}

