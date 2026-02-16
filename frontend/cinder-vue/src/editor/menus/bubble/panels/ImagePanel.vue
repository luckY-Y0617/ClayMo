<!--
  ImagePanel.vue
  
  图片面板：对齐、重置大小、评论、删除
  纯 UI + 调用 editor commands，不负责定位
  
  所有外部动作通过 runActionSafely 执行
-->
<template>
  <div class="kb-image-panel" @mousedown.stop>
    <!-- 对齐按钮组 -->
    <button
      class="kb-panel-btn"
      :class="{ active: currentAlign === 'left' }"
      title="左对齐"
      @click="setAlign('left')"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <line x1="17" y1="10" x2="3" y2="10"></line>
        <line x1="21" y1="6" x2="3" y2="6"></line>
        <line x1="21" y1="14" x2="3" y2="14"></line>
        <line x1="17" y1="18" x2="3" y2="18"></line>
      </svg>
    </button>

    <button
      class="kb-panel-btn"
      :class="{ active: currentAlign === 'center' }"
      title="居中"
      @click="setAlign('center')"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="10" x2="6" y2="10"></line>
        <line x1="21" y1="6" x2="3" y2="6"></line>
        <line x1="21" y1="14" x2="3" y2="14"></line>
        <line x1="18" y1="18" x2="6" y2="18"></line>
      </svg>
    </button>

    <button
      class="kb-panel-btn"
      :class="{ active: currentAlign === 'right' }"
      title="右对齐"
      @click="setAlign('right')"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <line x1="21" y1="10" x2="7" y2="10"></line>
        <line x1="21" y1="6" x2="3" y2="6"></line>
        <line x1="21" y1="14" x2="3" y2="14"></line>
        <line x1="21" y1="18" x2="7" y2="18"></line>
      </svg>
    </button>

    <div class="kb-panel-divider"></div>

    <!-- 重置大小 -->
    <button
      class="kb-panel-btn"
      title="重置大小"
      @click="resetSize"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
      </svg>
    </button>

    <div class="kb-panel-divider"></div>

    <!-- 全屏预览 -->
    <button
      class="kb-panel-btn"
      title="全屏预览"
      @click="previewImage"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h6v6"></path>
        <path d="M9 21H3v-6"></path>
        <path d="M21 3l-7 7"></path>
        <path d="M3 21l7-7"></path>
      </svg>
    </button>

    <!-- 评论 -->
    <button
      class="kb-panel-btn"
      title="添加评论"
      @click="addComment"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    </button>

    <div class="kb-panel-divider"></div>

    <!-- 删除 -->
    <button
      class="kb-panel-btn danger"
      title="删除"
      @click="handleDelete"
    >
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
import { computed } from 'vue'

const props = defineProps({
  editor: { type: Object, required: true },
  nodeAttrs: { type: Object, default: null },
})

const emit = defineEmits(['action-start', 'delete', 'preview'])

// ============ 计算属性 ============

const currentAlign = computed(() => {
  return props.editor?.getAttributes('image')?.align || 'left'
})

// ============ 操作方法 ============

const setAlign = (value) => {
  emit('action-start')
  props.editor.chain().focus().updateAttributes('image', { align: value }).run()
}

const resetSize = () => {
  emit('action-start')
  props.editor.chain().focus().updateAttributes('image', { width: null }).run()
}

const previewImage = () => {
  const attrs = props.nodeAttrs
  if (!attrs) return
  emit('preview', {
    fileId: '',
    fileName: attrs.alt || '图片',
    fileType: 'image',
    fileSize: 0,
    fileExt: '',
    src: attrs.src,
  })
}

const addComment = () => {
  emit('action-start')
  props.editor.view?.dom?.dispatchEvent(
    new CustomEvent('add-comment-to-selection', { bubbles: true })
  )
}

const handleDelete = () => {
  emit('delete')
}
</script>

<!-- ========== 样式定义 ========== -->
<style scoped>
/* ========== 基础样式 ========== */
.kb-image-panel {
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

.kb-panel-btn.active {
  color: #3370ff;
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
  .kb-image-panel {
    max-width: calc(100vw - 32px) !important;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }
  
  .kb-image-panel::-webkit-scrollbar {
    display: none;
  }
}

@media (max-width: 480px) {
  .kb-image-panel {
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
