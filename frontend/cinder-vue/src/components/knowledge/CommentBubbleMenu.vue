<template>
  <BubbleMenu
    v-if="editor"
    :editor="editor"
    :tippy-options="tippyOptions"
    :should-show="shouldShow"
  >
    <div class="comment-card" @mousedown.stop>
      <!-- 选中文字预览 -->
      <div v-if="previewText" class="comment-card__preview">
        <span class="comment-card__preview-bar"></span>
        <span class="comment-card__preview-text">
          {{ previewText }}
        </span>
      </div>

      <!-- 评论输入框 -->
      <textarea
        v-model="draft"
        class="comment-card__textarea"
        rows="3"
        placeholder="针对此处添加评论…"
      ></textarea>

      <!-- 底部按钮 -->
      <div class="comment-card__footer">
        <button
          type="button"
          class="comment-btn comment-btn--ghost"
          @click="cancel"
        >
          取消
        </button>
        <button
          type="button"
          class="comment-btn comment-btn--primary"
          :disabled="!draft.trim()"
          @click="submit"
        >
          发送
        </button>
      </div>
    </div>
  </BubbleMenu>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { BubbleMenu } from '@tiptap/vue-3'
import { buildRangeAnchorFromSelection } from '@/utils/commentAnchor'

const props = defineProps({
  editor: { type: Object, required: true },
})

/**
 * emit: { content, parentId?, position }
 */
const emit = defineEmits(['submit'])

const lastFrom = ref(null)
const lastTo = ref(null)
const draft = ref('')
const previewText = ref('')

/**
 * ========== Tippy配置 - 响应式适配 ==========
 */
const tippyOptions = computed(() => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const isMobile = vw <= 768
  
  return {
    maxWidth: isMobile ? vw - 32 : 'none',
    placement: 'top',
    offset: [0, 8],
    theme: 'comment-bubble',
    popperOptions: {
      strategy: 'fixed',
      modifiers: [
        {
          name: 'preventOverflow',
          options: {
            padding: isMobile ? 16 : 8,
          },
        },
        {
          name: 'flip',
          options: {
            fallbackPlacements: ['bottom', 'top'],
          },
        },
      ],
    },
  }
})

/** 只要有选区且编辑器聚焦，就显示气泡；
 * 但在我们临时抑制（如打开 Lightbox）时不显示，且避免图片节点选中时弹出 */
const shouldShow = ({ editor }) => {
  try {
    if (typeof window !== 'undefined' && window.__kb_suppress_comment) return false
  } catch (err) { /* ignore */ }

  if (!editor || !editor.isFocused) return false
  const sel = editor.state.selection
  if (!sel || sel.empty) return false

  // 如果是 node selection（选中了整个节点），并且节点是 image，禁止评论气泡
  if (sel.node && sel.node.type && sel.node.type.name === 'image') return false

  // 如果选区起点紧跟一个 image 节点，也不要弹出（保护图片上/下方触发的情况）
  const $from = sel.$from
  const nodeAfter = $from.nodeAfter
  if (nodeAfter && nodeAfter.type && nodeAfter.type.name === 'image') return false

  return true
}

/** 更新选区预览文本 */
const updatePreviewFromSelection = ({ editor }) => {
  if (!editor) return
  
  const { from, to } = editor.state.selection
  
  if (from === to) {
    previewText.value = ''
    return
  }
  
  lastFrom.value = from
  lastTo.value = to
  
  // 获取选中的文本并处理预览
  const text = editor.state.doc.textBetween(from, to, ' ').trim()
  previewText.value = text ? (text.length > 80 ? `${text.slice(0, 80)}…` : text) : ''
}

/** 收起选区，让 BubbleMenu 消失 */
const collapseSelection = () => {
  const editor = props.editor
  if (!editor) return
  editor.commands.setTextSelection(editor.state.selection.to)
}

/** 取消 */
const cancel = () => {
  draft.value = ''
  previewText.value = ''
  lastFrom.value = null
  lastTo.value = null
  collapseSelection()
}

/** 提交 */
const submit = async () => {
  const editor = props.editor
  if (!editor) return

  const content = draft.value.trim()
  if (!content) return

  const from = lastFrom.value ?? editor.state.selection.from
  const to = lastTo.value ?? editor.state.selection.to
  if (!from || !to || from === to) return

  // ✅ 统一：由 commentAnchor.js 构建 position（与重定位同口径）
  const { position, error } = buildRangeAnchorFromSelection(editor, from, to, {
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
  cancel()
}

onMounted(() => {
  if (!props.editor) return
  props.editor.on('selectionUpdate', updatePreviewFromSelection)
})

onBeforeUnmount(() => {
  if (!props.editor) return
  props.editor.off('selectionUpdate', updatePreviewFromSelection)
})
</script>

<style scoped>
/* 去掉 tippy 默认黑底和阴影，只保留我们自己的卡片 */
:global(.tippy-box[data-theme~='comment-bubble']) {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
}

:global(.tippy-box[data-theme~='comment-bubble'] > .tippy-arrow) {
  color: transparent !important;
}

/* ========== 评论卡片主体 ========== */
.comment-card {
  width: 320px;
  max-width: 360px;
  padding: 10px 12px 8px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(223, 224, 230, 0.9);
  box-shadow: 0 8px 20px rgba(15, 15, 30, 0.12);
  animation: comment-pop 0.14s ease-out;
  box-sizing: border-box;
}

/* 选中文本预览区域 */
.comment-card__preview {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary, #666);
  padding: 6px 8px;
  margin-bottom: 6px;
  border-radius: 8px;
  background: #f7f7f7;
}

.comment-card__preview-bar {
  width: 2px;
  border-radius: 999px;
  align-self: stretch;
  background: var(--yuque-primary, #2254f4);
}

.comment-card__preview-text {
  flex: 1;
  word-break: break-word;
}

/* 输入框 */
.comment-card__textarea {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid #e3e3ea;
  background: #ffffff;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #333);
  resize: none;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.comment-card__textarea::placeholder {
  color: var(--text-tertiary, #b2b2c0);
}

.comment-card__textarea:focus {
  border-color: var(--yuque-primary, #2254f4);
  box-shadow: 0 0 0 1px rgba(34, 84, 244, 0.08);
  background: #fffdfa;
}

/* 底部操作区 */
.comment-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

/* 按钮样式（自定义，不依赖 Element） */
.comment-btn {
  min-width: 56px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  background: transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

/* 取消按钮：弱一点 */
.comment-btn--ghost {
  color: var(--text-secondary, #666);
}

.comment-btn--ghost:hover {
  background: #f5f5f7;
}

/* 发送按钮：主色，但不要太艳 */
.comment-btn--primary {
  background: var(--yuque-primary, #2254f4);
  color: #fff;
  border-color: var(--yuque-primary, #2254f4);
}

.comment-btn--primary:hover:not(:disabled) {
  background: #1c46cd;
  border-color: #1c46cd;
}

.comment-btn--primary:disabled {
  opacity: 0.5;
  cursor: default;
}

/* 弹出时的小动画：轻微上移 + 缩放 */
@keyframes comment-pop {
  0% {
    opacity: 0;
    transform: translateY(4px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ========== 移动端响应式适配 ========== */
@media (max-width: 768px) {
  .comment-card {
    width: auto !important;
    min-width: 280px;
    max-width: calc(100vw - 32px) !important;
  }
}

@media (max-width: 480px) {
  .comment-card {
    min-width: 240px;
    max-width: calc(100vw - 24px) !important;
    padding: 8px 10px 6px;
  }
  
  .comment-card__textarea {
    font-size: 12px;
    padding: 5px 7px;
  }
  
  .comment-btn {
    min-width: 48px;
    padding: 3px 8px;
    font-size: 11px;
  }
}

/* 小屏优化 */
@media (max-width: 375px) {
  .comment-card {
    max-width: calc(100vw - 16px) !important;
    padding: 6px 8px 5px;
  }
}
</style>