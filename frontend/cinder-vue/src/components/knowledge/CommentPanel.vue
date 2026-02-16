<template>
  <!-- 遮罩层 -->
  <transition name="fade">
    <div v-if="visible" class="comment-drawer-mask" @click.self="handleClose"></div>
  </transition>

  <!-- Drawer 侧栏 -->
  <transition name="slide-right">
    <div v-if="visible" class="comment-drawer" @click.stop>
      <div class="comment-panel-content">
        <!-- 头部 - 固定标题区域 -->
        <div class="comment-panel-header">
          <div class="header-title">
            <span class="header-text">评论</span>
            <span class="comment-count-badge" v-if="comments.length > 0">
              {{ comments.length }}
            </span>
          </div>
          <button class="close-btn" type="button" @click="handleClose" title="关闭">
            ×
          </button>
        </div>
        <div class="header-divider"></div>

        <!-- 评论列表 -->
        <div class="comment-list" ref="commentListRef">
          <el-scrollbar>
            <div v-if="loading" class="loading-state">
              <el-skeleton animated :rows="3" />
            </div>

            <el-empty v-else-if="comments.length === 0" description="暂无评论" :image-size="80">
              <p class="hint">选中文字后，可添加评论</p>
            </el-empty>

            <div v-else class="comment-threads">
              <div v-for="comment in comments" :key="comment.id" class="comment-thread"
                :class="{ active: activeCommentId === comment.id }" :data-comment-id="comment.id"
                @mouseenter="handleCommentHover(comment)" @mouseleave="handleCommentLeave">
                <!-- 用户信息 -->
                <div class="comment-header">
                  <div class="comment-avatar">
                    <div class="avatar-circle">
                      {{ (comment.author?.name || '匿名').slice(0, 1) }}
                    </div>
                  </div>
                  <div class="comment-meta">
                    <span class="author">{{ comment.author?.name || '匿名' }}</span>
                    <span class="time">{{ formatRelative(comment.createdAt) }}</span>
                  </div>
                </div>

                <!-- 引用原文（如果有） -->
                <div v-if="comment.position && comment.position.type === 'range'" class="comment-quote"
                  @click.stop="handleQuoteClick(comment)">
                  <div class="quote-indicator"></div>
                  <div class="quote-text">
                    <span class="quote-label">引用原文:</span>

                    <span class="quote-content"
                      :class="{ 'quote-missing': getQuoteInfo(comment)?.status === 'missing' }">
                      {{ getQuoteInfo(comment)?.text || '原文已删除' }}
                    </span>
                  </div>
                </div>


                <!-- 评论内容 -->
                <p class="comment-text">{{ comment.content }}</p>

                <!-- 操作按钮 -->
                <div class="comment-actions">
                  <el-button size="small" text class="action-btn" @click.stop="handleReply(comment)">
                    回复
                  </el-button>
                  <el-popconfirm title="确定要删除这条评论吗？" confirm-button-text="删除" cancel-button-text="取消"
                    @confirm="handleDelete(comment)">
                    <template #reference>
                      <el-button size="small" text class="action-btn delete-btn" @click.stop>
                        删除
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>

                <!-- 回复列表 - 简化设计 -->
                <div v-if="isExpanded(comment.id) && comment.replies?.length" class="comment-replies">
                  <div v-for="reply in comment.replies" :key="reply.id" class="comment-reply">
                    <div class="comment-header">
                      <div class="comment-avatar">
                        <div class="avatar-circle small">
                          {{ (reply.author?.name || '匿名').slice(0, 1) }}
                        </div>
                      </div>
                      <div class="comment-meta">
                        <span class="author">{{ reply.author?.name || '匿名' }}</span>
                        <span class="time">{{ formatRelative(reply.createdAt) }}</span>
                      </div>
                    </div>
                    <p class="comment-text">{{ reply.content }}</p>
                  </div>
                </div>

                <!-- 展开/折叠回复按钮 -->
                <div v-if="comment.replies?.length > 0" class="reply-toggle" @click="toggleReplies(comment.id)">
                  <el-icon>
                    <component :is="isExpanded(comment.id) ? 'ArrowUp' : 'ArrowDown'" />
                  </el-icon>
                  <span>{{ isExpanded(comment.id) ? '收起' : `展开 ${comment.replies.length} 条回复` }}</span>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </div>

        <!-- 输入框 -->
        <div class="comment-input">
          <el-input v-model="draft" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="输入评论内容..."
            @keydown.ctrl.enter="handleSubmit" />
          <div class="input-actions">
            <button class="text-btn" type="button" @click="draft = ''">清空</button>
            <button class="primary-btn" type="button" :disabled="!draft.trim()" @click="handleSubmit">
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount, inject } from 'vue'
import { formatDistanceToNowStrict } from 'date-fns'
import { locateRangeAnchor } from '@/utils/commentAnchor'
import { zhCN } from 'date-fns/locale'

const props = defineProps({
  comments: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'submit',
  'refresh',
  'locate',
  'reply',
  'delete',
  'hover',
  'close',
  'update:visible',
  'like',
])

const draft = ref('')
const commentListRef = ref(null)
const activeCommentId = ref(null)
const expandedReplies = ref(new Set())
const editorSession = inject('editorSession')

const formatRelative = (value) => {
  if (!value) return ''
  return formatDistanceToNowStrict(new Date(value), {
    locale: zhCN,
    addSuffix: true,
  })
}

const handleSubmit = () => {
  if (!draft.value.trim()) return
  emit('submit', draft.value.trim())
  draft.value = ''
}

const handleReply = (comment) => {
  emit('reply', comment)
}

const handleLocate = (comment) => {
  emit('locate', comment)
  activeCommentId.value = comment.id
  scrollToComment(comment.id)
  setTimeout(() => {
    activeCommentId.value = null
  }, 2000)
}

// 点击引用原文，跳转并收起侧栏
const handleQuoteClick = (comment) => {
  handleLocate(comment)
  // 延迟一下再关闭，确保跳转完成
  setTimeout(() => {
    handleClose()
  }, 300)
}

const handleDelete = (comment) => {
  emit('delete', comment)
}

const handleCommentHover = (comment) => {
  emit('hover', comment)
}

const handleCommentLeave = () => {
  emit('hover', null)
}

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// 获取引用原文内容
const truncate = (s, n = 50) => {
  const t = (s || '').trim()
  if (!t) return ''
  return t.length > n ? t.slice(0, n) + '...' : t
}

/**
 * 返回结构：
 * - { status: 'ok', text: '...' }       能定位到当前文档，显示实时引用
 * - { status: 'missing', text: '...' }  锚点失效，显示“原文已删除”
 * - null                                没有 position，不显示引用块
 */
const getQuoteInfo = (comment) => {
  if (!comment?.position) return null
  if (comment.position.type !== 'range') return null

  const editor = editorSession?.editor?.value
  // 没有 editor（极端情况）：也不做定位，直接按“失效”处理
  if (!editor) {
    return { status: 'missing', text: '原文已删除' }
  }

  // ✅ 用新协议重定位
  const loc = locateRangeAnchor(editor, comment.position)

  // 定位失败：锚点失效
  if (!loc) {
    return { status: 'missing', text: '原文已删除' }
  }

  try {
    const state = editor.state
    const from = Math.max(0, loc.from)
    const to = Math.min(loc.to, state.doc.content.size)
    if (to <= from) return { status: 'missing', text: '原文已删除' }

    const liveText = state.doc.textBetween(from, to, ' ')
    const trimmed = (liveText || '').trim()

    // 有些情况下能定位，但文本为空（例如被替换成空/不可见）——仍按 missing 处理
    if (!trimmed) {
      return { status: 'missing', text: '原文已删除' }
    }

    return { status: 'ok', text: truncate(trimmed, 50) }
  } catch (e) {
    console.error('获取引用原文失败:', e)
    return { status: 'missing', text: '原文已删除' }
  }
}


const isExpanded = (commentId) => expandedReplies.value.has(commentId)

const toggleReplies = (commentId) => {
  const set = new Set(expandedReplies.value)
  if (set.has(commentId)) {
    set.delete(commentId)
  } else {
    set.add(commentId)
  }
  expandedReplies.value = set
}

// 滚动到指定评论
const scrollToComment = (commentId) => {
  nextTick(() => {
    const element = commentListRef.value?.querySelector(
      `[data-comment-id="${commentId}"]`
    )
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  })
}

// 外部触发滚动到某条评论
const handleCommentNavigate = (event) => {
  const { commentId } = event.detail || {}
  if (!commentId) return

  if (!props.visible) {
    emit('update:visible', true)
  }

  nextTick(() => {
    scrollToComment(commentId)
    activeCommentId.value = commentId
    setTimeout(() => {
      activeCommentId.value = null
    }, 2000)
  })
}

// 监听 visible 变化
watch(
  () => props.visible,
  (newVal) => {
    if (newVal && activeCommentId.value) {
      nextTick(() => {
        scrollToComment(activeCommentId.value)
      })
    }
  }
)

// ESC 关闭
const handleEsc = (e) => {
  if (e.key === 'Escape' && props.visible) {
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('comment-navigate', handleCommentNavigate)
  window.addEventListener('keydown', handleEsc)
})

onBeforeUnmount(() => {
  window.removeEventListener('comment-navigate', handleCommentNavigate)
  window.removeEventListener('keydown', handleEsc)
})

// 暴露方法
defineExpose({
  scrollToComment,
  setActiveComment: (commentId) => {
    activeCommentId.value = commentId
  },
})
</script>
<style scoped>
/* 遮罩层 - 半透明浅灰，不模糊，保持主界面清晰 */
.comment-drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  z-index: 998;
  /* 移除模糊效果，保持主界面清晰 */
}

/* Drawer 侧栏 - 右侧滑出 */
.comment-drawer {
  position: fixed;
  inset: 0 0 0 auto;
  width: 390px;
  max-width: 90vw;
  background: #ffffff;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: -2px 0 16px rgba(0, 0, 0, 0.08);
  z-index: 999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 遮罩层过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-normal) var(--ease-standard);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Drawer 滑入动画 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform var(--transition-normal) var(--ease-decelerate);
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

/* 面板内容 */
.comment-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.comment-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: transparent;
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.comment-count-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--yuque-primary, #ff7a45);
  color: #fff;
  border-radius: 999px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 18px;
  line-height: 1;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast) var(--ease-standard),
    color var(--transition-fast) var(--ease-standard),
    transform var(--transition-fast) var(--ease-standard);
}

.close-btn:hover {
  background-color: rgba(0, 0, 0, 0.04);
  color: var(--text-primary);
  transform: rotate(90deg);
}

.header-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0;
}

/* 评论列表 */
.comment-list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.comment-list :deep(.el-scrollbar) {
  height: 100%;
}

.comment-list :deep(.el-scrollbar__wrap) {
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.comment-list :deep(.el-scrollbar__bar) {
  opacity: 0.6;
}

.loading-state {
  padding: 20px 0;
}

.hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

/* 评论线程 */
.comment-threads {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.comment-thread {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: transparent;
  transition: background-color var(--transition-fast) var(--ease-standard);
}

.comment-thread:hover {
  background: rgba(0, 0, 0, 0.02);
}

.comment-thread.active {
  background: rgba(22, 93, 255, 0.06);
  border-left: 2px solid var(--yuque-primary);
}

/* 用户信息头部 */
.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.comment-avatar {
  flex-shrink: 0;
}

/* 头像圆形占位 */
.avatar-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
  flex-shrink: 0;
}

.avatar-circle.small {
  width: 22px;
  height: 22px;
  font-size: 11px;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
  flex: 1;
}

.comment-meta .author {
  font-weight: 600;
  color: var(--text-primary);
}

.comment-meta .time {
  color: var(--text-tertiary);
}

/* 引用原文 */
.comment-quote {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px 0 10px 0;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color var(--transition-fast) var(--ease-standard);
}

.comment-quote:hover {
  background: rgba(22, 93, 255, 0.08);
}

.quote-indicator {
  width: 2px;
  border-radius: 1px;
  background: rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  margin-top: 2px;
}

.quote-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  line-height: 1.5;
  min-width: 0;
}

.quote-label {
  color: var(--text-tertiary);
  font-weight: 500;
  font-size: 11px;
}

.quote-content {
  color: var(--text-secondary);
  word-break: break-word;
  line-height: 1.5;
}

.comment-text {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-word;
}

/* 操作区域 - 轻量化设计 */
.comment-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.action-btn {
  padding: 4px 8px !important;
  font-size: 12px !important;
  min-height: 24px;
  border-radius: 6px !important;
  background-color: transparent !important;
  border: none !important;
  color: var(--text-tertiary) !important;
  transition: all var(--transition-fast) var(--ease-standard);
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
}

.action-btn:hover {
  background-color: rgba(0, 0, 0, 0.04) !important;
  color: var(--text-secondary) !important;
}

.delete-btn {
  color: rgba(245, 63, 63, 0.8) !important;
}

.comment-thread:not(:hover) .delete-btn {
  opacity: 0.4;
}

.comment-thread:hover .delete-btn {
  opacity: 1;
}

/* 回复列表 - 简化设计 */
.comment-replies {
  margin-top: 10px;
  margin-left: 42px;
  padding-left: 10px;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-reply {
  padding-top: 8px;
}

.comment-reply .comment-header {
  margin-bottom: 6px;
}

.comment-reply .comment-text {
  font-size: 12px;
  margin: 0 0 6px;
  padding-left: 0;
}

.comment-reply .comment-meta {
  font-size: 11px;
}

/* 展开/折叠回复 */
.reply-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  margin-left: 42px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 4px;
  transition: all var(--transition-fast) var(--ease-standard);
}

.reply-toggle:hover {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-secondary);
}

/* 输入区域 - 底部固定，背景略微加深 */
.comment-input {
  padding: 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(247, 248, 252, 0.8);
  flex-shrink: 0;
}

.comment-input :deep(.el-textarea__inner) {
  border-radius: 8px;
  font-size: 13px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #ffffff;
}

.comment-input :deep(.el-textarea__inner):focus {
  border-color: var(--yuque-primary);
}

/* 输入操作按钮 */
.input-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.text-btn,
.primary-btn {
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  font-family: inherit;
  transition: all var(--transition-fast) var(--ease-standard);
}

.text-btn {
  color: var(--text-tertiary);
}

.text-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-secondary);
}

.primary-btn {
  background: var(--yuque-primary);
  color: #fff;
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-btn:not(:disabled):hover {
  background: #0e4dc4;
}
</style>
