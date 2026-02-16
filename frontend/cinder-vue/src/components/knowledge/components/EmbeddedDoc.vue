<template>
  <div class="embedded-doc">
    <el-skeleton v-if="loading" animated :rows="4" />

    <el-empty
      v-else-if="!docData"
      class="embedded-doc__empty"
      description="选择一个文档以嵌入"
    >
      <p class="hint">支持通过 props 直接传入文档信息，或提供 doc-id 自动加载。</p>
    </el-empty>

    <el-card
      v-else
      class="embedded-doc__card"
      shadow="hover"
      @click="handleOpen"
    >
      <div class="embedded-doc__header">
        <div class="title-block">
          <span class="title">{{ docData.title }}</span>
          <el-tag size="small" effect="plain">
            {{ docData.status === 'published' ? '已发布' : '草稿' }}
          </el-tag>
        </div>
        <el-button
          v-if="showActions"
          type="primary"
          text
          @click.stop="handleOpen"
        >
          打开文档
        </el-button>
      </div>

      <p class="excerpt">
        {{ docData.summary || docData.excerpt || '暂无摘要信息' }}
      </p>

      <div class="meta">
        <span>
          更新于 {{ formatRelative(docData.updatedAt) }}
        </span>
        <div class="tags" v-if="(docData.tags || []).length">
          <el-tag
            v-for="tag in docData.tags"
            :key="tag"
            size="small"
            effect="plain"
          >
            #{{ tag }}
          </el-tag>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { formatDistanceToNowStrict } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { kbApi } from '@/api/kb.api'

const props = defineProps({
  docId: {
    type: String,
    default: '',
  },
  knowledgeBaseId: {
    type: String,
    default: '',
  },
  document: {
    type: Object,
    default: null,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['open'])

const loading = ref(false)
const docData = ref(props.document)

const formatRelative = (value) => {
  if (!value) return '未知'
  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    locale: zhCN,
  })
}

const fetchDoc = async (id) => {
  if (!id) {
    docData.value = null
    return
  }
  if (!props.knowledgeBaseId) {
    console.error('缺少 knowledgeBaseId 参数', { docId: id, props: props })
    return
  }
  console.log('加载嵌入文档:', { knowledgeBaseId: props.knowledgeBaseId, docId: id })
  loading.value = true
  try {
    const doc = await kbApi.document.content.get(props.knowledgeBaseId, id)
    docData.value = doc
  } catch (error) {
    console.error('加载嵌入文档失败', error)
    docData.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.docId,
  (id) => {
    if (!props.document) {
      fetchDoc(id)
    }
  },
  { immediate: true }
)

watch(
  () => props.document,
  (value) => {
    if (value) {
      docData.value = value
    }
  }
)

const handleOpen = () => {
  if (!docData.value) return
  emit('open', docData.value)
}
</script>

<style scoped>
.embedded-doc {
  width: 100%;
}

.embedded-doc__empty {
  border: 1px dashed var(--border-color);
  border-radius: 16px;
  padding: 24px;
  background: rgba(246, 247, 251, 0.5);
}

.embedded-doc__card {
  border-radius: 20px;
  border: 1px solid var(--border-color);
  cursor: pointer;
}

.embedded-doc__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.excerpt {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 12px;
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.hint {
  color: var(--text-tertiary);
  margin-top: 8px;
}
</style>

