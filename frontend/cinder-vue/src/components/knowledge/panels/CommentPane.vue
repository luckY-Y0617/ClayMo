<template>
  <div class="comment-pane">
    <div class="comment-pane__header">
      <div>
        <h4>评论</h4>
        <p>{{ comments.length }} 条讨论</p>
      </div>
      <el-button text size="small" @click="$emit('refresh')" :loading="loading">
        刷新
      </el-button>
    </div>

    <el-scrollbar class="comment-pane__list" ref="commentListRef">
      <el-skeleton v-if="loading" animated :rows="4" />
      <el-empty v-else-if="!comments.length" description="暂无评论">
        <p class="hint">在右侧选择文字后，可添加针对此段落的评论。</p>
      </el-empty>

      <ul v-else>
        <li
          v-for="comment in comments"
          :key="comment.id"
          class="comment-item"
          :data-comment-id="comment.id"
        >
          <div class="comment-item__avatar">
            <el-avatar :size="32" :src="comment.author?.avatar">
              {{ (comment.author?.name || '?').slice(0, 1) }}
            </el-avatar>
          </div>
          <div class="comment-item__body">
            <div class="comment-item__meta">
              <span class="author">{{ comment.author?.name || '匿名' }}</span>
              <span class="time">
                {{ formatRelative(comment.createdAt) }}
              </span>
            </div>
            <p class="content">{{ comment.content }}</p>
            <div class="actions">
              <el-button
                size="small"
                text
                @click="$emit('like', comment)"
              >
                {{ comment.likedByCurrentUser ? '取消赞' : '点赞' }}
                <span v-if="typeof comment.likeCount === 'number'">
                  （{{ comment.likeCount }}）
                </span>
              </el-button>
              <el-button
                size="small"
                text
                @click="$emit('locate', comment)"
              >
                跳转位置
              </el-button>
              <el-button
                size="small"
                text
                @click="$emit('reply', comment)"
              >
                回复
              </el-button>
              <el-popconfirm
                title="确定要删除这条评论吗？"
                confirm-button-text="删除"
                cancel-button-text="取消"
                @confirm="$emit('delete', comment)"
              >
                <template #reference>
                  <el-button
                    size="small"
                    text
                    type="danger"
                  >
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>

            <div class="replies" v-if="(comment.replies || []).length">
              <div
                class="reply"
                v-for="reply in comment.replies"
                :key="reply.id"
              >
                <span class="author">{{ reply.author?.name || '匿名' }}</span>
                <span class="time">{{ formatRelative(reply.createdAt) }}</span>
                <p class="content">{{ reply.content }}</p>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </el-scrollbar>

    <div class="comment-pane__editor">
      <el-input
        v-model="draft"
        type="textarea"
        :autosize="{ minRows: 3, maxRows: 5 }"
        placeholder="输入评论内容..."
      />
      <div class="editor-actions">
        <el-button text size="small" @click="draft = ''">清空</el-button>
        <el-button
          type="primary"
          size="small"
          :disabled="!draft.trim()"
          @click="handleSubmit"
        >
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { formatDistanceToNowStrict } from 'date-fns'
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
})

const emit = defineEmits(['submit', 'refresh', 'locate', 'reply', 'like', 'delete'])

const draft = ref('')
const commentListRef = ref(null)

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

/**
 * 定位到指定评论并高亮
 */
const navigateToComment = (commentId) => {
  if (!commentId) return
  
  nextTick(() => {
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`)
    if (!commentElement) {
      console.warn('未找到评论元素:', commentId)
      return
    }
    
    // 滚动到评论位置
    commentElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    
    // 添加高亮类
    commentElement.classList.add('comment-item-highlight')
    
    // 2秒后移除高亮
    setTimeout(() => {
      commentElement.classList.remove('comment-item-highlight')
    }, 2000)
  })
}

// 监听评论导航事件
const handleCommentPaneNavigate = (event) => {
  const { commentId } = event.detail || {}
  if (commentId) {
    navigateToComment(commentId)
  }
}

onMounted(() => {
  window.addEventListener('comment-pane-navigate', handleCommentPaneNavigate)
})

onBeforeUnmount(() => {
  window.removeEventListener('comment-pane-navigate', handleCommentPaneNavigate)
})
</script>

<style scoped>
.comment-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fffaf3;
}

.comment-pane__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.comment-pane__header h4 {
  margin: 0;
  font-size: 16px;
}

.comment-pane__header p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

.comment-pane__list {
  flex: 1;
  padding: 12px 14px;
}

.comment-pane__list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.comment-item__body {
  flex: 1;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  padding: 12px;
  background: #ffffff;
}

.comment-item__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.comment-item__meta .author {
  font-weight: 600;
  color: var(--text-primary);
}

.comment-item__meta .time {
  color: var(--text-tertiary);
}

.comment-item__body .content {
  margin: 6px 0 8px;
  color: var(--text-secondary);
}

.comment-item__body .actions {
  display: flex;
  gap: 4px;
}

.replies {
  margin-top: 12px;
  padding-left: 12px;
  border-left: 2px solid rgba(22, 93, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply {
  font-size: 13px;
  color: var(--text-secondary);
}

.reply .author {
  font-weight: 600;
  margin-right: 6px;
}

.comment-pane__editor {
  padding: 12px 14px 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  background: #fffaf3;
}

.editor-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.hint {
  color: var(--text-tertiary);
}

.comment-item-highlight {
  animation: comment-highlight 2s ease-out;
}

@keyframes comment-highlight {
  0% {
    background: rgba(22, 93, 255, 0.2);
  }
  100% {
    background: transparent;
  }
}
</style>

