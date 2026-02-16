<template>
  <div class="document-tree">
    <header class="tree-header">
      <div class="tree-header-main">
        <p class="tree-caption">文档树</p>
        <h4 class="tree-title">当前知识结构</h4>
      </div>
    </header>

    <div v-loading="loading" class="tree-content">
      <div v-if="documents.length === 0" class="empty-tree">
        <p class="empty-title">暂无文档</p>
        <p class="empty-subtitle">从第一个节点开始搭建你的知识树。</p>
        <el-button
          v-if="!readonly"
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
 
  <!-- Move modal is controlled by parent; DocumentTree only requests it via 'request-move' -->
  </div>
</template>

<script setup>
import { computed, provide, reactive, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
// 使用全局注册的图标组件（已在 main.js 中注册）
import TreeNode from './TreeNode.vue'
import DocumentContextMenu from './components/DocumentContextMenu.vue'
import { useDocumentTreeStore } from '@/stores/documentTree'

const props = defineProps({
  documents: {
    type: Array,
    default: () => [],
  },
  selectedKey: {
    type: String,
    default: null,
  },
  kbId: {
    type: String,
    default: null,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select', 'create', 'rename', 'delete', 'request-move'])

const documentTreeStore = useDocumentTreeStore()
const loading = computed(() => props.kbId ? documentTreeStore.isLoading(props.kbId) : false)
const expandedKeys = computed(() => props.kbId ? documentTreeStore.getExpandedKeys(props.kbId) : [])

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  node: null,
})

// DocumentTree no longer manages modal state; parent controls MoveDocModal

const menuItems = [
  { key: 'open', label: '打开文档', shortcut: 'Enter' },
  { key: 'create', label: '新建子文档', shortcut: 'Ctrl+Enter' },
  { key: 'move', label: '移动到...' },
  { key: 'rename', label: '重命名', shortcut: 'F2' },
  { key: 'delete', label: '删除', shortcut: 'Delete', danger: true },
]

const openContextMenu = (event, node) => {
  if (props.readonly) return
  contextMenu.visible = true
  contextMenu.x = event.pageX
  contextMenu.y = event.pageY
  contextMenu.node = node
}

if (!props.readonly) {
  provide('openContextMenu', openContextMenu)
}

const handleMenuSelect = async (item) => {
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

.tree-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.tree-header-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tree-caption {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #999;
  font-weight: 500;
}

.tree-title {
  margin: 0;
  font-size: 20px;
  color: #1a1a1a;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  margin-right: -8px;
}

/* 自定义滚动条 */
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

