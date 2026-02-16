import { ref, computed } from 'vue'

/**
 * 核心状态：图片库 + 画布 item + 选择态 + 边界限制 + 尺寸更新
 * 约定：canvasItems 的 x/y/width/height 都是“画布实际像素坐标系”（不是显示像素）
 */
export function useMontageState(options = {}) {
  const { canvasWidth, canvasHeight } = options

  // 图片库
  const images = ref([])
  const selectedImageIndex = ref(-1)

  // 画布 items
  const canvasItems = ref([])
  const selectedCanvasItemIndex = ref(-1)

  // 画布尺寸
  const canvasWidthRef = canvasWidth || ref(1560)
  const canvasHeightRef = canvasHeight || ref(1440)
  const selectedCanvasSize = ref('1560x1440')
  const customWidth = ref(canvasWidthRef.value)
  const customHeight = ref(canvasHeightRef.value)

  const selectedItem = computed(() => {
    if (selectedCanvasItemIndex.value === -1) {
      return { x: 0, y: 0, width: 0, height: 0, rotation: 0, opacity: 1 }
    }
    return canvasItems.value[selectedCanvasItemIndex.value]
  })

  const selectedItemActualSize = computed(() => {
    if (selectedCanvasItemIndex.value === -1) return { width: 0, height: 0 }
    const item = canvasItems.value[selectedCanvasItemIndex.value]
    return { width: Math.round(item.width), height: Math.round(item.height) }
  })

  // 工具：截断文件名
  const truncateFileName = (fileName, maxLength = 20) => {
    if (!fileName || fileName.length <= maxLength) return fileName
    const lastDot = fileName.lastIndexOf('.')
    if (lastDot > 0) {
      const name = fileName.substring(0, lastDot)
      const ext = fileName.substring(lastDot)
      const truncated = name.substring(0, maxLength - ext.length - 3) + '...'
      return truncated + ext
    }
    return fileName.substring(0, maxLength - 3) + '...'
  }

  // 图片加载：加入图片库
  const addImages = async (files) => {
    for (const file of files) {
      const url = URL.createObjectURL(file)
      const img = new Image()

      await new Promise((resolve) => {
        img.onload = () => {
          images.value.push({
            file,
            url,
            name: file.name,
            width: img.naturalWidth,
            height: img.naturalHeight,
          })
          resolve(null)
        }
        img.src = url
      })
    }
  }

  const removeImage = (index) => {
    const image = images.value[index]
    if (!image) return

    URL.revokeObjectURL(image.url)
    images.value.splice(index, 1)

    // 从画布移除对应 item
    canvasItems.value = canvasItems.value.filter((it) => it.image !== image)

    if (selectedImageIndex.value === index) selectedImageIndex.value = -1
    else if (selectedImageIndex.value > index) selectedImageIndex.value--
    if (selectedCanvasItemIndex.value >= canvasItems.value.length) {
      selectedCanvasItemIndex.value = canvasItems.value.length - 1
    }
  }

  const clearImages = () => {
    images.value.forEach((img) => URL.revokeObjectURL(img.url))
    images.value = []
    canvasItems.value = []
    selectedImageIndex.value = -1
    selectedCanvasItemIndex.value = -1
  }

  const isImageOnCanvas = (image) => {
    return canvasItems.value.some((item) => item.image === image)
  }

  // 选中左侧图片：若不在画布则自动添加
  const selectImage = (index) => {
    if (selectedImageIndex.value === index) {
      selectedImageIndex.value = -1
      return
    }

    selectedImageIndex.value = index
    selectedCanvasItemIndex.value = -1

    const image = images.value[index]
    if (!image) return

    if (isImageOnCanvas(image)) return

    const ar = image.width / image.height
    const w = 150
    const h = w / ar
    const x = 50 + canvasItems.value.length * 20
    const y = 50 + canvasItems.value.length * 20

    canvasItems.value.push({
      image,
      x,
      y,
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      zIndex: canvasItems.value.length,
    })

    selectedCanvasItemIndex.value = canvasItems.value.length - 1
    selectedImageIndex.value = -1
  }

  const removeCanvasItem = (index) => {
    canvasItems.value.splice(index, 1)
    if (selectedCanvasItemIndex.value === index) selectedCanvasItemIndex.value = -1
    else if (selectedCanvasItemIndex.value > index) selectedCanvasItemIndex.value--
  }

  // 基于画布实际尺寸进行边界限制（不再基于显示区域，避免导出时出现空白）
  const clampToCanvasBounds = (item) => {
    if (!item || item.width <= 0 || item.height <= 0) return item

    // 使用画布的实际尺寸作为边界，而不是显示区域
    // 这样图片可以填满整个画布，导出时不会有空白
    const maxX = canvasWidthRef.value
    const maxY = canvasHeightRef.value

    // 若 item 比画布还大，先缩到画布内并保持原图比例
    const ar = item.image.width / item.image.height

    if (item.width > maxX) {
      item.width = maxX
      item.height = item.width / ar
      item.x = 0
      item.y = Math.max(0, Math.min(item.y, maxY - item.height))
      return item
    }

    if (item.height > maxY) {
      item.height = maxY
      item.width = item.height * ar
      item.y = 0
      item.x = Math.max(0, Math.min(item.x, maxX - item.width))
      return item
    }

    // 限制位置不超出画布边界
    const boundX = maxX - item.width
    const boundY = maxY - item.height

    item.x = Math.max(0, Math.min(item.x, boundX))
    item.y = Math.max(0, Math.min(item.y, boundY))

    return item
  }

  // 样式：直接使用画布实际坐标（scale 由父容器 canvas-content 处理）
  const getItemStyle = (item) => {
    return {
      left: `${item.x}px`,
      top: `${item.y}px`,
      width: `${item.width}px`,
      height: `${item.height}px`,
      transform: `rotate(${item.rotation}deg)`,
      opacity: item.opacity,
      zIndex: item.zIndex,
      transformOrigin: 'center center',
      overflow: 'hidden',
    }
  }

  const updateSelectedItem = () => {
    if (selectedCanvasItemIndex.value === -1) return
    const item = canvasItems.value[selectedCanvasItemIndex.value]
    if (!item) return

    // 保持原图宽高比
    if (item.width && item.height) {
      const ar = item.image.width / item.image.height
      const curAr = item.width / item.height
      if (Math.abs(curAr - ar) > 0.01) {
        item.height = item.width / ar
      }
    }

    clampToCanvasBounds(item)
    canvasItems.value[selectedCanvasItemIndex.value] = { ...item }
  }

  const updateItemActualSize = (dimension, event) => {
    if (selectedCanvasItemIndex.value === -1) return
    const v = parseFloat(String(event?.target?.value ?? ''))
    if (!Number.isFinite(v) || v <= 0) return

    const item = canvasItems.value[selectedCanvasItemIndex.value]
    if (!item) return

    const ar = item.image.width / item.image.height

    if (dimension === 'width') {
      item.width = v
      item.height = v / ar
    } else {
      item.height = v
      item.width = v * ar
    }

    clampToCanvasBounds(item)
    canvasItems.value[selectedCanvasItemIndex.value] = { ...item }
  }

  const updateCanvasSize = () => {
    if (selectedCanvasSize.value === 'custom') return
    const [w, h] = selectedCanvasSize.value.split('x').map(Number)
    if (!w || !h) return
    canvasWidthRef.value = w
    canvasHeightRef.value = h

    canvasItems.value.forEach((item) => clampToCanvasBounds(item))
  }

  const updateCustomSize = () => {
    if (!customWidth.value || !customHeight.value) return
    canvasWidthRef.value = Number(customWidth.value)
    canvasHeightRef.value = Number(customHeight.value)
    canvasItems.value.forEach((item) => clampToCanvasBounds(item))
  }

  // 画布选中逻辑（单独暴露，交互层会用）
  const selectCanvasItem = (index) => {
    if (selectedCanvasItemIndex.value === index) selectedCanvasItemIndex.value = -1
    else selectedCanvasItemIndex.value = index
    selectedImageIndex.value = -1
  }

  return {
    // data
    images,
    canvasItems,
    selectedImageIndex,
    selectedCanvasItemIndex,

    // canvas size
    canvasWidth: canvasWidthRef,
    canvasHeight: canvasHeightRef,
    selectedCanvasSize,
    customWidth,
    customHeight,

    // computed
    selectedItem,
    selectedItemActualSize,

    // image lib
    addImages,
    removeImage,
    clearImages,
    truncateFileName,
    selectImage,
    isImageOnCanvas,

    // canvas items
    selectCanvasItem,
    removeCanvasItem,
    clampToCanvasBounds,
    getItemStyle,
    updateSelectedItem,
    updateItemActualSize,

    // canvas size actions
    updateCanvasSize,
    updateCustomSize,
  }
}
