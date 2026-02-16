import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

/**
 * 画布视口：让画布区域在容器内完整显示，并计算显示尺寸与缩放比例
 * 依赖：canvasWidth/canvasHeight（画布"实际像素"）
 */
export function useMontageViewport(options = {}) {
  const { canvasContainer, canvasWidth, canvasHeight } = options

  const containerHeight = ref(600)
  let resizeObserver = null

  const updateContainerSize = () => {
    const container = canvasContainer?.value
    if (!container) return

    const rect = container.getBoundingClientRect()
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight

    const bottomGap = 32
    const availableHeight = Math.max(viewportHeight - rect.top - bottomGap, 420)
    containerHeight.value = availableHeight
  }

  const canvasShellStyle = computed(() => ({
    height: `${containerHeight.value}px`,
  }))

  // 计算显示尺寸：高度固定为容器高度（留出边距），宽度按画布比例缩放
  const displaySize = computed(() => {
    const PADDING = 48 // 上下留出总共 48px 的边距
    const displayHeight = Math.max(Math.floor((containerHeight.value || 600) - PADDING), 200)
    const ar = canvasWidth.value / canvasHeight.value
    const displayWidth = Math.floor(displayHeight * ar)

    return { width: displayWidth, height: displayHeight }
  })

  const canvasAreaStyle = computed(() => {
    const { width, height } = displaySize.value

    return {
      width: `${width}px`,
      height: `${height}px`,
    }
  })

  // 缩放比例：显示尺寸 / 画布实际尺寸（x 和 y 相同，保持等比例）
  const canvasScale = computed(() => {
    const { width, height } = displaySize.value
    const scale = height / canvasHeight.value

    return {
      x: scale,
      y: scale,
    }
  })

  const mountViewport = async () => {
    await nextTick()
    updateContainerSize()

    if (canvasContainer?.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => updateContainerSize())
      resizeObserver.observe(canvasContainer.value)
    }

    window.addEventListener('resize', updateContainerSize)
  }

  const unmountViewport = () => {
    window.removeEventListener('resize', updateContainerSize)

    if (resizeObserver && canvasContainer?.value) {
      resizeObserver.unobserve(canvasContainer.value)
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }

  onMounted(mountViewport)
  onUnmounted(unmountViewport)

  return {
    containerHeight,
    canvasShellStyle,
    canvasAreaStyle,
    canvasScale,
    updateContainerSize,
  }
}
