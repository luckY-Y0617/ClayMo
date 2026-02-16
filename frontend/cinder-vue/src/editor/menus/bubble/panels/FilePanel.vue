<!--
  FilePanel.vue
  
  文件面板：预览、下载、复制链接、删除
-->
<template>
  <div class="kb-file-panel" @mousedown.stop>
    <!-- 预览 -->
    <button class="kb-panel-btn" title="预览" @click="previewFile">
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h6v6"></path>
        <path d="M10 14L21 3"></path>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      </svg>
    </button>

    <!-- 下载 -->
    <button class="kb-panel-btn" title="下载" @click="downloadFile">
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    </button>

    <!-- 复制链接 -->
    <button class="kb-panel-btn" title="复制链接" @click="copyLink">
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    </button>

    <div class="kb-panel-divider"></div>

    <!-- 删除 -->
    <button class="kb-panel-btn danger" title="删除" @click="handleDelete">
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  editor: { type: Object, required: true },
  nodeAttrs: { type: Object, default: null },
})

const emit = defineEmits(['action-start', 'delete', 'preview'])

// ========== 辅助函数 ==========

const getFileBlockOptions = () => {
  const ed = props.editor
  const ext = ed?.extensionManager?.extensions?.find((e) => e.name === 'fileBlock')
  return ext?.options || {}
}

const downloadByAnchor = (url, fileName) => {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'download'
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const downloadByBlob = async (url, fileName) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = fileName || 'download'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

// ========== 操作方法 ==========

const previewFile = () => {
  const attrs = props.nodeAttrs
  if (!attrs) return
  emit('preview', {
    fileId: attrs.fileId,
    fileName: attrs.fileName,
    fileType: attrs.fileType,
    fileSize: attrs.fileSize,
    fileExt: attrs.fileExt,
    src: attrs.src,
  })
}

const downloadFile = async () => {
  const attrs = props.nodeAttrs
  if (!attrs) return

  emit('action-start')

  const opts = getFileBlockOptions()
  const url = typeof opts.resolveDownloadUrl === 'function'
    ? opts.resolveDownloadUrl(attrs)
    : (attrs.src || null)

  if (!url) return

  const fileName = attrs.fileName || 'download'
  const size = Number(attrs.fileSize || 0)

  try {
    if (typeof opts.onDownload === 'function') {
      await opts.onDownload(attrs, { editor: props.editor })
      return
    }

    const strategy = opts.downloadStrategy || 'auto'
    const threshold = Number(opts.blobThresholdBytes || 0)

    if (strategy === 'blob') {
      await downloadByBlob(url, fileName)
    } else if (strategy === 'a') {
      downloadByAnchor(url, fileName)
    } else {
      // auto
      if (threshold > 0 && size > 0 && size <= threshold) {
        await downloadByBlob(url, fileName)
      } else {
        downloadByAnchor(url, fileName)
      }
    }
  } catch (e) {
    console.error(e)
  }
}

const copyLink = async () => {
  const attrs = props.nodeAttrs
  if (!attrs) return

  const opts = getFileBlockOptions()
  const url = typeof opts.resolveShareUrl === 'function'
    ? opts.resolveShareUrl(attrs)
    : (attrs.fileId ? `${location.origin}/file/${attrs.fileId}` : '')

  if (url) {
    await copyToClipboard(url)
  }
}

const handleDelete = () => {
  emit('delete')
}
</script>

<!-- ========== 样式定义 ========== -->
<style scoped>
/* ========== 基础样式 ========== */
.kb-file-panel {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 4px 6px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
  box-sizing: border-box;
}

.kb-panel-btn {
  width: 28px;
  height: 28px;
  padding: 6px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #555;
  transition: background 0.2s, color 0.2s;
  flex-shrink: 0;
}

.kb-panel-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.kb-panel-btn.danger {
  color: #d14343;
}

.kb-panel-btn.danger:hover {
  background: rgba(209, 67, 67, 0.1);
}

.kb-panel-divider {
  width: 1px;
  height: 14px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 2px;
  flex-shrink: 0;
}

/* ========== 移动端响应式适配 ========== */
@media (max-width: 768px) {
  .kb-file-panel {
    max-width: calc(100vw - 32px) !important;
  }
}

@media (max-width: 480px) {
  .kb-file-panel {
    max-width: calc(100vw - 24px) !important;
    gap: 2px;
    padding: 4px;
  }
  
  .kb-panel-btn {
    width: 32px;
    height: 32px;
  }
  
  .kb-panel-divider {
    margin: 0 1px;
  }
}
</style>
