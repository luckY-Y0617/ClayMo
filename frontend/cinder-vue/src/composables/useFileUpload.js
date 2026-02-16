import { ref } from 'vue'
import { fileApi } from '@/api/file.api'

/**
 * 通用文件上传管理（支持图片、附件等所有文件类型）
 *
 * 上传流程：
 * 1. createSession: 创建上传会话 -> { sessionId, uploadUrl, headers, mode, ... }
 * 2. PUT 到 uploadUrl 上传文件（使用返回的 headers）
 * 3. completeSession: 完成上传 -> { sessionId, status, message }
 * 4. finalizeSession: 最终确认 -> { fileId, status, fileType, fileSize, message }
 * 5. 构造 /files/:fileId/urls 作为文件访问URL
 */
export function useFileUpload(options = {}) {
  const {
    maxSize = 10,                // MB（本地限制用）
    simpleThresholdMB = 5,       // 小文件阈值（MB）
    allowedMimePrefix = null     // 默认允许所有文件类型（可传入 'image/' 仅限图片）
  } = options

  const isUploading = ref(false)
  const uploadProgress = ref(0)

  /**
   * 计算文件的 SHA-256 哈希值
   */
  const calculateFileHash = async (file) => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 生成幂等键（使用随机 UUID）
   */
  const generateIdempotencyKey = () => {
    return crypto.randomUUID()
  }

  /**
   * 上传文件
   * @param {File} file
   * @param {string} resourceId - 资源ID（可选，用于业务关联）
   * @returns {Promise<string>} fileUrl - 文件访问URL
   */
  const uploadFile = async (file, resourceId) => {
    if (!file) throw new Error('文件不能为空')

    // 类型校验（仅用于前端早期失败）
    if (allowedMimePrefix && !String(file.type || '').startsWith(allowedMimePrefix)) {
      throw new Error(`请选择有效的文件类型（${allowedMimePrefix}*）`)
    }

    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      throw new Error(`文件大小不能超过 ${maxSize}MB`)
    }

    try {
      isUploading.value = true
      uploadProgress.value = 0

      const thresholdBytes = simpleThresholdMB * 1024 * 1024
      if (file.size <= thresholdBytes) {
        return await singleUpload(file)
      }

      return await multipartUpload(file)
    } catch (err) {
      console.error('文件上传失败:', err)
      throw err
    } finally {
      isUploading.value = false
      uploadProgress.value = 0
    }
  }

  /**
   * 根据文件大小选择合适的分片大小
   */
  function choosePreferredChunkSize(fileSize) {
    const MB = 1024 * 1024
    const GB = 1024 * MB

    if (fileSize <= 256 * MB) return 8 * MB
    if (fileSize <= 2 * GB) return 16 * MB
    if (fileSize <= 10 * GB) return 32 * MB
    return 64 * MB
  }

  /**
   * 单文件上传（小文件）
   * 流程: createSession -> PUT -> completeSession -> finalizeSession -> 构造URL
   */
  const singleUpload = async (file) => {
    uploadProgress.value = 5

    // 1. 计算文件哈希
    const fileHash = await calculateFileHash(file)
    uploadProgress.value = 10

    // 2. 创建上传会话
    const sessionResponse = await fileApi.upload.createSession({
      idempotencyKey: generateIdempotencyKey(),
      fileName: file.name,
      fileSize: file.size,
      bizType: 'document',
      fileType: file.type,
      fileHash: fileHash,
      mode: 'auto', // 让后端自动判断
      preferredChunkSize: choosePreferredChunkSize(file.size)
    })

    console.log('createSession response:', sessionResponse)

    const { sessionId, uploadUrl, headers, status, fileId, hitType } = sessionResponse
    uploadProgress.value = 20

    // 如果是秒删命中（dedup），文件已存在且可用，直接返回
    if (hitType === 'dedup' && status === 'Available' && fileId) {
      console.log('文件已存在（秒删命中），直接使用 fileId')
      uploadProgress.value = 100
      return fileApi.upload.getFileUrl(fileId)
    }

    // 如果状态已经是 Completed，说明之前已上传过（幂等命中且已完成）
    if (status === 'Completed') {
      console.log('文件已完成上传，执行 finalize')
      if (!sessionId) {
        throw new Error('创建上传会话失败：未返回 sessionId')
      }
      const finalizeResponse = await fileApi.upload.finalizeSession(sessionId)
      uploadProgress.value = 100
      return fileApi.upload.getFileUrl(finalizeResponse.fileId)
    }

    if (!sessionId) {
      throw new Error('创建上传会话失败：未返回 sessionId')
    }

    if (!uploadUrl) {
      throw new Error('创建上传会话失败：未返回 uploadUrl')
    }

    console.log('uploadUrl headers:', headers)

    // 3. 上传文件到预签名URL
    const putResp = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: headers || { 'Content-Type': 'application/octet-stream' }
    })

    if (!putResp.ok) {
      throw new Error(`上传失败: ${putResp.status} ${putResp.statusText}`)
    }

    console.log('文件上传成功')
    uploadProgress.value = 70

    // 4. 完成上传
    const completeResponse = await fileApi.upload.completeSession(sessionId, {
      parts: []
    })

    console.log('completeSession response:', completeResponse)
    uploadProgress.value = 85

    // 5. 最终确认，获取 fileId
    const finalizeResponse = await fileApi.upload.finalizeSession(sessionId)

    console.log('finalizeSession response:', finalizeResponse)

    if (!finalizeResponse.fileId) {
      throw new Error('最终确认失败：未返回 fileId')
    }

    uploadProgress.value = 100

    // 6. 构造文件访问URL
    return fileApi.upload.getFileUrl(finalizeResponse.fileId)
  }

  /**
   * 分片上传（大文件）
   * 流程: createSession(multipart) -> 分片上传 -> completeSession -> finalizeSession -> 构造URL
   */
  const multipartUpload = async (file) => {
    uploadProgress.value = 5

    // 1. 计算文件哈希
    const fileHash = await calculateFileHash(file)
    uploadProgress.value = 10

    // 2. 创建上传会话（multipart模式）
    const sessionResponse = await fileApi.upload.createSession({
      idempotencyKey: generateIdempotencyKey(),
      fileName: file.name,
      fileSize: file.size,
      bizType: 'document',
      fileType: file.type,
      fileHash: fileHash,
      mode: 'multipart',
      preferredChunkSize: choosePreferredChunkSize(file.size)
    })

    console.log('createSession (multipart) response:', sessionResponse)

    const { sessionId, uploadUrl, headers, status, chunkSize: serverChunkSize, fileId, hitType } = sessionResponse
    uploadProgress.value = 15

    // 如果是秒删命中（dedup），文件已存在且可用，直接返回
    if (hitType === 'dedup' && status === 'Available' && fileId) {
      console.log('文件已存在（秒删命中），直接使用 fileId')
      uploadProgress.value = 100
      return fileApi.upload.getFileUrl(fileId)
    }

    // 如果状态已经是 Completed，说明之前已上传过
    if (status === 'Completed') {
      console.log('文件已完成上传，执行 finalize')
      if (!sessionId) {
        throw new Error('创建上传会话失败：未返回 sessionId')
      }
      const finalizeResponse = await fileApi.upload.finalizeSession(sessionId)
      uploadProgress.value = 100
      return fileApi.upload.getFileUrl(finalizeResponse.fileId)
    }

    if (!sessionId) {
      throw new Error('创建上传会话失败：未返回 sessionId')
    }

    if (!uploadUrl) {
      throw new Error('创建上传会话失败：未返回 uploadUrl')
    }

    const chunkSize = serverChunkSize || choosePreferredChunkSize(file.size)
    uploadProgress.value = 20

    // 3. 切片
    const chunks = []
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      chunks.push(file.slice(offset, Math.min(offset + chunkSize, file.size)))
    }

    const parts = []

    // 4. 分片上传
    for (let i = 0; i < chunks.length; i++) {
      const partNumber = i + 1
      const chunk = chunks[i]

      // 构建分片上传URL
      let partUploadUrl = uploadUrl
      if (uploadUrl.includes('?')) {
        partUploadUrl = `${uploadUrl}&partNumber=${partNumber}`
      } else {
        partUploadUrl = `${uploadUrl}?partNumber=${partNumber}`
      }

      const putResp = await fetch(partUploadUrl, {
        method: 'PUT',
        body: chunk,
        headers: headers || { 'Content-Type': 'application/octet-stream' }
      })

      if (!putResp.ok) {
        throw new Error(`分片 ${partNumber} 上传失败: ${putResp.status}`)
      }

      // 获取 ETag（用于完成上传时验证）
      const etag =
        putResp.headers.get('etag') ||
        putResp.headers.get('ETag') ||
        putResp.headers.get('Etag') ||
        ''

      parts.push({
        partNumber,
        etag
      })

      // 更新进度：20% 到 75%
      uploadProgress.value = 20 + Math.floor(((i + 1) / chunks.length) * 55)
    }

    uploadProgress.value = 80

    // 5. 完成上传
    const completeResponse = await fileApi.upload.completeSession(sessionId, {
      parts: parts
    })

    console.log('completeSession (multipart) response:', completeResponse)
    uploadProgress.value = 90

    // 6. 最终确认，获取 fileId
    const finalizeResponse = await fileApi.upload.finalizeSession(sessionId)

    console.log('finalizeSession (multipart) response:', finalizeResponse)

    if (!finalizeResponse.fileId) {
      throw new Error('最终确认失败：未返回 fileId')
    }

    uploadProgress.value = 100

    // 7. 构造文件访问URL
    return fileApi.upload.getFileUrl(finalizeResponse.fileId)
  }

  return {
    isUploading,
    uploadProgress,
    uploadFile,
    calculateFileHash
  }
}

