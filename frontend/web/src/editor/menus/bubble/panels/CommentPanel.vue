<template>
  <div class="kb-comment-panel" @mousedown="handleMouseDown">
    <!-- 选中文字预览 -->
    <div v-if="previewText" class="comment-preview">
      <span class="comment-preview-bar"></span>
      <span class="comment-preview-text">{{ previewText }}</span>
    </div>

    <!-- 评论输入框 -->
    <textarea
      ref="textareaRef"
      v-model="draft"
      class="comment-textarea"
      rows="2"
      placeholder="添加评论…"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown.ctrl.enter="handleSubmit"
      @keydown.meta.enter="handleSubmit"
    ></textarea>

    <!-- 底部按钮 -->
    <div class="comment-footer">
      <span class="comment-hint">Ctrl+Enter 发送</span>
      <div class="comment-actions">
        <button
          type="button"
          class="comment-btn comment-btn--ghost"
          @click="handleCancel"
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
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { buildRangeAnchorFromSelection } from '@/utils/commentAnchor'

interface Props {
  editor: Editor
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [payload: { content: string; parentId: null; position: unknown }]
  cancel: []
  lock: []
  unlock: []
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const draft = ref('')
const previewText = ref('')
const lastFrom = ref<number | null>(null)
const lastTo = ref<number | null>(null)

// ============ 选区预览 ============

const updatePreviewFromSelection = () => {
  if (!props.editor) return

  const { from, to } = props.editor.state.selection

  if (from === to) {
    previewText.value = ''
    return
  }

  lastFrom.value = from
  lastTo.value = to

  const text = props.editor.state.doc.textBetween(from, to, ' ').trim()
  previewText.value = text ? (text.length > 80 ? `${text.slice(0, 80)}…` : text) : ''
}

// ============ 事件处理 ============

const handleMouseDown = (e: MouseEvent) => {
  e.stopPropagation()
  emit('lock')
}

const handleFocus = () => {
  emit('lock')
}

const handleBlur = () => {
  setTimeout(() => {
    emit('unlock')
  }, 150)
}

const handleCancel = () => {
  draft.value = ''
  previewText.value = ''
  lastFrom.value = null
  lastTo.value = null

  if (props.editor) {
    props.editor.commands.setTextSelection(props.editor.state.selection.to)
  }

  emit('cancel')
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

  draft.value = ''
  previewText.value = ''
  lastFrom.value = null
  lastTo.value = null
}

// ============ 自动聚焦 ============

const focusTextarea = () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  })
}

// ============ 生命周期 ============

onMounted(() => {
  if (!props.editor) return
  props.editor.on('selectionUpdate', updatePreviewFromSelection)
  updatePreviewFromSelection()
  focusTextarea()
})

onBeforeUnmount(() => {
  if (!props.editor) return
  props.editor.off('selectionUpdate', updatePreviewFromSelection)
})

watch(() => props.editor, (ed) => {
  if (ed) {
    focusTextarea()
  }
}, { immediate: true })
</script>

<style scoped>
.kb-comment-panel {
  width: 300px;
  max-width: 340px;
  padding: 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.comment-preview {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #666;
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: #f8f9fa;
}

.comment-preview-bar {
  width: 3px;
  border-radius: 2px;
  align-self: stretch;
  min-height: 14px;
  background: #3b82f6;
}

.comment-preview-text {
  flex: 1;
  word-break: break-word;
  color: #333;
}

.comment-textarea {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  font-size: 13px;
  line-height: 1.5;
  color: #1a1a1a;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.comment-textarea::placeholder {
  color: #9ca3af;
}

.comment-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.comment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-hint {
  font-size: 11px;
  color: #9ca3af;
}

.comment-actions {
  display: flex;
  gap: 6px;
}

.comment-btn {
  min-width: 52px;
  padding: 5px 12px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  transition: all 0.15s ease;
}

.comment-btn--ghost {
  background: transparent;
  color: #666;
}

.comment-btn--ghost:hover {
  background: #f3f4f6;
  color: #333;
}

.comment-btn--primary {
  background: #3b82f6;
  color: #fff;
}

.comment-btn--primary:hover:not(:disabled) {
  background: #2563eb;
}

.comment-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

