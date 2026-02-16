/**
 * 纯导出：根据当前裁剪框，从原图裁剪并导出 DataURL
 * 注意：不处理保存目录/下载，交给 useDirectorySave
 */
export function useCanvasExport() {
  const exportCroppedImage = (params) => {
    const {
      imageElement,
      imagePosition,
      cropBox,
      actualScale,
      outputSize,
      mimeType = 'image/png',
      quality
    } = params || {}

    if (!imageElement) return ''

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    // 画布输出尺寸 = outputSize（原图像素）
    canvas.width = Number(outputSize?.width || 0)
    canvas.height = Number(outputSize?.height || 0)
    if (canvas.width <= 0 || canvas.height <= 0) return ''

    const img = imageElement
    const imgX = Number(imagePosition?.x || 0)
    const imgY = Number(imagePosition?.y || 0)

    const cropX = Number(cropBox?.x || 0)
    const cropY = Number(cropBox?.y || 0)
    const cropW = Number(cropBox?.width || 0)
    const cropH = Number(cropBox?.height || 0)

    const s = Number(actualScale || 1)
    if (s <= 0) return ''

    // 裁剪区域（原图坐标）
    const sourceX = (cropX - imgX) / s
    const sourceY = (cropY - imgY) / s
    const sourceW = cropW / s
    const sourceH = cropH / s

    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height)

    // toDataURL：png 忽略 quality；jpeg/webp 可用
    return canvas.toDataURL(mimeType, quality)
  }

  return { exportCroppedImage }
}
