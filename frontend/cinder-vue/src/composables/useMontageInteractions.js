import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 画布交互：拖拽、缩放、点击处理、快捷键
 */
export function useMontageInteractions(state, options = {}) {
  const { canvasScale } = options

  const isDragging = ref(false)
  const isResizing = ref(false)
  const dragItemIndex = ref(-1)
  const resizeDirection = ref('')
  const dragStart = ref({ x: 0, y: 0 })
  const startItemData = ref({ x: 0, y: 0, width: 0, height: 0 })
  const hasDragged = ref(false)
  const mouseDownPos = ref({ x: 0, y: 0 })

  const isHandleActive = (index, direction) => {
    return isResizing.value && dragItemIndex.value === index && resizeDirection.value === direction
  }

  const handleCanvasAreaMouseDown = (event) => {
    const target = event.target
    if (!target) return
    if (
      target.classList?.contains?.('canvas-wrapper') ||
      target.classList?.contains?.('canvas-bg') ||
      target.tagName === 'CANVAS'
    ) {
      mouseDownPos.value = { x: event.clientX, y: event.clientY }
      hasDragged.value = false
    }
  }

  const handleCanvasAreaClick = (event) => {
    if (hasDragged.value) {
      hasDragged.value = false
      return
    }

    const dx = event.clientX - mouseDownPos.value.x
    const dy = event.clientY - mouseDownPos.value.y
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      hasDragged.value = false
      return
    }

    const target = event.target
    if (
      target.classList?.contains?.('canvas-wrapper') ||
      target.classList?.contains?.('canvas-bg') ||
      target.tagName === 'CANVAS'
    ) {
      state.selectedCanvasItemIndex.value = -1
      state.selectedImageIndex.value = -1
    }
    hasDragged.value = false
  }

  const handleCanvasItemClick = (index, event) => {
    event.stopPropagation()
    if (hasDragged.value) {
      hasDragged.value = false
      return
    }
    state.selectedCanvasItemIndex.value = index
    state.selectedImageIndex.value = -1
    hasDragged.value = false
  }

  const startItemDrag = (index, event) => {
    event.stopPropagation()
    isDragging.value = true
    isResizing.value = false
    dragItemIndex.value = index
    dragStart.value = { x: event.clientX, y: event.clientY }
    mouseDownPos.value = { x: event.clientX, y: event.clientY }
    hasDragged.value = false
    state.selectedCanvasItemIndex.value = index
    state.selectedImageIndex.value = -1
  }

  const startResize = (index, direction, event) => {
    event.preventDefault()
    event.stopPropagation()
    isResizing.value = true
    isDragging.value = false
    dragItemIndex.value = index
    resizeDirection.value = direction
    dragStart.value = { x: event.clientX, y: event.clientY }
    mouseDownPos.value = { x: event.clientX, y: event.clientY }
    startItemData.value = { ...state.canvasItems.value[index] }
    hasDragged.value = false
    state.selectedCanvasItemIndex.value = index
  }

  const handleResize = (deltaX, deltaY) => {
    if (!resizeDirection.value) return
    const idx = dragItemIndex.value
    if (idx < 0) return

    const item = state.canvasItems.value[idx]
    if (!item) return

    const { x, y, width, height } = startItemData.value
    const minSize = 50
    const ar = item.image.width / item.image.height
    const scale = canvasScale?.value || { x: 1, y: 1 }
    const scaledDeltaX = deltaX / scale.x
    const scaledDeltaY = deltaY / scale.y

    switch (resizeDirection.value) {
      case 'se': {
        const newW = Math.max(minSize, width + scaledDeltaX)
        const newH = newW / ar
        item.width = Math.min(newW, state.canvasWidth.value - item.x)
        item.height = Math.min(newH, state.canvasHeight.value - item.y)
        if (item.height === state.canvasHeight.value - item.y && item.height < newH) {
          item.width = item.height * ar
        }
        break
      }
      case 'sw': {
        const newW = Math.max(minSize, width - scaledDeltaX)
        const newH = newW / ar
        const deltaW = newW - width
        item.width = Math.min(newW, item.x + width)
        item.height = Math.min(newH, state.canvasHeight.value - item.y)
        if (item.height === state.canvasHeight.value - item.y && item.height < newH) {
          item.width = item.height * ar
        }
        item.x = Math.max(0, x - deltaW)
        if (item.x === 0 && x - deltaW < 0) {
          item.width = Math.min(newW, x + width)
          item.height = item.width / ar
        }
        break
      }
      case 'ne': {
        const newW = Math.max(minSize, width + scaledDeltaX)
        const newH = newW / ar
        const deltaH = newH - height
        item.width = Math.min(newW, state.canvasWidth.value - item.x)
        item.height = Math.min(newH, item.y + height)
        if (item.width === state.canvasWidth.value - item.x && item.width < newW) {
          item.height = item.width / ar
        }
        item.y = Math.max(0, y - deltaH)
        if (item.y === 0 && y - deltaH < 0) {
          item.height = Math.min(newH, y + height)
          item.width = item.height * ar
        }
        break
      }
      case 'nw': {
        const newW = Math.max(minSize, width - scaledDeltaX)
        const newH = newW / ar
        const deltaW = newW - width
        const deltaH = newH - height
        item.width = Math.min(newW, item.x + width)
        item.height = Math.min(newH, item.y + height)
        if (item.width === item.x + width && item.width < newW) {
          item.height = item.width / ar
        } else if (item.height === item.y + height && item.height < newH) {
          item.width = item.height * ar
        }
        item.x = Math.max(0, x - deltaW)
        item.y = Math.max(0, y - deltaH)
        if (item.x === 0 && x - deltaW < 0) {
          item.width = Math.min(newW, x + width)
          item.height = item.width / ar
          item.y = Math.max(0, y - (item.height - height))
        }
        if (item.y === 0 && y - deltaH < 0) {
          item.height = Math.min(newH, y + height)
          item.width = item.height * ar
          item.x = Math.max(0, x - (item.width - width))
        }
        break
      }
    }

    // 最小尺寸兜底
    if (item.width < minSize) {
      item.width = minSize
      item.height = item.width / ar
    }
    if (item.height < minSize) {
      item.height = minSize
      item.width = item.height * ar
    }

    state.clampToCanvasBounds(item)
    state.updateSelectedItem()
  }

  const handleMouseMove = (event) => {
    const idx = dragItemIndex.value
    if (idx === -1) return

    const deltaX = event.clientX - dragStart.value.x
    const deltaY = event.clientY - dragStart.value.y
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (isResizing.value) {
      if (dist > 2) hasDragged.value = true
      handleResize(deltaX, deltaY)
      return
    }

    if (isDragging.value) {
      if (dist <= 3) return
      hasDragged.value = true
      const item = state.canvasItems.value[idx]
      if (!item) return

      const scale = canvasScale?.value || { x: 1, y: 1 }
      item.x = item.x + deltaX / scale.x
      item.y = item.y + deltaY / scale.y

      state.clampToCanvasBounds(item)
      state.canvasItems.value[idx] = { ...item }
      dragStart.value = { x: event.clientX, y: event.clientY }
    }
  }

  const handleMouseUp = () => {
    const wasDragging = hasDragged.value
    isDragging.value = false
    isResizing.value = false
    dragItemIndex.value = -1
    resizeDirection.value = ''
    if (wasDragging) {
      setTimeout(() => (hasDragged.value = false), 150)
    } else {
      hasDragged.value = false
    }
  }

  const handleKeyDown = (event) => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedCanvasItemIndex.value !== -1) {
      event.preventDefault()
      state.removeCanvasItem(state.selectedCanvasItemIndex.value)
    }
  }

  onMounted(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('keydown', handleKeyDown)
  })

  return {
    isDragging,
    isResizing,
    dragItemIndex,
    isHandleActive,
    handleCanvasAreaMouseDown,
    handleCanvasAreaClick,
    handleCanvasItemClick,
    startItemDrag,
    startResize,
  }
}
