<template>
  <div class="move-tree-node">
    <button
      type="button"
      class="tree-item"
      :class="{ active: selectedId === node.id, disabled: isDisabled }"
      :style="{ paddingLeft: `${12 + depth * 16}px` }"
      :disabled="isDisabled"
      @click="handleSelect"
    >
      <span v-if="hasChildren" class="expand-icon" @click.stop="toggleExpand">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          :class="{ rotated: isExpanded }"
        >
          <path
            d="M4.5 3L7.5 6L4.5 9"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
        <span v-else class="expand-placeholder"></span>
      <span class="tree-icon">{{ isFolder ? '📁' : '📄' }}</span>
      <span class="tree-text">{{ node.title }}</span>
    </button>

    <Transition name="collapse">
      <div v-if="hasChildren && isExpanded" class="children">
        <MoveTreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :selected-id="selectedId"
          :disabled-id="disabledId"
          :depth="depth + 1"
          @select="(id) => emit('select', id)"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface DocumentNode {
  id: string
  title: string
  type?: number
  children?: DocumentNode[]
}

interface Props {
  node: DocumentNode
  selectedId: string | null
  disabledId: string
  depth: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [id: string]
}>()

const isExpanded = ref(false)

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

// 判断是否为文件夹类型 (type: 1 = Folder, 0 = Normal)
const isFolder = computed(() => {
  return props.node.type === 1
})

const isDisabled = computed(() => {
  // 禁用自己及所有子文档
  if (props.node.id === props.disabledId) return true
  return isDescendantOf(props.node, props.disabledId)
})

const isDescendantOf = (node: DocumentNode, targetId: string): boolean => {
  if (!node.children) return false
  for (const child of node.children) {
    if (child.id === targetId) return true
    if (isDescendantOf(child, targetId)) return true
  }
  return false
}

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const handleSelect = () => {
  if (isDisabled.value) return
  emit('select', props.node.id)
}
</script>

<style scoped>
.move-tree-node {
  display: flex;
  flex-direction: column;
}

.tree-item {
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.tree-item:hover:not(.disabled) {
  background: #e5e7eb;
}

.tree-item.active {
  background: #4f46e5;
  color: #fff;
}

.tree-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.expand-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  flex-shrink: 0;
}

.expand-icon svg {
  transition: transform 0.2s ease;
}

.expand-icon svg.rotated {
  transform: rotate(90deg);
}

.expand-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.tree-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.tree-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.children {
  overflow: hidden;
}

/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

