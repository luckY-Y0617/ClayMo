import { ref, computed } from 'vue'

/**
 * 批量图片缩放处理
 */
export function useBatchResizeProcessor(imageList) {
  const resizeMode = ref('percentage')
  const targetSize = ref(800)
  const scalePercentage = ref(50)
  const quality = ref(0.9)
  const processing = ref(false)
  const processedCount = ref(0)

  const allProcessed = computed(() => {
    return imageList.value.length > 0 && imageList.value.every((item) => item.processed)
  })

  const resizeImage = (item) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        let newWidth, newHeight
        const { width, height } = item.originalSize

        if (resizeMode.value === 'percentage') {
          const scale = scalePercentage.value / 100
          newWidth = Math.round(width * scale)
          newHeight = Math.round(height * scale)
        } else if (resizeMode.value === 'width') {
          newWidth = targetSize.value
          newHeight = Math.round((height / width) * newWidth)
        } else {
          newHeight = targetSize.value
          newWidth = Math.round((width / height) * newHeight)
        }

        const canvas = document.createElement('canvas')
        canvas.width = newWidth
        canvas.height = newHeight
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        canvas.toBlob(
          (blob) => {
            item.resizedSize = { width: newWidth, height: newHeight }
            item.resizedBlob = blob
            item.processed = true
            item.processing = false
            resolve()
          },
          'image/png',
          quality.value
        )
      }
      img.src = item.preview
    })
  }

  const batchProcess = async () => {
    if (processing.value) return
    processing.value = true
    processedCount.value = 0

    for (const item of imageList.value) {
      if (item.processed) {
        processedCount.value++
        continue
      }
      item.processing = true
      await resizeImage(item)
      processedCount.value++
    }

    processing.value = false
  }

  return {
    resizeMode,
    targetSize,
    scalePercentage,
    quality,
    processing,
    processedCount,
    allProcessed,
    batchProcess,
  }
}

