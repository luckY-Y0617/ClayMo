<template>
  <div class="tree-node">
    <div
      class="node-item"
      :class="{
        active: node.id === selectedKey,
        'is-folder': isFolder,
      }"
      :style="{ paddingLeft: `${depth * 20 + 12}px` }"
      @click="handleSelect"
      @contextmenu.stop.prevent="handleContextMenu"
    >
      <!-- 文件夹展开/收起图标 -->
      <el-icon
        v-if="isFolder"
        class="expand-icon folder-expand"
        :class="{ expanded: isExpanded }"
        @click.stop="toggleExpand"
      >
        <ArrowRight />
      </el-icon>
      <!-- 文档的展开图标（仅当有子节点时显示） -->
      <el-icon
        v-else-if="hasChildren"
        class="expand-icon"
        :class="{ expanded: isExpanded }"
        @click.stop="toggleExpand"
      >
        <ArrowRight />
      </el-icon>
      <div v-else class="expand-placeholder"></div>

      <!-- 文件夹图标 -->
      <div v-if="isFolder" class="node-icon-wrapper folder-icon-wrapper">
        <el-icon class="folder-icon">
          <FolderOpened v-if="isExpanded && hasChildren" />
          <Folder v-else />
        </el-icon>
      </div>
      <!-- 文档图标 -->
      <div v-else class="node-icon-wrapper">
        <el-icon class="doc-icon"><Document /></el-icon>
      </div>

      <span class="node-title" :class="{ 'folder-title': isFolder }">{{ node.title }}</span>
      <span v-if="node.children && node.children.length > 0" class="node-count">
        {{ node.children.length }}
      </span>
    </div>

    <!-- 子节点 -->
    <transition name="tree-expand">
      <div v-if="hasChildren && isExpanded" class="children">
        <DocumentTreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :selected-key="selectedKey"
          :expanded-keys="expandedKeys"
          :kb-id="kbId"
          :depth="depth + 1"
          @select="$emit('select', $event)"
        />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { ArrowRight, Document, Folder, FolderOpened } from '@element-plus/icons-vue'
import type { DocumentNode } from '@/api/modules/knowledge'
import { useDocumentTreeStore } from '@/stores'

interface Props {
  node: DocumentNode
  selectedKey?: string | null
  expandedKeys?: string[]
  kbId?: string | null
  depth?: number
  canCreate?: boolean
  canDelete?: boolean
  canMove?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedKey: null,
  expandedKeys: () => [],
  kbId: null,
  depth: 0,
  canCreate: true,
  canDelete: true,
  canMove: true,
})

const emit = defineEmits<{
  select: [docId: string]
  create: [data: { parentId: string }]
  rename: [data: { id: string; title: string }]
  delete: [data: { id: string; title: string; hasChildren: boolean }]
}>()

// 注入右键菜单函数
const openContextMenu = inject<((event: MouseEvent, node: DocumentNode) => void) | null>('openContextMenu', null)

const documentTreeStore = useDocumentTreeStore()

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const isFolder = computed(() => {
  return props.node.type === 'Folder' || props.node.type === 1
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

const handleContextMenu = (event: MouseEvent) => {
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

/* 文件夹展开图标 */
.folder-expand {
  opacity: 0.8;
  color: #faad14;
}

.folder-expand:hover {
  color: #d48806;
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

/* 文件夹图标样式 */
.folder-icon {
  font-size: 16px;
  color: #e6a23c;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.node-item:hover .folder-icon {
  color: #d48806;
  transform: scale(1.1);
}

.node-item.active .folder-icon {
  color: #cf9236;
}

/* 文件夹标题样式 */
.folder-title {
  font-weight: 600;
  color: #1a1a1a;
}

.node-item:hover .folder-title {
  color: #1E40AF;
}

.node-item.active .folder-title {
  color: #1D4ED8;
  font-weight: 600;
}

/* 文件夹选中状态 - 统一使用左侧蓝色竖条 */
.node-item.is-folder.active {
  padding-left: 13px;
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

