/**
 * useImageUpload.js - 图片上传的别名
 * 
 * @deprecated 使用 useFileUpload 替代（支持所有文件类型）
 * 本文件保留仅用于向后兼容性。
 * 图片上传应该使用 useFileUpload({ allowedMimePrefix: 'image/' })
 * 
 * @see useFileUpload.js
 */

export { useFileUpload as useImageUpload } from './useFileUpload'
