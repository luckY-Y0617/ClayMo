<template>
  <div class="top-bar">
    <div class="top-bar-left">
      <!-- 标题编辑器 -->
      <input
        v-model="title"
        class="title-input"
        placeholder="输入文档标题..."
        :readonly="isReadOnly"
        @blur="handleTitleBlur"
        @keyup.enter="handleTitleEnter"
      />
      
      <!-- 元信息行 -->
      <div v-if="currentDocument" class="meta-row">
        <div class="meta-info">
          <span class="last-edit">
            最后编辑：{{ lastEditTime }}
          </span>
        </div>
      </div>
    </div>

    <div class="top-bar-right">
      <!-- 模式切换 -->
      <div v-if="!isReadOnly" class="mode-switch">
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
      <div v-else class="readonly-badge">
        <span class="badge-text">只读模式</span>
      </div>

      <!-- 保存状态 -->
      <div v-if="!isReadOnly" class="save-status">
        <span class="status-dot" :data-status="saveStatus"></span>
        <span class="status-text">{{ saveStatusText }}</span>
      </div>

      <!-- 版本历史按钮 -->
      <button
        v-if="canViewVersion"
        class="custom-btn version-history-btn"
        @click="handleVersionHistory"
      >
        <span class="btn-icon">↻</span>
        <span class="btn-text">版本历史</span>
      </button>

      <!-- 保存版本按钮 -->
      <button
        v-if="!isReadOnly"
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

<script setup lang="ts">
import { ref, computed, watch, inject, type Ref } from 'vue'
import { ElIcon, ElMessage } from 'element-plus'
import { Share, Download, MoreFilled } from '@element-plus/icons-vue'
import { formatDistanceToNowStrict } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { kbApi } from '@/api'
import { usePermissionStore } from '@/stores/permission'
import type { EditorDocument, SaveStatus } from '@/types/editor'

interface EditorSession {
  saveStatus: Ref<SaveStatus>
  currentDocument: Ref<EditorDocument | null>
  setCurrentDocument: (doc: EditorDocument) => void
  updateCurrentDocument: (updates: Partial<EditorDocument>) => void
}

interface Props {
  layoutMode?: string
  isReadOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  layoutMode: 'write',
  isReadOnly: false,
})

const emit = defineEmits<{
  'mode-change': [mode: 'write' | 'preview']
  share: []
  export: []
  'save-version': []
  'version-history': []
}>()

// 通过 inject 获取编辑器会话
const editorSession = inject<EditorSession>('editorSession')
const permissionStore = usePermissionStore()

const title = ref('')
const saveStatus = computed(() => editorSession?.saveStatus.value || 'saved')
const currentDocument = computed(() => editorSession?.currentDocument.value)

// 版本历史权限检查
const canViewVersion = computed(() => {
  const kbId = currentDocument.value?.knowledgeBaseId
  if (!kbId) return false
  return permissionStore.hasScopedCapability('kb', kbId, 'version.restore')
})

const saveStatusText = computed(() => {
  const statusMap: Record<SaveStatus, string> = {
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
watch(() => editorSession?.currentDocument.value, (doc) => {
  if (doc) {
    title.value = doc.title
  } else {
    title.value = ''
  }
}, { immediate: true })

// 标题失焦保存
const handleTitleBlur = async () => {
  if (!editorSession?.currentDocument.value) return
  if (title.value === editorSession.currentDocument.value.title) return

  try {
    await kbApi.document.rename(
      editorSession.currentDocument.value.knowledgeBaseId, 
      editorSession.currentDocument.value.id, 
      { title: title.value }
    )
    editorSession.setCurrentDocument({
      ...editorSession.currentDocument.value,
      title: title.value,
    })
    ElMessage.success('标题已更新')
  } catch {
    ElMessage.error('更新标题失败')
    title.value = editorSession.currentDocument.value.title
  }
}

// 标题回车保存
const handleTitleEnter = (e: Event) => {
  (e.target as HTMLInputElement).blur()
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

const setMode = (mode: 'write' | 'preview') => {
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
  border-bottom: 1px solid #EBEBEB;
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

.meta-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 24px;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.last-edit {
  font-size: 12px;
  color: #999;
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
  padding: 3px;
  border-radius: 8px;
  background: #F0F0F0;
  border: none;
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
  transition: background-color 0.2s ease, transform 0.15s ease;
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

/* 只读模式徽章 */
.readonly-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.readonly-badge .badge-text {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

/* ======== 响应式设计 ======== */

/* 平板和手机 */
@media (max-width: 768px) {
  .top-bar {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .top-bar-left {
    flex: 1;
    min-width: 100%;
    margin-right: 0;
    gap: 6px;
  }

  .title-input {
    font-size: 20px;
    padding: 6px 0;
  }

  .meta-row {
    gap: 12px;
  }

  .last-edit {
    font-size: 11px;
  }

  .top-bar-right {
    width: 100%;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* 模式切换 */
  .mode-switch {
    padding: 2px;
    border-radius: 6px;
  }

  .mode-pill {
    padding: 5px 12px;
    font-size: 13px;
    border-radius: 5px;
  }

  /* 保存状态 */
  .save-status {
    font-size: 12px;
    gap: 6px;
  }

  .status-dot {
    width: 7px;
    height: 7px;
  }

  .status-text {
    min-width: 50px;
  }

  /* 按钮组 */
  .custom-btn {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 6px;
    gap: 4px;
  }

  .btn-icon {
    font-size: 13px;
  }

  .btn-text {
    font-size: 12px;
  }

  .version-history-btn,
  .save-version-btn {
    margin-right: 4px;
  }

  /* 隐藏版本历史按钮文字，只显示图标 */
  .version-history-btn .btn-text {
    display: none;
  }

  .action-group {
    gap: 2px;
    padding: 2px;
    border-radius: 6px;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }

  .readonly-badge {
    padding: 5px 10px;
    border-radius: 5px;
  }

  .readonly-badge .badge-text {
    font-size: 12px;
  }
}

/* 中等手机 */
@media (max-width: 640px) {
  .top-bar {
    padding: 10px 12px;
    gap: 10px;
  }

  .top-bar-left {
    gap: 4px;
  }

  .title-input {
    font-size: 18px;
    padding: 4px 0;
  }

  .meta-row {
    gap: 10px;
    min-height: 20px;
  }

  .last-edit {
    font-size: 10px;
  }

  .top-bar-right {
    gap: 10px;
  }

  .mode-switch {
    padding: 2px;
  }

  .mode-pill {
    padding: 4px 10px;
    font-size: 12px;
  }

  .save-status {
    font-size: 11px;
    gap: 5px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
  }

  .custom-btn {
    padding: 5px 10px;
    font-size: 11px;
  }

  .btn-icon {
    font-size: 12px;
  }

  .btn-text {
    font-size: 11px;
  }

  /* 进一步隐藏保存版本按钮的文字 */
  .save-version-btn .btn-text {
    display: none;
  }

  .icon-btn {
    width: 30px;
    height: 30px;
  }
}

/* 小屏手机 */
@media (max-width: 480px) {
  .top-bar {
    padding: 8px 10px;
    gap: 8px;
  }

  .top-bar-left {
    gap: 4px;
  }

  .title-input {
    font-size: 16px;
    padding: 4px 0;
  }

  .meta-row {
    gap: 8px;
    min-height: 18px;
  }

  .last-edit {
    font-size: 9px;
  }

  .top-bar-right {
    gap: 8px;
  }

  .mode-switch {
    padding: 2px;
  }

  .mode-pill {
    padding: 4px 8px;
    font-size: 11px;
  }

  .save-status {
    font-size: 10px;
    gap: 4px;
  }

  .status-dot {
    width: 5px;
    height: 5px;
  }

  .status-text {
    min-width: 40px;
  }

  .custom-btn {
    padding: 4px 8px;
    font-size: 10px;
  }

  .btn-icon {
    font-size: 11px;
  }

  .version-history-btn,
  .save-version-btn {
    margin-right: 2px;
  }

  .action-group {
    gap: 2px;
    padding: 2px;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
  }

  /* 在极小屏幕上隐藏"导出"按钮，保留分享和更多 */
  .action-group .icon-btn:nth-child(2) {
    display: none;
  }

  .readonly-badge {
    padding: 4px 8px;
  }

  .readonly-badge .badge-text {
    font-size: 11px;
  }
}
</style>

