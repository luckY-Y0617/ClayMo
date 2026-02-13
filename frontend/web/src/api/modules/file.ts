import http from '@/utils/http'

// ========================================
// 类型定义
// ========================================

/**
 * 创建上传会话请求参数
 */
export interface CreateSessionRequest {
  /** 幂等键（可用 fileHash 或 UUID） */
  idempotencyKey: string
  /** 文件名 */
  fileName: string
  /** 文件大小（字节） */
  fileSize: number
  /** 业务类型，如 'document' */
  bizType: string
  /** 文件 MIME 类型 */
  fileType: string
  /** 文件哈希值 */
  fileHash: string
  /** 上传模式: 'auto' | 'single' | 'multipart' */
  mode: 'auto' | 'single' | 'multipart'
  /** 首选分片大小（可选，字节） */
  preferredChunkSize?: number
}

/**
 * 创建上传会话响应
 */
export interface CreateSessionResponse {
  /** 会话ID */
  sessionId: string
  /** 上传模式 */
  mode: 'single' | 'multipart'
  /** 对象键 */
  objectKey?: string
  /** 预签名上传URL */
  uploadUrl: string
  /** 上传时需要的额外 headers */
  headers?: Record<string, string>
  /** 过期时间 */
  expiresAt?: string
  /** 命中类型：dedup（秒传）| idempotency（幂等） */
  hitType?: 'dedup' | 'idempotency' | null
  /** 会话状态 */
  status?: string
  /** 文件ID（秒传时直接返回） */
  fileId?: string
  /** 分片大小（multipart 模式） */
  chunkSize?: number
  /** 消息 */
  message?: string
}

/**
 * 完成上传请求参数
 */
export interface CompleteSessionRequest {
  /** 分片信息列表（multipart 模式需要） */
  parts: Array<{
    partNumber: number
    etag: string
  }>
}

/**
 * 完成上传响应
 */
export interface CompleteSessionResponse {
  /** 会话ID */
  sessionId: string
  /** 状态 */
  status: string
  /** 消息 */
  message?: string
}

/**
 * 最终确认响应
 */
export interface FinalizeSessionResponse {
  /** 文件ID */
  fileId: string
  /** 状态 */
  status: string
  /** 文件类型 */
  fileType?: string
  /** 文件大小 */
  fileSize?: number
  /** 消息 */
  message?: string
}

// ========================================
// API 接口
// ========================================

/**
 * 文件服务 API
 */
export const fileApi = {
  /**
   * 步骤1: 创建上传会话
   *
   * @param data - 创建会话请求参数
   * @returns 上传会话信息
   */
  createSession(data: CreateSessionRequest): Promise<CreateSessionResponse> {
    return http.post('/fs/uploads/sessions', data)
  },

  /**
   * 步骤2: 完成上传（上传文件到 uploadUrl 后调用）
   *
   * @param sessionId - 会话ID
   * @param data - 分片信息
   * @returns 完成响应
   */
  completeSession(
    sessionId: string,
    data: CompleteSessionRequest
  ): Promise<CompleteSessionResponse> {
    return http.post(`/fs/uploads/sessions/${sessionId}/complete`, data)
  },

  /**
   * 步骤3: 最终确认，获取 fileId
   *
   * @param sessionId - 会话ID
   * @returns 文件信息
   */
  finalizeSession(sessionId: string): Promise<FinalizeSessionResponse> {
    return http.post(`/fs/uploads/sessions/${sessionId}/finalize`)
  },

  /**
   * 构造文件访问URL
   *
   * @param fileId - 文件ID
   * @returns 文件访问URL路径
   */
  getFileUrl(fileId: string): string {
    return `/fs/files/${fileId}/content`
  },
}

