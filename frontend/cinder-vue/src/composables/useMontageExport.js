/**
 * 导出：把 canvasItems 渲染到离屏 canvas，再下载 png
 */
export function useMontageExport(state) {
    const exportImage = async () => {
      if (!state.canvasItems.value.length) return
  
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = state.canvasWidth.value
      exportCanvas.height = state.canvasHeight.value
  
      const ctx = exportCanvas.getContext('2d')
      if (!ctx) return
  
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
  
      // 背景
      ctx.clearRect(0, 0, state.canvasWidth.value, state.canvasHeight.value)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, state.canvasWidth.value, state.canvasHeight.value)
  
      // 导出前双保险 clamp
      state.canvasItems.value.forEach((item) => state.clampToCanvasBounds(item))
  
      // 逐个绘制（按 zIndex 排序更稳）
      const sorted = [...state.canvasItems.value].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
  
      const tasks = sorted.map((item) => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
  
          img.onload = () => {
            try {
              ctx.save()
              ctx.globalAlpha = item.opacity ?? 1
  
              // 最终强制保证不越界
              let x = Math.max(0, item.x)
              let y = Math.max(0, item.y)
  
              if (x + item.width > state.canvasWidth.value) x = Math.max(0, state.canvasWidth.value - item.width)
              if (y + item.height > state.canvasHeight.value) y = Math.max(0, state.canvasHeight.value - item.height)
  
              const w = Math.min(item.width, state.canvasWidth.value - x)
              const h = Math.min(item.height, state.canvasHeight.value - y)
  
              ctx.translate(x + w / 2, y + h / 2)
              ctx.rotate(((item.rotation ?? 0) * Math.PI) / 180)
  
              ctx.drawImage(img, -w / 2, -h / 2, w, h)
              ctx.restore()
  
              resolve()
            } catch (e) {
              reject(e)
            }
          }
  
          img.onerror = () => reject(new Error('图片加载失败'))
          img.src = item.image.url
        })
      })
  
      try {
        await Promise.all(tasks)
        const link = document.createElement('a')
        link.download = `montage-${Date.now()}.png`
        link.href = exportCanvas.toDataURL('image/png', 1.0)
        link.click()
      } catch (e) {
        console.error('导出失败:', e)
        alert('导出失败，请重试')
      }
    }
  
    return { exportImage }
  }
  