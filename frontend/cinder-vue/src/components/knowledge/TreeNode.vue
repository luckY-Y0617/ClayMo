<template>
  <div class="tree-node">
    <div
      class="node-item"
      :class="{ active: node.id === selectedKey }"
      :style="{ paddingLeft: `${depth * 20 + 12}px` }"
      @click="handleSelect"
      @contextmenu.stop.prevent="handleContextMenu"
    >
      <el-icon
        v-if="hasChildren"
        class="expand-icon"
        :class="{ expanded: isExpanded }"
        @click.stop="toggleExpand"
      >
        <ArrowRight />
      </el-icon>
      <div v-else class="expand-placeholder"></div>
      <div class="node-icon-wrapper">
        <el-icon class="doc-icon"><Document /></el-icon>
      </div>
      <span class="node-title">{{ node.title }}</span>
      <span v-if="node.children && node.children.length > 0" class="node-count">{{ node.children.length }}</span>
    </div>

    <!-- 子节点 -->
    <transition name="tree-expand">
      <div v-if="hasChildren && isExpanded" class="children">
        <TreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :selected-key="selectedKey"
          :expanded-keys="expandedKeys"
          :kb-id="kbId"
          :depth="depth + 1"
          @select="$emit('select', $event)"
          @create="$emit('create', $event)"
          @rename="$emit('rename', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
// 使用全局注册的图标组件（已在 main.js 中注册）
import { useDocumentTreeStore } from '@/stores/documentTree'
import TreeNode from './TreeNode.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  selectedKey: {
    type: String,
    default: null,
  },
  expandedKeys: {
    type: Array,
    default: () => [],
  },
  kbId: {
    type: String,
    default: null,
  },
  depth: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['select', 'create', 'rename', 'delete'])
const openContextMenu = inject('openContextMenu', null)

const documentTreeStore = useDocumentTreeStore()

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const isExpanded = computed(() => {
  return props.expandedKeys.includes(props.node.id)
})

const handleSelect = () => {
  emit('select', props.node.id)
}

const toggleExpand = () => {
  if (props.kbId) {
    documentTreeStore.toggleExpand(props.kbId, props.node.id)
  }
}

const handleContextMenu = (event) => {
  openContextMenu?.(event, props.node)
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  gap: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 48px;
}

.node-item:hover {
  background: rgba(59, 130, 246, 0.08);
  transform: translateX(2px);
}

.node-item.active {
  background: rgba(59, 130, 246, 0.12);
  font-weight: 500;
  border-left: 3px solid #3B82F6;
  padding-left: 13px;
}

.expand-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  color: #666;
  opacity: 0.6;
}

.expand-icon:hover {
  opacity: 1;
  color: #3B82F6;
}

.node-item:hover .expand-icon {
  opacity: 1;
  color: #3B82F6;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.expand-placeholder {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.node-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.doc-icon {
  width: 18px;
  height: 18px;
  color: #3B82F6;
  opacity: 0.7;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.node-item:hover .doc-icon {
  opacity: 1;
  color: #2563EB;
  transform: scale(1.1);
}

.node-item.active .doc-icon {
  opacity: 1;
  color: #1D4ED8;
}

.node-title {
  flex: 1;
  font-size: 15px;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;
  font-weight: 400;
}

.node-item:hover .node-title {
  color: #2563EB;
}

.node-item.active .node-title {
  color: #1D4ED8;
  font-weight: 500;
}

.node-count {
  font-size: 12px;
  color: #999;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  font-weight: 500;
  flex-shrink: 0;
}

.children {
  margin-top: 2px;
}

/* 展开动画 */
.tree-expand-enter-active,
.tree-expand-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.tree-expand-enter-from {
  opacity: 0;
  max-height: 0;
}

.tree-expand-enter-to {
  opacity: 1;
  max-height: 1000px;
}

.tree-expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}

.tree-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>

