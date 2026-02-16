<!--
  PreviewModal.vue
  
  文件预览弹框：支持图片、PDF、Office 等文件预览
-->
<template>
  <Teleport to="body">
    <Transition name="preview-fade">
      <div
        v-if="visible"
        class="preview-modal-mask"
        @click.self="handleClose"
        @keydown.esc="handleClose"
      >
        <div class="preview-modal">
          <!-- 头部 -->
          <div class="preview-header">
            <div class="preview-title">
              <span class="preview-icon" v-html="fileIcon"></span>
              <span class="preview-name">{{ fileName }}</span>
              <span v-if="fileSize" class="preview-size">{{ formatFileSize(fileSize) }}</span>
            </div>
            <div class="preview-actions">
              <button
                class="preview-action-btn"
                title="下载"
                @click="handleDownload"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
              <button
                class="preview-action-btn"
                title="在新标签页打开"
                @click="handleOpenInNewTab"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
              <button
                class="preview-action-btn preview-close-btn"
                title="关闭 (Esc)"
                @click="handleClose"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- 内容区 -->
          <div class="preview-content">
            <!-- 加载中 -->
            <div v-if="loading" class="preview-loading">
              <div class="preview-spinner"></div>
              <span>加载中...</span>
            </div>

            <!-- 错误 -->
            <div v-else-if="error" class="preview-error">
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="#ef4444" stroke-width="1.5" fill="none">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ error }}</span>
              <button class="preview-retry-btn" @click="loadPreview">重试</button>
            </div>

            <!-- 图片预览 -->
            <div v-else-if="isImage" class="preview-image-container">
              <img
                :src="previewUrl"
                :alt="fileName"
                class="preview-image"
                @load="loading = false"
                @error="handleImageError"
              />
            </div>

            <!-- PDF 预览 -->
            <div v-else-if="isPdf" class="preview-pdf-container">
              <iframe
                :src="previewUrl"
                class="preview-iframe"
                @load="loading = false"
              ></iframe>
            </div>

            <!-- Office 预览（使用 iframe） -->
            <div v-else-if="isOffice" class="preview-office-container">
              <iframe
                :src="officePreviewUrl"
                class="preview-iframe"
                @load="loading = false"
              ></iframe>
            </div>

            <!-- 不支持预览 -->
            <div v-else class="preview-unsupported">
              <svg viewBox="0 0 24 24" width="64" height="64" stroke="#9ca3af" stroke-width="1.5" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span class="unsupported-text">该文件类型暂不支持预览</span>
              <button class="preview-download-btn" @click="handleDownload">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                下载文件
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  fileId: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileType: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  fileExt: { type: String, default: '' },
  src: { type: String, default: '' },
  // URL 解析函数
  resolvePreviewUrl: { type: Function, default: null },
  resolveDownloadUrl: { type: Function, default: null },
})

const emit = defineEmits(['close', 'download'])

// ============ 状态 ============

const loading = ref(true)
const error = ref('')
const previewUrl = ref('')

// ============ 计算属性 ============

const ext = computed(() => {
  if (props.fileExt) return props.fileExt.toLowerCase()
  const match = props.fileName?.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] || ''
})

const isImage = computed(() => {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  return imageExts.includes(ext.value) || props.fileType?.startsWith('image/')
})

const isPdf = computed(() => {
  return ext.value === 'pdf' || props.fileType === 'application/pdf'
})

const isOffice = computed(() => {
  const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
  return officeExts.includes(ext.value)
})

const officePreviewUrl = computed(() => {
  if (!previewUrl.value) return ''
  // 使用 Microsoft Office Online Viewer
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl.value)}`
})

const fileIcon = computed(() => {
  const e = ext.value
  if (isImage.value) return iconSvg('#10b981')
  if (isPdf.value) return iconSvg('#ef4444')
  if (['doc', 'docx'].includes(e)) return iconSvg('#3b82f6')
  if (['xls', 'xlsx'].includes(e)) return iconSvg('#22c55e')
  if (['ppt', 'pptx'].includes(e)) return iconSvg('#f97316')
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return iconSvg('#8b5cf6')
  return iconSvg('#6b7280')
})

// ============ 方法 ============

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const iconSvg = (color) => {
  return `<svg viewBox="0 0 24 24" width="18" height="18" stroke="${color}" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`
}

const loadPreview = async () => {
  loading.value = true
  error.value = ''

  try {
    // 获取预览 URL
    if (props.resolvePreviewUrl) {
      previewUrl.value = await props.resolvePreviewUrl({
        fileId: props.fileId,
        fileName: props.fileName,
        fileType: props.fileType,
        fileExt: props.fileExt,
        src: props.src,
      })
    } else if (props.src) {
      previewUrl.value = props.src
    } else if (props.fileId) {
      previewUrl.value = `/api/files/${props.fileId}/content?disposition=inline`
    }

    if (!previewUrl.value) {
      throw new Error('无法获取预览地址')
    }

    // 非图片类型直接完成加载
    if (!isImage.value) {
      loading.value = false
    }
  } catch (e) {
    error.value = e.message || '加载失败'
    loading.value = false
  }
}

const handleImageError = () => {
  loading.value = false
  error.value = '图片加载失败'
}

const handleClose = () => {
  emit('close')
}

const handleDownload = async () => {
  let downloadUrl = ''
  
  if (props.resolveDownloadUrl) {
    downloadUrl = await props.resolveDownloadUrl({
      fileId: props.fileId,
      fileName: props.fileName,
      fileType: props.fileType,
      fileExt: props.fileExt,
      src: props.src,
    })
  } else if (props.fileId) {
    downloadUrl = `/api/files/${props.fileId}/content?disposition=attachment`
  } else if (props.src) {
    downloadUrl = props.src
  }

  if (downloadUrl) {
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = props.fileName || 'download'
    a.target = '_blank'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  emit('download')
}

const handleOpenInNewTab = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank', 'noopener')
  }
}

// ============ 键盘事件 ============

const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.visible) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// ============ Watch ============

watch(() => props.visible, (v) => {
  if (v) {
    loadPreview()
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    loading.value = true
    error.value = ''
    previewUrl.value = ''
  }
})
</script>

<style scoped>
.preview-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.preview-modal {
  width: 100%;
  max-width: 1200px;
  max-height: calc(100vh - 80px);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.preview-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-size {
  flex-shrink: 0;
  font-size: 13px;
  color: #9ca3af;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.preview-action-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.15s ease;
}

.preview-action-btn:hover {
  background: #e5e7eb;
  color: #333;
}

.preview-close-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* 内容区 */
.preview-content {
  flex: 1;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  overflow: hidden;
}

/* 加载中 */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #666;
}

.preview-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 错误 */
.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #666;
}

.preview-retry-btn {
  margin-top: 8px;
  padding: 8px 20px;
  border: none;
  background: #3b82f6;
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.preview-retry-btn:hover {
  background: #2563eb;
}

/* 图片预览 */
.preview-image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* PDF / Office 预览 */
.preview-pdf-container,
.preview-office-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* 不支持预览 */
.preview-unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #9ca3af;
}

.unsupported-text {
  font-size: 15px;
}

.preview-download-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 24px;
  border: none;
  background: #3b82f6;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.preview-download-btn:hover {
  background: #2563eb;
}

/* 动画 */
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: all 0.2s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

.preview-fade-enter-from .preview-modal,
.preview-fade-leave-to .preview-modal {
  transform: scale(0.95);
}
</style>

