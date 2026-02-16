import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 裁剪核心：几何模型 + 交互（拖拽/缩放）+ 全局鼠标监听
 * - outputSize：输出尺寸（原图像素）
 * - cropBox：裁剪框（屏幕像素）
 * - actualScale：仅由 baseScale 决定（图片适配容器的基准缩放）
 */
export function useImageCropper(options = {}) {
  const {
    imageElement,        // ref<HTMLImageElement|null>
    imageWrapper,        // ref<HTMLDivElement|null>
    enableImageDrag = false
  } = options

  // 图片状态
  const imageLoaded = ref(false)

  // 基准缩放（图片初始适应容器的比例）
  const baseScale = ref(1)
  const actualScale = computed(() => baseScale.value)

  // 图片位置（屏幕坐标）
  const imagePosition = ref({
    x: 0,
    y: 0,
    scale: 1,       // 兼容字段，不作为实际缩放来源
    rotation: 0
  })

  // 输出尺寸（原图像素）
  const outputSize = ref({ width: 200, height: 200 })
  const customSize = outputSize

  // 裁剪框（屏幕像素）
  const cropBox = ref({ x: 50, y: 50, width: 200, height: 200 })

  // 宽高比（null 表示自由）
  const aspectRatio = ref(null)

  // 输入框本地状态（避免输入时被计算覆盖）
  const widthInputValue = ref(200)
  const heightInputValue = ref(200)
  const isInputtingWidth = ref(false)
  const isInputtingHeight = ref(false)

  const syncInputValues = () => {
    if (!isInputtingWidth.value) widthInputValue.value = outputSize.value.width
    if (!isInputtingHeight.value) heightInputValue.value = outputSize.value.height
  }

  // 裁剪框显示尺寸（屏幕像素）= outputSize * actualScale
  const cropBoxDisplaySize = computed(() => {
    const s = actualScale.value
    if (s <= 0) return { width: 0, height: 0 }
    return {
      width: outputSize.value.width * s,
      height: outputSize.value.height * s
    }
  })

  const imageStyle = computed(() => {
    const { x, y, rotation } = imagePosition.value
    return {
      transform: `translate(${x}px, ${y}px) scale(${actualScale.value}) rotate(${rotation}deg)`,
      transformOrigin: '0 0'
    }
  })

  const cropBoxStyle = computed(() => {
    const { x, y, width, height } = cropBox.value
    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`
    }
  })

  // --- 初始化与居中 ---
  const centerImage = () => {
    if (!imageElement?.value || !imageWrapper?.value) return

    const wrapper = imageWrapper.value
    const img = imageElement.value

    const containerWidth = wrapper.clientWidth
    const containerHeight = wrapper.clientHeight
    const imageWidth = img.naturalWidth
    const imageHeight = img.naturalHeight

    if (!imageWidth || !imageHeight || !containerWidth || !containerHeight) return

    // 计算基准缩放：图片适配容器，不放大
    const scaleX = containerWidth / imageWidth
    const scaleY = containerHeight / imageHeight
    const initialScale = Math.min(scaleX, scaleY, 1)

    baseScale.value = initialScale

    const s = actualScale.value
    const scaledWidth = imageWidth * s
    const scaledHeight = imageHeight * s
    const x = (containerWidth - scaledWidth) / 2
    const y = (containerHeight - scaledHeight) / 2

    imagePosition.value = { x, y, scale: 1, rotation: 0 }

    // 初始裁剪框：取显示尺寸 60%，再换算为 outputSize（原图像素）
    const cropDisplaySize = Math.min(scaledWidth, scaledHeight) * 0.6
    const initialOutputSize = cropDisplaySize / s

    outputSize.value = {
      width: parseFloat(initialOutputSize.toFixed(1)),
      height: parseFloat(initialOutputSize.toFixed(1))
    }
    syncInputValues()

    const displaySize = cropBoxDisplaySize.value
    cropBox.value = {
      x: parseFloat((x + (scaledWidth - displaySize.width) / 2).toFixed(1)),
      y: parseFloat((y + (scaledHeight - displaySize.height) / 2).toFixed(1)),
      width: parseFloat(displaySize.width.toFixed(1)),
      height: parseFloat(displaySize.height.toFixed(1))
    }
  }

  const onImageLoad = () => {
    if (!imageElement?.value) return
    imageLoaded.value = true
    centerImage()
  }

  // --- 核心：根据 outputSize 更新 cropBox（显示尺寸）---
  const applyCropBoxFromOutputSize = () => {
    if (!imageElement?.value) return

    const s = actualScale.value
    let targetW = cropBoxDisplaySize.value.width
    let targetH = cropBoxDisplaySize.value.height

    const minDisplaySize = 50

    // 最小显示尺寸约束（非输入中才自动修正）
    if (targetW < minDisplaySize && s > 0 && !isInputtingWidth.value) {
      const newW = Math.round((minDisplaySize / s) * 100) / 100
      outputSize.value.width = newW
      widthInputValue.value = newW
      targetW = minDisplaySize
    }
    if (targetH < minDisplaySize && s > 0 && !isInputtingHeight.value) {
      const newH = Math.round((minDisplaySize / s) * 100) / 100
      outputSize.value.height = newH
      heightInputValue.value = newH
      targetH = minDisplaySize
    }

    // 图片边界（显示尺寸）
    const imgLeft = imagePosition.value.x
    const imgTop = imagePosition.value.y
    const imgRight = imgLeft + (imageElement.value.naturalWidth * s)
    const imgBottom = imgTop + (imageElement.value.naturalHeight * s)
    const imgW = imgRight - imgLeft
    const imgH = imgBottom - imgTop

    // 不超过图片显示尺寸（非输入中才自动修正）
    if (targetW > imgW && s > 0 && !isInputtingWidth.value) {
      const newW = Math.round((imgW / s) * 100) / 100
      outputSize.value.width = newW
      widthInputValue.value = newW
      targetW = imgW
    }
    if (targetH > imgH && s > 0 && !isInputtingHeight.value) {
      const newH = Math.round((imgH / s) * 100) / 100
      outputSize.value.height = newH
      heightInputValue.value = newH
      targetH = imgH
    }

    // 尽量保持中心不变
    const centerX = cropBox.value.x + cropBox.value.width / 2
    const centerY = cropBox.value.y + cropBox.value.height / 2

    let newX = centerX - targetW / 2
    let newY = centerY - targetH / 2

    if (targetW <= imgW && targetH <= imgH) {
      if (newX < imgLeft) newX = imgLeft
      if (newY < imgTop) newY = imgTop
      if (newX + targetW > imgRight) newX = imgRight - targetW
      if (newY + targetH > imgBottom) newY = imgBottom - targetH
    } else {
      newX = imgLeft
      newY = imgTop
    }

    cropBox.value.width = parseFloat(targetW.toFixed(1))
    cropBox.value.height = parseFloat(targetH.toFixed(1))
    cropBox.value.x = parseFloat(newX.toFixed(1))
    cropBox.value.y = parseFloat(newY.toFixed(1))
  }

  // --- 预设尺寸与宽高比 ---
  const setCropSize = (size) => {
    outputSize.value =
      typeof size === 'number'
        ? { width: size, height: size }
        : { width: size.width, height: size.height }

    syncInputValues()
    applyCropBoxFromOutputSize()
  }

  const setAspectRatio = (ratio) => {
    aspectRatio.value = ratio

    if (ratio === null) {
      applyCropBoxFromOutputSize()
      return
    }

    const w = outputSize.value.width
    const newH = Math.round((w / ratio) * 100) / 100
    outputSize.value.height = newH
    heightInputValue.value = Math.round(newH)
    applyCropBoxFromOutputSize()
  }

  // --- 输入框：宽 ---
  const handleWidthFocus = () => {
    isInputtingWidth.value = true
    widthInputValue.value = outputSize.value.width
  }
  const handleWidthInput = (e) => {
    const raw = String(e.target?.value ?? '').trim()
    if (raw === '' || raw === '-') return
    const v = parseFloat(raw)
    if (!Number.isFinite(v)) return
    widthInputValue.value = v
  }
  const handleWidthBlur = (e) => {
    isInputtingWidth.value = false
    let v = parseFloat(String(e.target?.value ?? ''))
    if (!Number.isFinite(v) || v <= 0) v = outputSize.value.width

    const w = Math.round((Math.min(4096, Math.max(1, v)) * 100)) / 100
    widthInputValue.value = Math.round(w)
    outputSize.value.width = w

    if (aspectRatio.value !== null) {
      const h = Math.round((w / aspectRatio.value) * 100) / 100
      outputSize.value.height = Math.min(4096, Math.max(1, h))
      heightInputValue.value = Math.round(outputSize.value.height)
    }

    applyCropBoxFromOutputSize()
  }

  // --- 输入框：高 ---
  const handleHeightFocus = () => {
    isInputtingHeight.value = true
    heightInputValue.value = outputSize.value.height
  }
  const handleHeightInput = (e) => {
    const raw = String(e.target?.value ?? '').trim()
    if (raw === '' || raw === '-') return
    const v = parseFloat(raw)
    if (!Number.isFinite(v)) return
    heightInputValue.value = v
  }
  const handleHeightBlur = (e) => {
    isInputtingHeight.value = false
    let v = parseFloat(String(e.target?.value ?? ''))
    if (!Number.isFinite(v) || v <= 0) v = outputSize.value.height

    const h = Math.round((Math.min(4096, Math.max(1, v)) * 100)) / 100
    heightInputValue.value = Math.round(h)
    outputSize.value.height = h

    if (aspectRatio.value !== null) {
      const w = Math.round((h * aspectRatio.value) * 100) / 100
      outputSize.value.width = Math.min(4096, Math.max(1, w))
      widthInputValue.value = Math.round(outputSize.value.width)
    }

    applyCropBoxFromOutputSize()
  }

  // =========================
  // 交互：拖拽/缩放（关键修复点：全局 mousemove/mouseup）
  // =========================
  const isDragging = ref(false)
  const isResizing = ref(false)
  const dragType = ref('') // 'crop' | 'image' | 'se'|'sw'|'ne'|'nw'
  const dragStart = ref({ x: 0, y: 0 })
  const startCropBox = ref({ x: 0, y: 0, width: 0, height: 0 })
  const startImagePos = ref({ x: 0, y: 0, scale: 1, rotation: 0 })

  const lockSelection = () => { document.body.style.userSelect = 'none' }
  const unlockSelection = () => { document.body.style.userSelect = '' }

  const startCropDrag = (event) => {
    // 点到手柄不走这里
    if (event?.target?.classList?.contains?.('crop-handle')) return

    event.preventDefault()
    lockSelection()

    isDragging.value = true
    isResizing.value = false
    dragType.value = 'crop'

    dragStart.value = { x: event.clientX, y: event.clientY }
    startCropBox.value = { ...cropBox.value }
  }

  const startResize = (type, event) => {
    event.preventDefault()
    event.stopPropagation()
    lockSelection()

    isResizing.value = true
    isDragging.value = false
    dragType.value = type

    dragStart.value = { x: event.clientX, y: event.clientY }
    startCropBox.value = { ...cropBox.value }
  }

  const startImageDrag = (event) => {
    if (!enableImageDrag) return
    if (event?.target !== imageElement?.value) return

    event.preventDefault()
    lockSelection()

    isDragging.value = true
    isResizing.value = false
    dragType.value = 'image'

    dragStart.value = { x: event.clientX, y: event.clientY }
    startImagePos.value = { ...imagePosition.value }
  }

  const resizeCropBox = (deltaX, deltaY) => {
    const { x, y, width, height } = startCropBox.value
    const minSize = 50

    const s = actualScale.value
    const imgPos = imagePosition.value
    const imgW = (imageElement?.value?.naturalWidth || 0) * s
    const imgH = (imageElement?.value?.naturalHeight || 0) * s

    const imgLeft = imgPos.x
    const imgTop = imgPos.y
    const imgRight = imgLeft + imgW
    const imgBottom = imgTop + imgH

    const maxWFromPos = Math.min(imgRight - x, imgW)
    const maxHFromPos = Math.min(imgBottom - y, imgH)

    switch (dragType.value) {
      case 'se': {
        const newW = Math.max(minSize, Math.min(width + deltaX, maxWFromPos, imgW))
        const newH = Math.max(minSize, Math.min(height + deltaY, maxHFromPos, imgH))
        cropBox.value.width = Math.min(newW, imgRight - x)
        cropBox.value.height = Math.min(newH, imgBottom - y)
        break
      }
      case 'sw': {
        const newX = Math.max(imgLeft, Math.min(x + deltaX, x + width - minSize))
        const newW = Math.max(minSize, Math.min(width - (newX - x), imgW))
        const newH = Math.max(minSize, Math.min(height + deltaY, maxHFromPos, imgH))
        cropBox.value.x = newX
        cropBox.value.width = newW
        cropBox.value.height = Math.min(newH, imgBottom - y)
        break
      }
      case 'ne': {
        const newW = Math.max(minSize, Math.min(width + deltaX, maxWFromPos, imgW))
        const newY = Math.max(imgTop, Math.min(y + deltaY, y + height - minSize))
        const newH = Math.max(minSize, Math.min(height - (newY - y), imgH))
        cropBox.value.width = Math.min(newW, imgRight - x)
        cropBox.value.y = newY
        cropBox.value.height = newH
        break
      }
      case 'nw': {
        const newX = Math.max(imgLeft, Math.min(x + deltaX, x + width - minSize))
        const newY = Math.max(imgTop, Math.min(y + deltaY, y + height - minSize))
        const newW = Math.max(minSize, Math.min(width - (newX - x), imgW))
        const newH = Math.max(minSize, Math.min(height - (newY - y), imgH))
        cropBox.value.x = newX
        cropBox.value.y = newY
        cropBox.value.width = newW
        cropBox.value.height = newH
        break
      }
    }

    // 同步 outputSize（原图像素）
    if (s > 0) {
      outputSize.value.width = parseFloat((cropBox.value.width / s).toFixed(1))
      outputSize.value.height = parseFloat((cropBox.value.height / s).toFixed(1))
      syncInputValues()
    }
  }

  const handleMouseMove = (event) => {
    if (!isDragging.value && !isResizing.value) return

    const deltaX = event.clientX - dragStart.value.x
    const deltaY = event.clientY - dragStart.value.y

    if (isResizing.value) {
      resizeCropBox(deltaX, deltaY)
      return
    }

    if (isDragging.value && dragType.value === 'crop') {
      const s = actualScale.value
      const imgPos = imagePosition.value
      const imgW = (imageElement?.value?.naturalWidth || 0) * s
      const imgH = (imageElement?.value?.naturalHeight || 0) * s

      const imgLeft = imgPos.x
      const imgTop = imgPos.y
      const imgRight = imgLeft + imgW
      const imgBottom = imgTop + imgH

      const newX = Math.max(imgLeft, Math.min(startCropBox.value.x + deltaX, imgRight - cropBox.value.width))
      const newY = Math.max(imgTop, Math.min(startCropBox.value.y + deltaY, imgBottom - cropBox.value.height))

      cropBox.value.x = newX
      cropBox.value.y = newY
      return
    }

    if (enableImageDrag && isDragging.value && dragType.value === 'image') {
      imagePosition.value.x = startImagePos.value.x + deltaX
      imagePosition.value.y = startImagePos.value.y + deltaY
    }
  }

  const handleMouseUp = () => {
    if (!isDragging.value && !isResizing.value) return
    isDragging.value = false
    isResizing.value = false
    dragType.value = ''
    unlockSelection()
  }

  const bindGlobalMouse = () => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseup', handleMouseUp, { passive: true })
    window.addEventListener('mouseleave', handleMouseUp, { passive: true })
  }

  const unbindGlobalMouse = () => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
    window.removeEventListener('mouseleave', handleMouseUp)
  }

  onMounted(() => bindGlobalMouse())
  onUnmounted(() => {
    unbindGlobalMouse()
    unlockSelection()
  })

  const resetImage = () => centerImage()

  return {
    // refs
    imageLoaded,
    imagePosition,
    baseScale,
    actualScale,
    cropBox,
    outputSize,
    customSize,
    aspectRatio,

    // computed styles
    imageStyle,
    cropBoxStyle,
    cropBoxDisplaySize,

    // init
    onImageLoad,
    centerImage,
    resetImage,

    // core geometry
    applyCropBoxFromOutputSize,
    setCropSize,
    setAspectRatio,

    // inputs
    widthInputValue,
    heightInputValue,
    handleWidthFocus,
    handleWidthInput,
    handleWidthBlur,
    handleHeightFocus,
    handleHeightInput,
    handleHeightBlur,

    // interactions
    isDragging,
    isResizing,
    startCropDrag,
    startResize,
    startImageDrag
  }
}
