<template>
  <div class="kb-link-panel" @mousedown.stop>
    <!-- 链接输入框 -->
    <input
      ref="inputRef"
      v-model="linkUrl"
      type="text"
      class="link-input"
      placeholder="输入链接地址..."
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown.enter="updateLink"
      @keydown.esc="handleCancel"
    />

    <!-- 打开链接 -->
    <button
      class="kb-panel-btn"
      title="打开链接"
      :disabled="!linkUrl"
      @click="openLink"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
    </button>

    <!-- 复制链接 -->
    <button
      class="kb-panel-btn"
      title="复制链接"
      :disabled="!linkUrl"
      @click="copyLink"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>

    <div class="kb-panel-divider"></div>

    <!-- 取消链接 -->
    <button
      class="kb-panel-btn danger"
      title="取消链接"
      @click="removeLink"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
        <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"></path>
        <path d="M5.17 11.75l-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"></path>
        <line x1="8" y1="2" x2="8" y2="5"></line>
        <line x1="2" y1="8" x2="5" y2="8"></line>
        <line x1="16" y1="19" x2="16" y2="22"></line>
        <line x1="19" y1="16" x2="22" y2="16"></line>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject, watch, type Ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'

interface BubbleContext {
  isLocked: Ref<boolean>
  lockPanel?: () => void
  unlockPanel?: () => void
  safeBlurBeforeExternal?: () => void
}

interface Props {
  editor: Editor
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'action-start': []
}>()

const bubbleContext = inject<BubbleContext | null>('bubbleContext', null)

// ============ 状态 ============

const inputRef = ref<HTMLInputElement | null>(null)
const linkUrl = ref('')

// ============ 辅助函数 ============

const copyToClipboard = async (text: string) => {
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

const safeOpenNewTab = (url: string, beforeOpen?: () => void) => {
  beforeOpen?.()
  try {
    window.open(url, '_blank', 'noopener')
  } catch {
    // ignore
  }
}

// ============ 初始化 ============

const initLinkUrl = () => {
  const attrs = props.editor?.getAttributes('link')
  linkUrl.value = attrs?.href || ''
}

onMounted(() => {
  initLinkUrl()
})

watch(() => props.editor?.state?.selection, () => {
  initLinkUrl()
})

// ============ 事件处理 ============

const handleFocus = () => {
  bubbleContext?.lockPanel?.()
}

const handleBlur = () => {
  setTimeout(() => {
    bubbleContext?.unlockPanel?.()
  }, 150)
}

const handleCancel = () => {
  inputRef.value?.blur()
}

// ============ 操作方法 ============

const updateLink = () => {
  const url = linkUrl.value.trim()
  if (!url) {
    removeLink()
    return
  }

  props.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  inputRef.value?.blur()
}

const openLink = () => {
  const url = linkUrl.value
  if (!url) return

  emit('action-start')
  safeOpenNewTab(url, () => bubbleContext?.safeBlurBeforeExternal?.())
}

const copyLink = async () => {
  const url = linkUrl.value
  if (!url) return

  await copyToClipboard(url)
}

const removeLink = () => {
  props.editor.chain().focus().extendMarkRange('link').unsetLink().run()
}
</script>

<style scoped>
.kb-link-panel {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 4px 8px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
}

.link-input {
  width: 200px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #e3e3ea;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.link-input::placeholder {
  color: #b2b2c0;
}

.link-input:focus {
  border-color: #2254f4;
  box-shadow: 0 0 0 1px rgba(34, 84, 244, 0.1);
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
}

.kb-panel-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.kb-panel-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.kb-panel-btn.danger {
  color: #d14343;
}

.kb-panel-btn.danger:hover:not(:disabled) {
  background: rgba(209, 67, 67, 0.1);
}

.kb-panel-divider {
  width: 1px;
  height: 14px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 2px;
}
</style>

