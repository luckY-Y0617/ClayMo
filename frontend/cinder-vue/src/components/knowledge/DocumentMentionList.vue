<template>
  <div class="document-mention-list" v-if="items.length">
    <button
      v-for="(item, index) in items"
      :key="item.id"
      class="mention-item"
      :class="{ active: index === selectedIndex }"
      @mousedown.prevent
      @click="selectItem(index)"
    >
      <div class="mention-item-icon">📄</div>
      <div class="mention-item-body">
        <p class="mention-item-title">{{ item.title }}</p>
        <p class="mention-item-meta" v-if="item.summary">
          {{ item.summary }}
        </p>
      </div>
    </button>
  </div>
  <div v-else-if="loading" class="mention-loading">搜索中...</div>
  <div v-else class="mention-empty">未找到匹配的文档</div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { kbApi } from '@/api/kb.api'
import { useRoute } from 'vue-router'

const props = defineProps({
  query: {
    type: String,
    default: '',
  },
  hide: {
    type: Function,
    default: null,
  },
  command: {
    type: Function,
    required: true,
  },
})

const route = useRoute()
const items = ref([])
const loading = ref(false)
const selectedIndex = ref(0)

const searchDocuments = async (keyword) => {
  if (!keyword || keyword.trim().length === 0) {
    items.value = []
    return
  }

  loading.value = true
  try {
    const baseId = route.params.baseId
    if (!baseId) {
      items.value = []
      return
    }

    // 使用搜索 API
    const result = await kbApi.document.search(baseId, keyword.trim())
    items.value = result.list.map(item => ({
      id: item.document?.id || item.id,
      title: item.document?.title || item.title,
      summary: item.document?.summary || item.summary,
    }))
  } catch (error) {
    console.error('搜索文档失败:', error)
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => props.query,
  (newQuery) => {
    selectedIndex.value = 0
    searchDocuments(newQuery)
  },
  { immediate: true }
)

const selectItem = (index) => {
  const item = items.value[index]
  if (!item) return

  props.command({
    docId: item.id,
    docTitle: item.title,
  })
  props.hide && props.hide()
}

const onKeyDown = ({ event }) => {
  if (!items.value.length) {
    return false
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % items.value.length
    return true
  }
  if (event.key === 'ArrowUp') {
    selectedIndex.value =
      (selectedIndex.value + items.value.length - 1) % items.value.length
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

defineExpose({
  onKeyDown,
})
</script>

<style scoped>
.document-mention-list {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  padding: 8px;
  width: 320px;
  max-width: 90vw;
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mention-item {
  display: flex;
  gap: 10px;
  align-items: center;
  border: none;
  border-radius: 12px;
  padding: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.mention-item.active,
.mention-item:hover {
  background: rgba(22, 93, 255, 0.08);
}

.mention-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(22, 93, 255, 0.1);
  color: var(--yuque-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.mention-item-body {
  flex: 1;
  overflow: hidden;
}

.mention-item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-item-meta {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-loading,
.mention-empty {
  padding: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}
</style>

