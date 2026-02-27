<template>
  <div class="slash-menu" v-if="items.length" ref="menuRef" @wheel="onWheel">
    <button
      v-for="(item, index) in items"
      :key="item.title"
      class="slash-item"
      :class="{ active: index === selectedIndex }"
      @mousedown.prevent
      @click="selectItem(index)"
    >
      <div class="slash-item-icon">
        {{ item.icon }}
      </div>
      <div class="slash-item-body">
        <p class="slash-item-title">{{ item.title }}</p>
        <p class="slash-item-desc">{{ item.description }}</p>
      </div>
      <span class="slash-item-shortcut">{{ item.shortcut }}</span>
    </button>
  </div>
  <div v-else class="slash-empty">未找到匹配的命令</div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { SlashCommandItem } from '@/editor/extensions/SlashCommand'

interface Props {
  items: SlashCommandItem[]
  hide?: (() => void) | null
  command: (item: SlashCommandItem) => void
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  hide: null,
})

const selectedIndex = ref(0)
const menuRef = ref<HTMLElement | null>(null)

const setItemRef = (el: unknown, index: number) => {
  // 不再使用这种方式
}

// 滚动到选中的项目
const scrollToSelectedItem = () => {
  if (!menuRef.value) return
  const buttons = menuRef.value.querySelectorAll('.slash-item')
  const currentItem = buttons[selectedIndex.value] as HTMLElement
  if (currentItem) {
    currentItem.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }
}

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  }
)

const selectItem = (index: number) => {
  const item = props.items[index]
  if (!item) return
  props.command(item)
  props.hide?.()
}

interface KeyDownEvent {
  event: KeyboardEvent
}

const onKeyDown = ({ event }: KeyDownEvent): boolean => {
  if (!props.items.length) {
    return false
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    scrollToSelectedItem()
    return true
  }
  if (event.key === 'ArrowUp') {
    selectedIndex.value =
      (selectedIndex.value + props.items.length - 1) % props.items.length
    scrollToSelectedItem()
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

// 滚轮滚动时保持选中项在可视区域
let wheelTimer: ReturnType<typeof setTimeout> | null = null
const onWheel = () => {
  if (wheelTimer) clearTimeout(wheelTimer)
  wheelTimer = setTimeout(() => {
    scrollToSelectedItem()
  }, 50)
}

defineExpose({
  onKeyDown,
})
</script>

<style scoped>
.slash-menu {
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

.slash-item {
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

.slash-item.active,
.slash-item:hover {
  background: rgba(22, 93, 255, 0.08);
}

.slash-item-icon {
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

.slash-item-body {
  flex: 1;
  overflow: hidden;
}

.slash-item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.slash-item-desc {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.slash-item-shortcut {
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

.slash-empty {
  padding: 16px;
  font-size: 13px;
  color: var(--text-secondary, #666);
}
</style>

