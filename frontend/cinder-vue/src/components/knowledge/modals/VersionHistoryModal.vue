<template>
  <Teleport to="body">
    <!-- 版本历史侧栏 -->
    <Transition name="panel-slide">
    <div
      v-if="visible"
      class="version-history-overlay"
      @click.self="handleClose"
    >
        <div class="version-history-panel" @click.stop>
          <div class="panel-header">
            <h3 class="panel-title">版本历史</h3>
            <button class="panel-close" @click="handleClose">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
        </div>

          <div class="panel-content">
            <div v-if="loading" class="loading-state">
              <svg class="spinner" width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="62.83" stroke-dashoffset="62.83">
                  <animate attributeName="stroke-dashoffset" values="62.83;0;62.83" dur="1.5s" repeatCount="indefinite"/>
                </circle>
              </svg>
              <span>加载中...</span>
          </div>

          <template v-else>
              <div v-if="versions.length === 0" class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#CCCCCC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              <p>暂无版本记录</p>
            </div>

            <div
              v-for="version in versions"
              :key="version.id"
              class="version-item"
              :class="{ current: version.isCurrent }"
            >
              <div class="version-main">
                <!-- 第一行：版本号 + 当前徽章 + 操作按钮 -->
                <div class="version-row-top">
                  <div class="version-title-block">
                    <span class="version-number">v{{ version.versionNumber }}</span>
                    <span
                      v-if="version.isCurrent"
                      class="version-current-badge"
                    >
                      当前版本
                    </span>
                  </div>

                  <div class="version-actions">
                    <button
                      class="version-action-btn"
                      type="button"
                      @click="previewVersion(version)"
                    >
                        预览
                    </button>
                    <button
                      v-if="!version.isCurrent"
                      class="version-action-btn primary"
                      type="button"
                      @click="restoreVersion(version)"
                    >
                        恢复
                    </button>
                  </div>
                </div>

                <!-- 第二行：变更摘要 -->
                <div
                  v-if="version.changeSummary"
                  class="version-summary"
                >
                  {{ version.changeSummary }}
                </div>

                <!-- 第三行：时间 + 字数 -->
                <div class="version-meta-row">
                  <span v-if="version.creationTime" class="version-time">
                    {{ formatTime(version.creationTime) }}
                  </span>
                  <span
                    v-if="version.creationTime && version.wordCount !== undefined"
                    class="version-dot"
                  >
                    ·
                  </span>
                  <span
                    v-if="version.wordCount !== undefined"
                    class="version-words"
                  >
                    {{ version.wordCount }} 字
                  </span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    </Transition>

    <!-- 版本预览对话框 -->
    <Transition name="modal-fade">
    <div
      v-if="previewVisible"
        class="preview-overlay"
      @click.self="previewVisible = false"
    >
        <div class="preview-modal" @click.stop>
          <div class="preview-header">
            <h3 class="preview-title">版本预览</h3>
            <button class="preview-close" @click="previewVisible = false">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
        </div>

          <div class="preview-body">
          <div class="preview-content" v-html="previewContent"></div>
        </div>

          <div class="preview-footer">
          <button
              class="btn btn-secondary"
            type="button"
            @click="previewVisible = false"
          >
            关闭
          </button>
          <button
            v-if="selectedVersion && !selectedVersion.isCurrent"
              class="btn btn-primary"
            type="button"
            @click="confirmRestore"
          >
            恢复此版本
          </button>
        </div>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { format } from 'date-fns'
import { kbApi } from '@/api/kb.api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const editorSession = inject('editorSession')
const versions = ref([])
const loading = ref(false)
const previewVisible = ref(false)
const previewContent = ref('')
const selectedVersion = ref(null)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// 加载版本列表
const loadVersions = async () => {
  if (!editorSession.currentDocument.value) {
    versions.value = []
    return
  }

  loading.value = true
  try {
    const result = await kbApi.document.version.list(
      editorSession.currentDocument.value.knowledgeBaseId,
      editorSession.currentDocument.value.id
    )
    const list = result?.items ?? []

    if (!list.length) {
      versions.value = []
      return
    }

    // 按 VersionNumber 判断当前版本
    const maxVersion = Math.max(...list.map((v) => v.versionNumber))

    versions.value = list.map((v) => ({
      ...v,
      isCurrent: v.versionNumber === maxVersion,
    }))
  } catch (error) {
    console.error('加载版本列表失败:', error)
    ElMessage.error('加载版本列表失败')
  } finally {
    loading.value = false
  }
}

// 预览版本
const previewVersion = async (version) => {
  try {
    selectedVersion.value = version
    previewContent.value = version.snapshotHtml || ''
    previewVisible.value = true
  } catch (error) {
    console.error('预览版本失败:', error)
    ElMessage.error('预览版本失败')
  }
}

// 恢复版本
const restoreVersion = async (version) => {
  try {
    await ElMessageBox.confirm(
      '确定要恢复到此版本吗？当前未保存的更改将丢失。',
      '确认恢复',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const restored = await kbApi.document.version.restore(
      editorSession.currentDocument.value.knowledgeBaseId,
      editorSession.currentDocument.value.id,
      version.id
    )

    ElMessage.success('版本恢复成功')

    // 更新编辑器内容
    if (restored && restored.content && editorSession.editor.value) {
      let json = restored.content.contentJson
      if (typeof json === 'string') {
        try {
          json = JSON.parse(json)
        } catch {
          json = null
        }
      }

      if (json) {
        editorSession.editor.value.commands.setContent(json)
      } else if (restored.content.contentHtml) {
        editorSession.editor.value.commands.setContent(restored.content.contentHtml)
      }
    }

    // 更新 store 中 currentDocument
    if (restored && editorSession.currentDocument.value) {
      editorSession.setCurrentDocument({
        ...editorSession.currentDocument.value,
        contentJson: restored.content?.contentJson,
        contentHtml: restored.content?.contentHtml,
        wordCount:
          restored.content?.wordCount ?? editorSession.currentDocument.value.wordCount,
      })
    }

    // 刷新版本列表
    await loadVersions()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('恢复版本失败:', error)
      ElMessage.error('恢复版本失败')
    }
  }
}

// 从预览对话框触发恢复
const confirmRestore = () => {
  previewVisible.value = false
  if (selectedVersion.value) {
    restoreVersion(selectedVersion.value)
  }
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return ''
  try {
    const date = new Date(time)
    return format(date, 'yyyy-MM-dd HH:mm')
  } catch (error) {
    return time
  }
}

// 监听弹出层显示状态
watch(visible, (val) => {
  if (val) {
    loadVersions()
  } else {
    previewVisible.value = false
    selectedVersion.value = null
  }
})

// 监听当前文档变化
watch(
  () => editorSession.currentDocument.value,
  () => {
    if (visible.value) {
      loadVersions()
    }
  }
)

// 监听保存时间 → 保存后自动刷新版本列表
watch(
  () => editorSession.lastSavedAt.value,
  (newVal) => {
    if (newVal && editorSession.currentDocument.value && visible.value) {
      loadVersions()
    }
  }
)

// 关闭侧栏
const handleClose = () => {
  visible.value = false
}

// ESC 键关闭
const handleEsc = (e) => {
  if (e.key === 'Escape') {
    if (previewVisible.value) {
      previewVisible.value = false
    } else if (visible.value) {
      visible.value = false
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
})
</script>

<style scoped>
/* 版本历史侧栏 */
.version-history-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 20px;
}

.version-history-panel {
  width: 380px;
  max-height: calc(100vh - 40px);
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #E8E8E8;
  background: #FFFFFF;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.panel-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.panel-close:hover {
  background: #F5F5F5;
  color: #1a1a1a;
}

.panel-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  color: #999;
  font-size: 14px;
}

.empty-state p {
  margin: 0;
}

/* 版本项 */
.version-item {
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #E8E8E8;
  background: #FFFFFF;
  transition: all 0.2s ease;
}

.version-item:hover {
  border-color: #0f172a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.version-item.current {
  background: #FAFAFA;
}

.version-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 第一行：标题 + 操作 */
.version-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.version-title-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-number {
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
}

.version-current-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: #0f172a;
  color: #FFFFFF;
  font-weight: 500;
}

.version-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.version-action-btn {
  padding: 6px 12px;
  border: 1px solid #E0E0E0;
  background: #FFFFFF;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s ease;
  font-family: inherit;
}

.version-action-btn:hover {
  background: #F5F5F5;
  border-color: #CCCCCC;
  color: #1a1a1a;
}

.version-action-btn.primary {
  background: #0f172a;
  border-color: #0f172a;
  color: #FFFFFF;
}

.version-action-btn.primary:hover {
  background: #1e293b;
  border-color: #1e293b;
}

/* 第二行：摘要 */
.version-summary {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  word-break: break-word;
}

/* 第三行：时间 + 字数 */
.version-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
}

.version-dot {
  opacity: 0.6;
}

/* 版本预览弹出层 */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.preview-modal {
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #E8E8E8;
}

.preview-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.preview-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.preview-close:hover {
  background: #F5F5F5;
  color: #1a1a1a;
}

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.preview-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #E8E8E8;
}

/* 按钮 */
.btn {
  padding: 10px 20px;
  border: 1px solid #E0E0E0;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-secondary {
  background: #FFFFFF;
  color: #1a1a1a;
}

.btn-secondary:hover {
  background: #F5F5F5;
  border-color: #CCCCCC;
}

.btn-primary {
  background: #0f172a;
  border-color: #0f172a;
  color: #FFFFFF;
}

.btn-primary:hover {
  background: #1e293b;
  border-color: #1e293b;
}

/* 预览区域内容样式 */
.preview-content {
  font-size: 14px;
  line-height: 1.6;
  color: #1a1a1a;
}

.preview-content :deep(h1),
.preview-content :deep(h2),
.preview-content :deep(h3),
.preview-content :deep(h4),
.preview-content :deep(h5),
.preview-content :deep(h6) {
  margin-top: 2px !important;
  margin-bottom: 4px !important;
  font-weight: 600;
  line-height: 1.3;
}

.preview-content :deep(p) {
  margin: 0.75em 0;
}

.preview-content :deep(ul),
.preview-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.75em 0;
}

/* Spinner */
.spinner {
  animation: spin 1.5s linear infinite;
  color: #999;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 动画 */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: opacity 0.2s ease;
}

.panel-slide-enter-active .version-history-panel,
.panel-slide-leave-active .version-history-panel {
  transition: transform 0.2s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
    opacity: 0;
  }

.panel-slide-enter-from .version-history-panel {
  transform: translateX(100%);
  }

.panel-slide-leave-to .version-history-panel {
    transform: translateX(100%);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
  }

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}
</style>
