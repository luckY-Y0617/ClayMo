<template>
  <div class="document-tree">
    <div v-loading="loading" class="tree-content">
      <div v-if="documents.length === 0" class="empty-tree">
        <p class="empty-title">暂无文档</p>
        <p class="empty-subtitle">从第一个节点开始搭建你的知识树。</p>
        <el-button
          v-if="!readonly && canCreate"
          size="small"
          type="primary"
          @click="$emit('create', { parentId: null })"
        >
          创建第一个文档
        </el-button>
      </div>

      <TreeNode
        v-for="doc in documents"
        :key="doc.id"
        :node="doc"
        :selected-key="selectedKey"
        :expanded-keys="expandedKeys"
        :kb-id="kbId"
        :depth="0"
        @select="$emit('select', $event)"
        @create="$emit('create', $event)"
        @rename="$emit('rename', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>

    <DocumentContextMenu
      v-if="!readonly"
      :model-value="contextMenu.visible"
      :items="menuItems"
      :position="{ x: contextMenu.x, y: contextMenu.y }"
      @update:modelValue="contextMenu.visible = $event"
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, reactive } from 'vue'
import TreeNode from './TreeNode.vue'
import DocumentContextMenu from './components/DocumentContextMenu.vue'
import { useDocumentTreeStore } from '@/stores/documentTree'

interface TreeNodeData {
  id: string
  title: string
  children?: TreeNodeData[]
}

interface MenuItem {
  key: string
  label: string
  shortcut?: string
  danger?: boolean
}

interface Props {
  documents?: TreeNodeData[]
  selectedKey?: string | null
  kbId?: string | null
  readonly?: boolean
  canCreate?: boolean
  canDelete?: boolean
  canMove?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  documents: () => [],
  selectedKey: null,
  kbId: null,
  readonly: false,
  canCreate: true,
  canDelete: true,
  canMove: true,
})

const emit = defineEmits<{
  'select': [id: string]
  'create': [data: { parentId: string | null }]
  'rename': [data: { id: string; title: string }]
  'delete': [data: { id: string; title: string; hasChildren: boolean }]
  'request-move': [data: { id: string }]
}>()

const documentTreeStore = useDocumentTreeStore()
const loading = computed(() => props.kbId ? documentTreeStore.isLoading(props.kbId) : false)
const expandedKeys = computed(() => props.kbId ? documentTreeStore.getExpandedKeys(props.kbId) : [])

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  node: null as TreeNodeData | null,
})

// 根据权限动态计算菜单项
const menuItems = computed((): MenuItem[] => {
  const items: MenuItem[] = [
    { key: 'open', label: '打开文档', shortcut: 'Enter' },
  ]

  if (props.canCreate) {
    items.push({ key: 'create', label: '新建', shortcut: 'Ctrl+Enter' })
  }

  if (props.canMove) {
    items.push({ key: 'move', label: '移动到...' })
  }

  items.push({ key: 'rename', label: '重命名', shortcut: 'F2' })

  if (props.canDelete) {
    items.push({ key: 'delete', label: '删除', shortcut: 'Delete', danger: true })
  }

  return items
})

const openContextMenu = (event: MouseEvent, node: TreeNodeData) => {
  if (props.readonly) return
  contextMenu.visible = true
  contextMenu.x = event.pageX
  contextMenu.y = event.pageY
  contextMenu.node = node
}

if (!props.readonly) {
  provide('openContextMenu', openContextMenu)
}

const handleMenuSelect = (item: MenuItem) => {
  if (!contextMenu.node) return
  const node = contextMenu.node
  switch (item.key) {
    case 'open':
      emit('select', node.id)
      break
    case 'create':
      emit('create', { parentId: node.id })
      break
    case 'rename':
      emit('rename', { id: node.id, title: node.title })
      break
    case 'delete':
      emit('delete', {
        id: node.id,
        title: node.title,
        hasChildren: Array.isArray(node.children) && node.children.length > 0,
      })
      break
    case 'move':
      emit('request-move', { id: node.id })
      break
  }
  contextMenu.visible = false
}
</script>

<style scoped>
.document-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  margin-right: -8px;
}

.tree-content::-webkit-scrollbar {
  width: 6px;
}

.tree-content::-webkit-scrollbar-track {
  background: transparent;
}

.tree-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.tree-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.empty-tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  color: #999;
}

.empty-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #666;
}

.empty-subtitle {
  margin: 0 0 24px 0;
  font-size: 13px;
  color: #999;
  line-height: 1.5;
}
</style>

