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

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { kbApi } from '@/api'
import { useRoute } from 'vue-router'
import type { MentionItem } from '@/editor/extensions/AtMention'

interface DocumentItem {
  id: string
  title: string
  summary?: string
}

interface Props {
  query: string
  hide?: (() => void) | null
  command: (item: MentionItem) => void
}

const props = withDefaults(defineProps<Props>(), {
  query: '',
  hide: null,
})

const route = useRoute()
const items = ref<DocumentItem[]>([])
const loading = ref(false)
const selectedIndex = ref(0)

// 缓存文档树，避免每次搜索都请求
const allDocuments = ref<DocumentItem[]>([])
const treeLoaded = ref(false)

// 展平文档树
const flattenDocuments = (nodes: Array<{ id: string; title: string; children?: Array<{ id: string; title: string; children?: unknown[] }> }>): DocumentItem[] => {
  const result: DocumentItem[] = []
  const traverse = (nodes: Array<{ id: string; title: string; children?: unknown[] }>) => {
    for (const node of nodes) {
      result.push({ id: node.id, title: node.title })
      if (node.children && node.children.length > 0) {
        traverse(node.children as Array<{ id: string; title: string; children?: unknown[] }>)
      }
    }
  }
  traverse(nodes)
  return result
}

// 加载文档树
const loadDocumentTree = async () => {
  const baseId = route.params.baseId as string
  if (!baseId || treeLoaded.value) return

  try {
    const tree = await kbApi.document.getTree(baseId)
    allDocuments.value = flattenDocuments(tree)
    treeLoaded.value = true
  } catch (error) {
    console.error('加载文档树失败:', error)
  }
}

// 初始化时加载文档树
onMounted(() => {
  loadDocumentTree()
})

const searchDocuments = async (keyword: string) => {
  if (!keyword || keyword.trim().length === 0) {
    items.value = []
    return
  }

  // 确保文档树已加载
  if (!treeLoaded.value) {
    await loadDocumentTree()
  }

  loading.value = true
  try {
    const searchText = keyword.trim().toLowerCase()
    // 在本地文档列表中过滤匹配
    const matched = allDocuments.value
      .filter(doc => doc.title.toLowerCase().includes(searchText))
      .slice(0, 10) // 最多显示10条

    items.value = matched
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

const selectItem = (index: number) => {
  const item = items.value[index]
  if (!item) return

  props.command({
    docId: item.id,
    docTitle: item.title,
  })
  props.hide?.()
}

interface KeyDownEvent {
  event: KeyboardEvent
}

const onKeyDown = ({ event }: KeyDownEvent): boolean => {
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
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 16px;
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1));
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
  transition: background 0.15s ease;
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
  color: var(--primary-color, #165dff);
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
  color: var(--text-primary, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-item-meta {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-secondary, #666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-loading,
.mention-empty {
  padding: 16px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  text-align: center;
}
</style>

