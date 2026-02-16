import http from '@/utils/http'
import { uploadHttp } from '@/utils/uploadHttp'

export const fileApi = {

  upload: {
    /**
     * 步骤1: 创建上传会话
     * @param {Object} data
     * @param {string} data.idempotencyKey - 幂等键（可用 fileHash 或 UUID）
     * @param {string} data.fileName - 文件名
     * @param {number} data.fileSize - 文件大小（字节）
     * @param {string} data.bizType - 业务类型，如 'document'
     * @param {string} data.fileType - 文件类型，如 'img'
     * @param {string} data.fileHash - 文件哈希值
     * @param {string} data.mode - 上传模式: 'auto' | 'single' | 'multipart'
     * @param {number} data.preferredChunkSize - 首选分片大小（可选）
     * @returns {Promise<{ sessionId, mode, objectKey, uploadUrl, headers, expiresAt, hitType, status, message }>}
     */
    createSession(data) {
      return uploadHttp.post('/uploads/sessions', data)
    },

    /**
     * 步骤2: 完成上传（上传文件到 uploadUrl 后调用）
     * @param {string} sessionId - 会话ID
     * @param {Object} data - { parts: [] }
     * @returns {Promise<{ sessionId, status, message }>}
     */
    completeSession(sessionId, data) {
      return uploadHttp.post(`/uploads/sessions/${sessionId}/complete`, data)
    },

    /**
     * 步骤3: 最终确认，获取 fileId
     * @param {string} sessionId - 会话ID
     * @returns {Promise<{ fileId, status, fileType, fileSize, message }>}
     */
    finalizeSession(sessionId) {
      return uploadHttp.post(`/uploads/sessions/${sessionId}/finalize`)
    },

    /**
     * 构造文件访问URL
     * @param {string} fileId - 文件ID
     * @returns {string} 文件访问URL路径
     */
    getFileUrl(fileId) {
      return `/fs/files/${fileId}/content`
    }
  }
}
