<template>
  <div class="top-bar">
    <div class="top-bar-left">
      <!-- 标题编辑器 -->
      <input
        v-model="title"
        class="title-input"
        placeholder="输入文档标题..."
        @blur="handleTitleBlur"
        @keyup.enter="handleTitleEnter"
      />
      
      <!-- 标签行：标签 + 最后编辑时间 -->
      <div v-if="currentDocument" class="tags-row">
        <DocumentTags
          v-model="documentTags"
          :document-id="currentDocument.id"
          @change="handleTagsChange"
        />
        <div class="meta-info">
          <span class="last-edit">
            最后编辑：{{ lastEditTime }}
          </span>
        </div>
      </div>
    </div>

    <div class="top-bar-right">
      <div class="mode-switch">
        <button
          class="mode-pill"
          :class="{ active: layoutMode === 'write' }"
          @click="setMode('write')"
        >
          写作
        </button>
        <button
          class="mode-pill"
          :class="{ active: layoutMode === 'preview' }"
          @click="setMode('preview')"
        >
          预览
        </button>
      </div>

      <!-- 保存状态 -->
      <div class="save-status">
        <span class="status-dot" :data-status="saveStatus"></span>
        <span class="status-text">{{ saveStatusText }}</span>
      </div>

      <!-- 版本历史按钮 -->
      <button
        class="custom-btn version-history-btn"
        @click="handleVersionHistory"
      >
        <span class="btn-icon">↻</span>
        <span class="btn-text">版本历史</span>
      </button>

      <!-- 保存版本按钮 -->
      <button
        class="custom-btn save-version-btn primary"
        @click="handleSaveVersion"
      >
        <span class="btn-icon">✓</span>
        <span class="btn-text">保存版本</span>
      </button>

      <!-- 操作按钮 -->
      <div class="action-group">
        <button class="icon-btn" title="分享" @click="handleShare">
          <el-icon><Share /></el-icon>
        </button>
        <button class="icon-btn" title="导出" @click="handleExport">
          <el-icon><Download /></el-icon>
        </button>
        <button class="icon-btn" title="更多" @click="handleMore">
          <el-icon><MoreFilled /></el-icon>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { Share, Download, MoreFilled } from '@element-plus/icons-vue'
import { kbApi } from '@/api/kb.api'
import { ElMessage } from 'element-plus'
import { formatDistanceToNowStrict } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import DocumentTags from './DocumentTags.vue'

const props = defineProps({
  layoutMode: {
    type: String,
    default: 'write',
  },
  isReadOnly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['mode-change', 'share', 'export', 'save-version', 'version-history'])

// 通过 inject 获取编辑器会话
const editorSession = inject('editorSession')

const title = ref('')
const documentTags = ref([])
const saveStatus = computed(() => editorSession.saveStatus.value)
const currentDocument = computed(() => editorSession.currentDocument.value)

const saveStatusText = computed(() => {
  const statusMap = {
    saved: '已保存',
    saving: '保存中...',
    unsaved: '未保存',
    error: '保存失败',
  }
  return statusMap[saveStatus.value] || '未知'
})

// 最后编辑时间
const lastEditTime = computed(() => {
  if (!currentDocument.value) return '未知'
  const time = currentDocument.value.lastModificationTime || 
               currentDocument.value.lastContentUpdateTime ||
               currentDocument.value.creationTime
  if (!time) return '未知'
  
  try {
    return formatDistanceToNowStrict(new Date(time), {
      addSuffix: true,
      locale: zhCN,
    })
  } catch {
    return '未知'
  }
})

// 监听当前文档变化
watch(() => editorSession.currentDocument.value, (doc) => {
  if (doc) {
    title.value = doc.title
    documentTags.value = doc.tags || []
  } else {
    title.value = ''
    documentTags.value = []
  }
}, { immediate: true })

// 处理标签变化
const handleTagsChange = async (tagIds) => {
  if (!currentDocument.value) return

  try {
    await kbApi.tag.setDocumentTags(currentDocument.value.id, tagIds)
    editorSession.updateCurrentDocument({
      tags: tagIds,
    })
  } catch (error) {
    ElMessage.error('更新标签失败')
  }
}

// 标题失焦保存
const handleTitleBlur = async () => {
  if (!editorSession.currentDocument.value) return
  if (title.value === editorSession.currentDocument.value.title) return

  try {
    await kbApi.document.rename(editorSession.currentDocument.value.knowledgeBaseId, editorSession.currentDocument.value.id, {
      title: title.value,
    })
    editorSession.setCurrentDocument({
      ...editorSession.currentDocument.value,
      title: title.value,
    })
    ElMessage.success('标题已更新')
  } catch (error) {
    ElMessage.error('更新标题失败')
    title.value = editorSession.currentDocument.value.title
  }
}

// 标题回车保存
const handleTitleEnter = (e) => {
  e.target.blur()
}

// 分享
const handleShare = () => {
  emit('share')
}

// 导出
const handleExport = () => {
  emit('export')
}

// 版本历史
const handleVersionHistory = () => {
  emit('version-history')
}

// 保存版本
const handleSaveVersion = () => {
  emit('save-version')
}

// 更多
const handleMore = () => {
  ElMessage.info('更多功能开发中...')
}

const setMode = (mode) => {
  if (mode !== props.layoutMode) {
    emit('mode-change', mode)
  }
}
</script>

<style scoped>
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 48px;
  background: #FFFFFF;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.top-bar-left {
  flex: 1;
  margin-right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tags-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 32px;
  width: 100%;
}

.tags-row :deep(.document-tags) {
  flex: 1;
  min-width: 0;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.last-edit {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}

.title-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  background: transparent;
  padding: 8px 0;
  letter-spacing: -0.02em;
}

.title-input::placeholder {
  color: #999;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.mode-switch {
  display: inline-flex;
  padding: 4px;
  border-radius: 8px;
  background: #F7F7F7;
  border: 1px solid transparent;
}

.mode-pill {
  border: none;
  background: transparent;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  font-weight: 400;
}

.mode-pill:hover {
  color: #1a1a1a;
  background: rgba(0, 0, 0, 0.04);
}

.mode-pill.active {
  background: #1a1a1a;
  color: #FFFFFF;
  font-weight: 500;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e5e6eb;
  transition: background-color var(--transition-normal) var(--ease-standard),
              transform var(--transition-fast) var(--ease-standard);
}

.status-dot[data-status='saving'] {
  background: #666;
  animation: pulse 1.5s ease-in-out infinite;
}

.status-dot[data-status='saved'] {
  background: #1a1a1a;
}

.status-dot[data-status='error'] {
  background: #1a1a1a;
  opacity: 0.5;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.status-text {
  min-width: 60px;
}

/* 自定义按钮样式 */
.custom-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: #FFFFFF;
  color: #1a1a1a;
  font-family: inherit;
}

.custom-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.custom-btn:active {
  transform: translateY(0);
}

.custom-btn.primary {
  background: #1a1a1a;
  color: #FFFFFF;
  border-color: #1a1a1a;
}

.custom-btn.primary:hover {
  background: #000;
  border-color: #000;
  color: #FFFFFF;
}

.btn-icon {
  font-size: 14px;
  line-height: 1;
}

.btn-text {
  font-size: 13px;
  font-weight: 500;
}

.version-history-btn {
  margin-right: 8px;
}

.save-version-btn {
  margin-right: 8px;
}

.action-group {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: transparent;
}

.icon-btn {
  border: none;
  background: transparent;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #1a1a1a;
}

.icon-btn:active {
  transform: scale(0.95);
}
</style>

