<template>
  <teleport to="body">
    <transition name="fade-scale">
      <div
        v-if="modelValue"
        class="context-menu"
        :style="menuStyle"
        @click.stop
      >
        <ul>
          <li
            v-for="item in items"
            :key="item.key"
            :class="['menu-item', { danger: item.danger }]"
            @click="handleSelect(item)"
          >
            <span>{{ item.label }}</span>
            <small v-if="item.shortcut">{{ item.shortcut }}</small>
          </li>
        </ul>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'

interface MenuItem {
  key: string
  label: string
  shortcut?: string
  danger?: boolean
}

interface Position {
  x: number
  y: number
}

interface Props {
  modelValue?: boolean
  items?: MenuItem[]
  position?: Position
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  items: () => [],
  position: () => ({ x: 0, y: 0 }),
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'select': [item: MenuItem]
}>()

const menuStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
}))

const handleSelect = (item: MenuItem) => {
  emit('select', item)
  emit('update:modelValue', false)
}

const handleGlobalClick = () => {
  emit('update:modelValue', false)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('update:modelValue', false)
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('contextmenu', handleGlobalClick)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  document.removeEventListener('contextmenu', handleGlobalClick)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.context-menu {
  position: absolute;
  min-width: 180px;
  background: #fff;
  border: 1px solid var(--border-color, #E8E8E8);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 6px 0;
  z-index: 2200;
}

.context-menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary, #1a1a1a);
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.menu-item small {
  color: var(--text-tertiary, #999);
  transition: color 0.15s ease;
}

.menu-item:hover {
  background: rgba(22, 93, 255, 0.08);
  transform: translateX(2px);
}

.menu-item.danger {
  color: #f53f3f;
}

.menu-item.danger:hover {
  background: rgba(245, 63, 63, 0.08);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>

