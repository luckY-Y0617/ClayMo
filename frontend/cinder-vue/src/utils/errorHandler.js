import { ElMessage } from 'element-plus'

/**
 * 错误处理工具
 * 
 * 统一处理 API 错误，避免在每个地方重复 try-catch 和错误提示逻辑
 */

/**
 * 解析后端错误响应
 * 
 * 后端错误结构：
 * {
 *   error: {
 *     code: "400",
 *     message: "错误消息",
 *     details: null,
 *     data: { ... },
 *     validationErrors: null
 *   }
 * }
 */
const parseErrorMessage = (error) => {
  // 如果是字符串，直接返回
  if (typeof error === 'string') {
    return error
  }

  // 尝试从不同的错误结构中提取消息
  const message = 
    error?.error?.message ||  // 后端标准错误格式
    error?.message ||         // 标准 Error 对象
    error?.response?.data?.error?.message ||  // Axios 响应错误
    error?.response?.data?.message ||
    null

  return message
}

/**
 * 获取错误详情（用于调试）
 */
const getErrorDetails = (error) => {
  return {
    code: error?.error?.code || error?.response?.status,
    message: parseErrorMessage(error),
    details: error?.error?.details,
    data: error?.error?.data,
    validationErrors: error?.error?.validationErrors,
  }
}

/**
 * 显示错误消息
 */
const showErrorMessage = (error, fallbackMessage = '操作失败') => {
  const message = parseErrorMessage(error) || fallbackMessage
  ElMessage.error(message)
}

/**
 * 异步操作包装器 - 自动处理 loading 和错误
 * 
 * @param {Function} asyncFn - 异步函数
 * @param {Object} options - 配置选项
 * @param {Ref} options.loading - loading 状态的 ref
 * @param {string} options.errorMessage - 自定义错误消息
 * @param {boolean} options.showError - 是否显示错误提示（默认 true）
 * @param {Function} options.onError - 自定义错误处理函数
 * @param {Function} options.onFinally - finally 回调
 * @returns {Promise} 返回异步函数的结果
 * 
 * @example
 * const loading = ref(false)
 * const data = await withLoading(
 *   () => kbApi.members.list(baseId),
 *   { loading, errorMessage: '加载成员失败' }
 * )
 */
export const withLoading = async (asyncFn, options = {}) => {
  const {
    loading,
    errorMessage,
    showError = true,
    onError,
    onFinally,
  } = options

  if (loading) {
    loading.value = true
  }

  try {
    const result = await asyncFn()
    return result
  } catch (error) {
    console.error('API Error:', getErrorDetails(error))
    
    if (showError) {
      showErrorMessage(error, errorMessage)
    }
    
    if (onError) {
      onError(error)
    }
    
    throw error
  } finally {
    if (loading) {
      loading.value = false
    }
    
    if (onFinally) {
      onFinally()
    }
  }
}

/**
 * 简化版 - 仅处理错误提示，不管理 loading
 * 
 * @example
 * const data = await handleAsync(
 *   () => kbApi.members.list(baseId),
 *   '加载成员失败'
 * )
 */
export const handleAsync = async (asyncFn, errorMessage) => {
  try {
    return await asyncFn()
  } catch (error) {
    console.error('API Error:', getErrorDetails(error))
    showErrorMessage(error, errorMessage)
    throw error
  }
}

/**
 * 静默执行 - 不显示错误提示
 * 
 * @example
 * const data = await silentAsync(() => kbApi.members.list(baseId))
 */
export const silentAsync = async (asyncFn) => {
  try {
    return await asyncFn()
  } catch (error) {
    console.error('API Error:', getErrorDetails(error))
    throw error
  }
}

/**
 * 确认操作包装器 - 需要用户确认的操作
 * 
 * @param {Function} asyncFn - 异步函数
 * @param {Object} options - 配置选项
 * @param {string} options.confirmMessage - 确认消息
 * @param {string} options.confirmTitle - 确认标题
 * @param {string} options.successMessage - 成功消息
 * @param {string} options.errorMessage - 错误消息
 * @param {Ref} options.loading - loading 状态
 * 
 * @example
 * await withConfirm(
 *   () => kbApi.members.remove(baseId, userId),
 *   {
 *     confirmMessage: '确认移除该成员？',
 *     successMessage: '已移除',
 *     errorMessage: '移除失败'
 *   }
 * )
 */
export const withConfirm = async (asyncFn, options = {}) => {
  const {
    confirmMessage = '确认执行此操作？',
    confirmTitle = '确认',
    successMessage,
    errorMessage,
    loading,
  } = options

  const { ElMessageBox } = await import('element-plus')
  
  try {
    await ElMessageBox.confirm(confirmMessage, confirmTitle, {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    
    const result = await withLoading(asyncFn, { loading, errorMessage })
    
    if (successMessage) {
      ElMessage.success(successMessage)
    }
    
    return result
  } catch (error) {
    // 用户取消操作
    if (error === 'cancel') {
      return null
    }
    throw error
  }
}

/**
 * 导出工具函数
 */
export default {
  parseErrorMessage,
  getErrorDetails,
  showErrorMessage,
  withLoading,
  handleAsync,
  silentAsync,
  withConfirm,
}

