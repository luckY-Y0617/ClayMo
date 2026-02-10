<template>
  <!-- 遮罩层 -->
  <transition name="fade">
    <div v-if="visible" class="comment-drawer-mask" @click.self="handleClose"></div>
  </transition>

  <!-- Drawer 侧栏 -->
  <transition name="slide-right">
    <div v-if="visible" class="comment-drawer" @click.stop>
      <div class="comment-panel-content">
        <!-- 头部 -->
        <div class="comment-panel-header">
          <div class="header-title">
            <span class="header-text">评论</span>
            <span class="comment-count-badge" v-if="comments.length > 0">
              {{ comments.length }}
            </span>
          </div>
          <button class="close-btn" type="button" @click="handleClose" title="关闭">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- 评论列表 -->
        <div class="comment-list" ref="commentListRef">
          <el-scrollbar>
            <div v-if="loading" class="loading-state">
              <el-skeleton animated :rows="3" />
            </div>

            <div v-else-if="comments.length === 0" class="empty-state">
              <div class="empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p class="empty-text">暂无评论</p>
              <p class="empty-hint">选中文字后可添加评论</p>
            </div>

            <div v-else class="comment-threads">
              <div
                v-for="comment in comments"
                :key="comment.id"
                class="comment-thread"
                :class="{ active: activeCommentId === comment.id }"
                :data-comment-id="comment.id"
                @mouseenter="handleCommentHover(comment)"
                @mouseleave="handleCommentLeave"
              >
                <!-- 主评论 -->
                <div class="comment-main">
                  <div class="comment-avatar-col">
                    <div class="avatar-circle">
                      {{ (comment.author?.name || '匿名').slice(0, 1) }}
                    </div>
                  </div>
                  <div class="comment-body">
                    <div class="comment-meta-row">
                      <span class="author-name">{{ comment.author?.name || '匿名' }}</span>
                      <span class="meta-dot">·</span>
                      <span class="time-text">{{ formatRelative(comment.createdAt) }}</span>
                    </div>

                    <!-- 引用原文 -->
                    <div
                      v-if="comment.position && comment.position.type === 'range'"
                      class="comment-quote"
                      @click.stop="handleQuoteClick(comment)"
                    >
                      <span class="quote-content" :class="{ 'quote-missing': getQuoteInfo(comment)?.status === 'missing' }">
                        {{ getQuoteInfo(comment)?.text || '原文已删除' }}
                      </span>
                    </div>

                    <!-- 评论文本 -->
                    <p class="comment-text">{{ comment.content }}</p>

                    <!-- 操作栏 -->
                    <div class="comment-actions">
                      <button
                        v-if="canCreateComment"
                        class="action-btn"
                        :class="{ 'action-btn--active': replyingTo === comment.id }"
                        @click.stop="toggleReplyInput(comment.id)"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        回复
                      </button>
                      <button v-if="canLikeComment" class="action-btn" @click.stop="handleLike(comment)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                        </svg>
                        {{ (comment.likeCount || 0) > 0 ? comment.likeCount : '' }}
                      </button>
                      <el-popconfirm
                        v-if="canDeleteComment"
                        title="确定删除这条评论？"
                        confirm-button-text="删除"
                        cancel-button-text="取消"
                        @confirm="handleDelete(comment)"
                      >
                        <template #reference>
                          <button class="action-btn action-btn--danger" @click.stop>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </template>
                      </el-popconfirm>
                    </div>
                  </div>
                </div>

                <!-- 内联回复输入框 -->
                <transition name="reply-slide">
                  <div v-if="replyingTo === comment.id" class="inline-reply-box">
                    <input
                      v-model="replyDraft"
                      class="reply-input"
                      :placeholder="`回复 ${comment.author?.name || '匿名'}...`"
                      @keydown.enter.exact="submitReply(comment)"
                      @keydown.esc="cancelReply"
                    />
                    <div class="reply-actions">
                      <button class="reply-cancel" @click="cancelReply">取消</button>
                      <button
                        class="reply-send"
                        :disabled="!replyDraft.trim()"
                        @click="submitReply(comment)"
                      >发送</button>
                    </div>
                  </div>
                </transition>

                <!-- 回复列表 -->
                <div v-if="comment.replies && comment.replies.length > 0" class="replies-section">
                  <button class="reply-toggle-btn" @click="toggleReplies(comment.id)">
                    <svg :class="{ expanded: isExpanded(comment.id) }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    {{ isExpanded(comment.id) ? '收起' : `${comment.replies.length} 条回复` }}
                  </button>

                  <transition name="replies-expand">
                    <div v-if="isExpanded(comment.id)" class="reply-list">
                      <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                        <div class="reply-avatar-col">
                          <div class="avatar-circle small">
                            {{ (reply.author?.name || '匿名').slice(0, 1) }}
                          </div>
                        </div>
                        <div class="reply-body">
                          <div class="comment-meta-row">
                            <span class="author-name">{{ reply.author?.name || '匿名' }}</span>
                            <span class="meta-dot">·</span>
                            <span class="time-text">{{ formatRelative(reply.createdAt) }}</span>
                          </div>
                          <p class="reply-text">{{ reply.content }}</p>
                        </div>
                      </div>
                    </div>
                  </transition>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount, inject, type Ref } from 'vue'
import { ElScrollbar, ElSkeleton, ElPopconfirm } from 'element-plus'
import { formatDistanceToNowStrict } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Editor } from '@tiptap/vue-3'

import { locateRangeAnchor, type RangeAnchorPosition } from '@/utils/commentAnchor'
import type { Comment } from '@/types/editor'

interface EditorSession {
  editor: Ref<Editor | null>
}

interface Props {
  comments: Comment[]
  loading?: boolean
  visible?: boolean
  canCreateComment?: boolean
  canDeleteComment?: boolean
  canLikeComment?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  comments: () => [],
  loading: false,
  visible: false,
  canCreateComment: true,
  canDeleteComment: true,
  canLikeComment: true,
})

const emit = defineEmits<{
  submit: [text: string]
  refresh: []
  locate: [comment: Comment]
  reply: [comment: Comment & { replyContent: string }]
  delete: [comment: Comment]
  hover: [comment: Comment | null]
  close: []
  'update:visible': [value: boolean]
  like: [comment: Comment]
}>()

const commentListRef = ref<HTMLElement | null>(null)
const activeCommentId = ref<string | null>(null)
const expandedReplies = ref(new Set<string>())
const editorSession = inject<EditorSession>('editorSession')

// 内联回复状态
const replyingTo = ref<string | null>(null)
const replyDraft = ref('')

const formatRelative = (value: string | undefined): string => {
  if (!value) return ''
  return formatDistanceToNowStrict(new Date(value), {
    locale: zhCN,
    addSuffix: true,
  })
}

// 切换内联回复输入框
const toggleReplyInput = (commentId: string): void => {
  if (replyingTo.value === commentId) {
    cancelReply()
    return
  }
  replyingTo.value = commentId
  replyDraft.value = ''
  nextTick(() => {
    const inputs = document.querySelectorAll('.reply-input')
    const lastInput = inputs[inputs.length - 1] as HTMLInputElement | undefined
    if (lastInput) lastInput.focus()
  })
}

// 提交回复
const submitReply = (comment: Comment): void => {
  if (!replyDraft.value.trim()) return
  emit('reply', { ...comment, replyContent: replyDraft.value.trim() })
  replyDraft.value = ''
  replyingTo.value = null
}

// 取消回复
const cancelReply = (): void => {
  replyingTo.value = null
  replyDraft.value = ''
}

const handleLocate = (comment: Comment): void => {
  emit('locate', comment)
  activeCommentId.value = comment.id
  scrollToComment(comment.id)
  setTimeout(() => {
    activeCommentId.value = null
  }, 2000)
}

const handleQuoteClick = (comment: Comment): void => {
  handleLocate(comment)
  setTimeout(() => {
    handleClose()
  }, 300)
}

const handleDelete = (comment: Comment): void => {
  emit('delete', comment)
}

const handleLike = (comment: Comment): void => {
  emit('like', comment)
}

const handleCommentHover = (comment: Comment): void => {
  emit('hover', comment)
}

const handleCommentLeave = (): void => {
  emit('hover', null)
}

const handleClose = (): void => {
  replyingTo.value = null
  replyDraft.value = ''
  emit('update:visible', false)
  emit('close')
}

// 获取引用原文内容
const truncate = (s: string | undefined | null, n = 50): string => {
  const t = (s || '').trim()
  if (!t) return ''
  return t.length > n ? t.slice(0, n) + '...' : t
}

interface QuoteInfo {
  status: 'ok' | 'missing'
  text: string
}

const getQuoteInfo = (comment: Comment): QuoteInfo | null => {
  if (!comment?.position) return null
  if (comment.position.type !== 'range') return null

  const editor = editorSession?.editor?.value
  if (!editor) {
    return { status: 'missing', text: '原文已删除' }
  }

  const loc = locateRangeAnchor(editor, comment.position as RangeAnchorPosition)
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

    if (!trimmed) {
      return { status: 'missing', text: '原文已删除' }
    }

    return { status: 'ok', text: truncate(trimmed, 50) }
  } catch {
    return { status: 'missing', text: '原文已删除' }
  }
}

const isExpanded = (commentId: string): boolean => expandedReplies.value.has(commentId)

const toggleReplies = (commentId: string): void => {
  const set = new Set(expandedReplies.value)
  if (set.has(commentId)) {
    set.delete(commentId)
  } else {
    set.add(commentId)
  }
  expandedReplies.value = set
}

const scrollToComment = (commentId: string): void => {
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

const handleCommentNavigate = (event: CustomEvent<{ commentId: string }>): void => {
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

watch(
  () => props.visible,
  (newVal) => {
    if (newVal && activeCommentId.value) {
      nextTick(() => {
        scrollToComment(activeCommentId.value!)
      })
    }
    if (!newVal) {
      replyingTo.value = null
      replyDraft.value = ''
    }
  }
)

const handleEsc = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && props.visible) {
    if (replyingTo.value) {
      cancelReply()
    } else {
      handleClose()
    }
  }
}

onMounted(() => {
  window.addEventListener('comment-navigate', handleCommentNavigate as EventListener)
  window.addEventListener('keydown', handleEsc)
})

onBeforeUnmount(() => {
  window.removeEventListener('comment-navigate', handleCommentNavigate as EventListener)
  window.removeEventListener('keydown', handleEsc)
})

defineExpose({
  scrollToComment,
  setActiveComment: (commentId: string) => {
    activeCommentId.value = commentId
  },
})
</script>

<style scoped>
/* ====== 遮罩层 ====== */
.comment-drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 998;
}

/* ====== Drawer 侧栏 ====== */
.comment-drawer {
  position: fixed;
  inset: 0 0 0 auto;
  width: 360px;
  max-width: 90vw;
  background: #fff;
  border-left: 1px solid #111;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.10);
  z-index: 999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

/* ====== 面板内容 ====== */
.comment-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ====== 头部 ====== */
.comment-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #111;
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-text {
  font-size: 13px;
  font-weight: 700;
  color: #111;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.comment-count-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  background: #111;
  color: #fff;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #111;
}

/* ====== 评论列表 ====== */
.comment-list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.comment-list :deep(.el-scrollbar) {
  height: 100%;
}

.comment-list :deep(.el-scrollbar__wrap) {
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #ccc;
}

.empty-icon {
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #999;
}

.empty-hint {
  margin: 4px 0 0;
  font-size: 11px;
  color: #ccc;
}

.loading-state {
  padding: 16px;
}

/* ====== 评论卡片 ====== */
.comment-threads {
  display: flex;
  flex-direction: column;
}

.comment-thread {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.12s ease;
}

.comment-thread:last-child {
  border-bottom: none;
}

.comment-thread:hover {
  background: #fafafa;
}

.comment-thread.active {
  background: #f5f5f5;
  border-left: 2px solid #111;
  padding-left: 14px;
}

/* ====== 主评论布局 ====== */
.comment-main {
  display: flex;
  gap: 10px;
}

.comment-avatar-col {
  flex-shrink: 0;
  padding-top: 1px;
}

.avatar-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #1a1a1a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.avatar-circle.small {
  width: 20px;
  height: 20px;
  font-size: 9px;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

/* ====== 元信息 ====== */
.comment-meta-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 3px;
}

.author-name {
  font-size: 12px;
  font-weight: 600;
  color: #111;
}

.meta-dot {
  font-size: 10px;
  color: #ccc;
}

.time-text {
  font-size: 11px;
  color: #aaa;
}

/* ====== 引用原文 ====== */
.comment-quote {
  margin: 3px 0 5px;
  padding: 3px 8px;
  background: #f5f5f5;
  border-left: 2px solid #ccc;
  border-radius: 0 3px 3px 0;
  cursor: pointer;
  transition: all 0.12s ease;
}

.comment-quote:hover {
  background: #eee;
  border-left-color: #111;
}

.quote-content {
  font-size: 11px;
  line-height: 1.4;
  color: #888;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.quote-content.quote-missing {
  color: #ccc;
  font-style: italic;
  text-decoration: line-through;
}

/* ====== 评论文本 ====== */
.comment-text {
  margin: 0 0 4px;
  font-size: 13px;
  line-height: 1.5;
  color: #1a1a1a;
  word-break: break-word;
}

/* ====== 操作栏 ====== */
.comment-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.comment-thread:hover .comment-actions,
.comment-thread:has(.inline-reply-box) .comment-actions {
  opacity: 1;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border: none;
  background: transparent;
  border-radius: 3px;
  font-size: 11px;
  color: #999;
  cursor: pointer;
  transition: all 0.1s ease;
  font-family: inherit;
  line-height: 1;
}

.action-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.action-btn--active {
  background: #111;
  color: #fff;
}

.action-btn--active:hover {
  background: #333;
  color: #fff;
}

.action-btn--danger {
  color: #ccc;
}

.action-btn--danger:hover {
  background: #fff0f0;
  color: #e53e3e;
}

/* ====== 内联回复输入框 ====== */
.inline-reply-box {
  margin: 8px 0 0 38px;
  overflow: hidden;
}

.reply-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  color: #111;
  background: #fff;
  outline: none;
  transition: all 0.12s ease;
  box-sizing: border-box;
}

.reply-input:focus {
  border-color: #111;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
}

.reply-input::placeholder {
  color: #bbb;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
}

.reply-cancel,
.reply-send {
  padding: 3px 10px;
  border: 1px solid transparent;
  border-radius: 3px;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.1s ease;
}

.reply-cancel {
  background: transparent;
  color: #999;
  border-color: #ddd;
}

.reply-cancel:hover {
  border-color: #bbb;
  color: #666;
}

.reply-send {
  background: #111;
  color: #fff;
  border-color: #111;
}

.reply-send:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.reply-send:not(:disabled):hover {
  background: #333;
  border-color: #333;
}

/* 回复输入框动画 */
.reply-slide-enter-active,
.reply-slide-leave-active {
  transition: all 0.18s ease;
  max-height: 80px;
}

.reply-slide-enter-from,
.reply-slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

/* ====== 回复区域 ====== */
.replies-section {
  margin-top: 6px;
  margin-left: 38px;
}

.reply-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: none;
  background: transparent;
  font-size: 11px;
  font-family: inherit;
  color: #888;
  cursor: pointer;
  transition: color 0.1s ease;
}

.reply-toggle-btn:hover {
  color: #111;
}

.reply-toggle-btn svg {
  transition: transform 0.18s ease;
}

.reply-toggle-btn svg.expanded {
  transform: rotate(180deg);
}

/* 回复列表 */
.reply-list {
  margin-top: 6px;
  padding-left: 10px;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply-item {
  display: flex;
  gap: 8px;
}

.reply-avatar-col {
  flex-shrink: 0;
  padding-top: 1px;
}

.reply-body {
  flex: 1;
  min-width: 0;
}

.reply-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #444;
  word-break: break-word;
}

/* 回复展开动画 */
.replies-expand-enter-active,
.replies-expand-leave-active {
  transition: all 0.18s ease;
  overflow: hidden;
}

.replies-expand-enter-from,
.replies-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.replies-expand-enter-to,
.replies-expand-leave-from {
  max-height: 500px;
}
</style>
