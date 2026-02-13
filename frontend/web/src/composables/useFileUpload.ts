import { ref, type Ref } from 'vue'
import { fileApi } from '@/api/modules/file'

// ========================================
// 类型定义
// ========================================

/**
 * 文件上传配置选项
 */
interface FileUploadOptions {
  /** 最大文件大小（MB），默认 10MB */
  maxSize?: number
  /** 小文件阈值（MB），小于此值使用单文件上传，默认 5MB */
  simpleThresholdMB?: number
  /** 允许的 MIME 类型前缀，如 'image/' 仅限图片，null 表示允许所有类型 */
  allowedMimePrefix?: string | null
}

/**
 * 上传会话创建响应
 */
interface CreateSessionResponse {
  sessionId: string
  mode: 'single' | 'multipart'
  uploadUrl: string
  headers?: Record<string, string>
  status?: string
  fileId?: string
  hitType?: 'dedup' | 'idempotency' | null
  chunkSize?: number
}

/**
 * 完成上传响应
 */
interface CompleteSessionResponse {
  sessionId: string
  status: string
  message?: string
}

/**
 * 最终确认响应
 */
interface FinalizeSessionResponse {
  fileId: string
  status: string
  fileType?: string
  fileSize?: number
  message?: string
}

/**
 * 分片信息
 */
interface PartInfo {
  partNumber: number
  etag: string
}

// ========================================
// Composable
// ========================================

/**
 * 通用文件上传管理（支持图片、附件等所有文件类型）
 *
 * 上传流程：
 * 1. createSession: 创建上传会话 -> { sessionId, uploadUrl, headers, mode, ... }
 * 2. PUT 到 uploadUrl 上传文件（使用返回的 headers）
 * 3. completeSession: 完成上传 -> { sessionId, status, message }
 * 4. finalizeSession: 最终确认 -> { fileId, status, fileType, fileSize, message }
 * 5. 构造 /fs/files/:fileId/content 作为文件访问URL
 *
 * @param options - 上传配置选项
 */
export function useFileUpload(options: FileUploadOptions = {}) {
  const {
    maxSize = 10,
    simpleThresholdMB = 5,
    allowedMimePrefix = null,
  } = options

  const isUploading = ref(false)
  const uploadProgress = ref(0)

  // ========================================
  // 工具函数
  // ========================================

  /**
   * 计算文件的 SHA-256 哈希值
   */
  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 生成幂等键（使用随机 UUID）
   */
  const generateIdempotencyKey = (): string => {
    return crypto.randomUUID()
  }

  /**
   * 根据文件大小选择合适的分片大小
   */
  function choosePreferredChunkSize(fileSize: number): number {
    const MB = 1024 * 1024
    const GB = 1024 * MB

    if (fileSize <= 256 * MB) return 8 * MB
    if (fileSize <= 2 * GB) return 16 * MB
    if (fileSize <= 10 * GB) return 32 * MB
    return 64 * MB
  }

  // ========================================
  // 上传主逻辑
  // ========================================

  /**
   * 上传文件
   * @param file - 要上传的文件
   * @param resourceId - 资源ID（可选，用于业务关联）
   * @returns 文件访问URL
   */
  const uploadFile = async (file: File, resourceId?: string): Promise<string> => {
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

  // ========================================
  // 单文件上传（小文件）
  // ========================================

  /**
   * 单文件上传（小文件）
   * 流程: createSession -> PUT -> completeSession -> finalizeSession -> 构造URL
   */
  const singleUpload = async (file: File): Promise<string> => {
    uploadProgress.value = 5

    // 1. 计算文件哈希
    const fileHash = await calculateFileHash(file)
    uploadProgress.value = 10

    // 2. 创建上传会话
    const sessionResponse = await fileApi.createSession({
      idempotencyKey: generateIdempotencyKey(),
      fileName: file.name,
      fileSize: file.size,
      bizType: 'document',
      fileType: file.type,
      fileHash: fileHash,
      mode: 'auto', // 让后端自动判断
      preferredChunkSize: choosePreferredChunkSize(file.size),
    })

    console.log('createSession response:', sessionResponse)

    const { sessionId, uploadUrl, headers, status, fileId, hitType } = sessionResponse
    uploadProgress.value = 20

    // 如果是秒传命中（dedup），文件已存在且可用，直接返回
    if (hitType === 'dedup' && status === 'Available' && fileId) {
      console.log('文件已存在（秒传命中），直接使用 fileId')
      uploadProgress.value = 100
      return fileApi.getFileUrl(fileId)
    }

    // 如果状态已经是 Completed，说明之前已上传过（幂等命中且已完成）
    if (status === 'Completed') {
      console.log('文件已完成上传，执行 finalize')
      if (!sessionId) {
        throw new Error('创建上传会话失败：未返回 sessionId')
      }
      const finalizeResponse = await fileApi.finalizeSession(sessionId)
      uploadProgress.value = 100
      return fileApi.getFileUrl(finalizeResponse.fileId)
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
      headers: headers || { 'Content-Type': 'application/octet-stream' },
    })

    if (!putResp.ok) {
      throw new Error(`上传失败: ${putResp.status} ${putResp.statusText}`)
    }

    console.log('文件上传成功')
    uploadProgress.value = 70

    // 4. 完成上传
    const completeResponse = await fileApi.completeSession(sessionId, {
      parts: [],
    })

    console.log('completeSession response:', completeResponse)
    uploadProgress.value = 85

    // 5. 最终确认，获取 fileId
    const finalizeResponse = await fileApi.finalizeSession(sessionId)

    console.log('finalizeSession response:', finalizeResponse)

    if (!finalizeResponse.fileId) {
      throw new Error('最终确认失败：未返回 fileId')
    }

    uploadProgress.value = 100

    // 6. 构造文件访问URL
    return fileApi.getFileUrl(finalizeResponse.fileId)
  }

  // ========================================
  // 分片上传（大文件）
  // ========================================

  /**
   * 分片上传（大文件）
   * 流程: createSession(multipart) -> 分片上传 -> completeSession -> finalizeSession -> 构造URL
   */
  const multipartUpload = async (file: File): Promise<string> => {
    uploadProgress.value = 5

    // 1. 计算文件哈希
    const fileHash = await calculateFileHash(file)
    uploadProgress.value = 10

    // 2. 创建上传会话（multipart模式）
    const sessionResponse = await fileApi.createSession({
      idempotencyKey: generateIdempotencyKey(),
      fileName: file.name,
      fileSize: file.size,
      bizType: 'document',
      fileType: file.type,
      fileHash: fileHash,
      mode: 'multipart',
      preferredChunkSize: choosePreferredChunkSize(file.size),
    })

    console.log('createSession (multipart) response:', sessionResponse)

    const {
      sessionId,
      uploadUrl,
      headers,
      status,
      chunkSize: serverChunkSize,
      fileId,
      hitType,
    } = sessionResponse
    uploadProgress.value = 15

    // 如果是秒传命中（dedup），文件已存在且可用，直接返回
    if (hitType === 'dedup' && status === 'Available' && fileId) {
      console.log('文件已存在（秒传命中），直接使用 fileId')
      uploadProgress.value = 100
      return fileApi.getFileUrl(fileId)
    }

    // 如果状态已经是 Completed，说明之前已上传过
    if (status === 'Completed') {
      console.log('文件已完成上传，执行 finalize')
      if (!sessionId) {
        throw new Error('创建上传会话失败：未返回 sessionId')
      }
      const finalizeResponse = await fileApi.finalizeSession(sessionId)
      uploadProgress.value = 100
      return fileApi.getFileUrl(finalizeResponse.fileId)
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
    const chunks: Blob[] = []
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      chunks.push(file.slice(offset, Math.min(offset + chunkSize, file.size)))
    }

    const parts: PartInfo[] = []

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
        headers: headers || { 'Content-Type': 'application/octet-stream' },
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
        etag,
      })

      // 更新进度：20% 到 75%
      uploadProgress.value = 20 + Math.floor(((i + 1) / chunks.length) * 55)
    }

    uploadProgress.value = 80

    // 5. 完成上传
    const completeResponse = await fileApi.completeSession(sessionId, {
      parts: parts,
    })

    console.log('completeSession (multipart) response:', completeResponse)
    uploadProgress.value = 90

    // 6. 最终确认，获取 fileId
    const finalizeResponse = await fileApi.finalizeSession(sessionId)

    console.log('finalizeSession (multipart) response:', finalizeResponse)

    if (!finalizeResponse.fileId) {
      throw new Error('最终确认失败：未返回 fileId')
    }

    uploadProgress.value = 100

    // 7. 构造文件访问URL
    return fileApi.getFileUrl(finalizeResponse.fileId)
  }

  return {
    isUploading,
    uploadProgress,
    uploadFile,
    calculateFileHash,
  }
}

// ========================================
// 便捷别名
// ========================================

/**
 * 图片上传（useFileUpload 的便捷别名）
 * @deprecated 使用 useFileUpload({ allowedMimePrefix: 'image/' }) 替代
 */
export function useImageUpload(options: Omit<FileUploadOptions, 'allowedMimePrefix'> = {}) {
  return useFileUpload({
    ...options,
    allowedMimePrefix: 'image/',
  })
}

