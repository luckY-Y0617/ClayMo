<template>
  <transition name="slide-fade">
    <div 
      v-if="visible" 
      class="selection-comment-popup"
      :class="{ 'has-selection': hasSelection }"
    >
      <div class="popup-header">
        <div class="header-title">
          <span class="header-text">添加评论</span>
        </div>
        <button class="close-btn" type="button" @click="handleClose" title="关闭">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="popup-content">
        <!-- 选中文字预览 -->
        <div v-if="selectedText" class="selected-text-preview">
          <span class="preview-bar"></span>
          <span class="preview-text">{{ selectedText }}</span>
        </div>

        <!-- 评论输入框 -->
        <textarea
          ref="textareaRef"
          v-model="draft"
          class="comment-textarea"
          rows="4"
          placeholder="写下你的评论..."
          @focus="handleFocus"
          @keydown.ctrl.enter="handleSubmit"
          @keydown.meta.enter="handleSubmit"
        ></textarea>

        <!-- 底部按钮 -->
        <div class="popup-footer">
          <span class="comment-hint">Ctrl+Enter 发送</span>
          <div class="comment-actions">
            <button
              type="button"
              class="comment-btn comment-btn--ghost"
              @click="handleClose"
            >
              取消
            </button>
            <button
              type="button"
              class="comment-btn comment-btn--primary"
              :disabled="!draft.trim()"
              @click="handleSubmit"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { buildRangeAnchorFromSelection } from '@/utils/commentAnchor'

interface Props {
  editor: Editor
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  submit: [payload: { content: string; parentId: null; position: unknown }]
  close: []
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const draft = ref('')
const selectedText = ref('')
const lastFrom = ref<number | null>(null)
const lastTo = ref<number | null>(null)

const hasSelection = computed(() => {
  const ed = props.editor
  if (!ed || ed.isDestroyed) return false
  const { from, to } = ed.state.selection
  return from !== to
})

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    // 延迟获取选区，确保编辑器选区已更新
    await nextTick()
    setTimeout(() => {
      updateSelectionInfo()
      // 自动聚焦输入框
      nextTick(() => {
        textareaRef.value?.focus()
      })
    }, 50)
  } else {
    // 关闭时清空
    draft.value = ''
    selectedText.value = ''
    lastFrom.value = null
    lastTo.value = null
  }
})

// 监听选区变化，更新选中文字
watch(() => props.editor?.state.selection, () => {
  if (props.visible) {
    updateSelectionInfo()
  }
}, { deep: true })

// 更新选区信息
const updateSelectionInfo = () => {
  if (!props.editor || props.editor.isDestroyed) return

  const { from, to } = props.editor.state.selection

  if (from === to) {
    selectedText.value = ''
    return
  }

  lastFrom.value = from
  lastTo.value = to

  const text = props.editor.state.doc.textBetween(from, to, ' ').trim()
  selectedText.value = text ? (text.length > 100 ? `${text.slice(0, 100)}…` : text) : ''
}

const handleFocus = () => {
  // 可以添加focus时的逻辑
}

const handleClose = () => {
  draft.value = ''
  selectedText.value = ''
  lastFrom.value = null
  lastTo.value = null
  emit('update:visible', false)
  emit('close')
}

const handleSubmit = () => {
  const content = draft.value.trim()
  if (!content) return

  const from = lastFrom.value ?? props.editor.state.selection.from
  const to = lastTo.value ?? props.editor.state.selection.to
  if (!from || !to || from === to) return

  const { position, error } = buildRangeAnchorFromSelection(props.editor, from, to, {
    ctxLen: 12,
  })

  if (error) {
    if (error === 'cross_block') {
      console.warn('暂不支持跨段落评论，请在同一段内选择文本。')
      return
    }
    console.warn('构建评论锚点失败：', error)
    return
  }

  emit('submit', {
    content,
    parentId: null,
    position,
  })

  // 重置状态
  draft.value = ''
  selectedText.value = ''
  lastFrom.value = null
  lastTo.value = null
  emit('update:visible', false)
}
</script>

<style scoped>
/* ====== 右侧评论弹窗 ====== */
.selection-comment-popup {
  position: absolute;
  top: 100px;
  right: 0;
  width: 230px;
  max-width: 100%;
  background: #ffffff;
  border-left: 1px solid #f0f0f0;
  border-radius: 0;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.06);
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.selection-comment-popup.has-selection {
  border-left-color: #000;
}

/* 过渡动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

/* ====== 头部 ====== */
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #f7f7f7;
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-text {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: 0.02em;
}

.close-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: #f7f7f7;
  color: #333;
}

/* ====== 内容 ====== */
.popup-content {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 选中文字预览 */
.selected-text-preview {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #8c8c8c;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fafafa;
}

.preview-bar {
  width: 2px;
  border-radius: 2px;
  align-self: stretch;
  min-height: 16px;
  background: #000;
  flex-shrink: 0;
  margin-top: 1px;
}

.preview-text {
  flex: 1;
  word-break: break-word;
  color: #595959;
  font-style: normal;
}

/* 输入框 */
.comment-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  background: #fafafa;
  font-size: 13px;
  line-height: 1.5;
  color: #1a1a1a;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;
  min-height: 60px;
}

.comment-textarea::placeholder {
  color: #bfbfbf;
}

.comment-textarea:focus {
  border-color: #000;
  background: #ffffff;
  box-shadow: none;
}

/* ====== 底部 ====== */
.popup-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.comment-hint {
  font-size: 9px;
  color: #d9d9d9;
}

.comment-actions {
  display: flex;
  gap: 8px;
}

.comment-btn {
  min-width: 40px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-btn--ghost {
  background: transparent;
  color: #999;
  border: 1px solid #f0f0f0;
}

.comment-btn--ghost:hover {
  background: #f7f7f7;
  color: #333;
  border-color: #e0e0e0;
}

.comment-btn--primary {
  background: #000;
  color: #fff;
  border: 1px solid #000;
}

.comment-btn--primary:hover:not(:disabled) {
  background: #333;
  border-color: #333;
}

.comment-btn--primary:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ====== 响应式 ====== */
@media (max-width: 768px) {
  .selection-comment-popup {
    width: 280px;
  }

  .popup-content {
    padding: 12px 14px;
    gap: 10px;
  }

  .selected-text-preview {
    padding: 8px 10px;
    font-size: 12px;
  }

  .comment-textarea {
    padding: 8px 10px;
    font-size: 13px;
    min-height: 52px;
  }

  .comment-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
