<template>
  <div class="slash-menu" v-if="items.length">
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

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
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

const selectedIndex = ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  }
)

const selectItem = (index) => {
  const item = props.items[index]
  if (!item) return
  props.command(item)
  props.hide && props.hide()
}

const onKeyDown = ({ event }) => {
  if (!props.items.length) {
    return false
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    return true
  }
  if (event.key === 'ArrowUp') {
    selectedIndex.value =
      (selectedIndex.value + props.items.length - 1) % props.items.length
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
.slash-menu {
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
  transition: background var(--transition-fast);
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
  color: var(--yuque-primary);
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
  color: var(--text-primary);
}

.slash-item-desc {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.slash-item-shortcut {
  font-size: 12px;
  color: var(--text-tertiary);
}

.slash-empty {
  padding: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>

