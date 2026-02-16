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

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  items: {
    type: Array,
    default: () => [],
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 }),
  },
})

const emit = defineEmits(['update:modelValue', 'select'])

const menuStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
}))

const handleSelect = (item) => {
  emit('select', item)
  emit('update:modelValue', false)
}

const handleGlobalClick = () => {
  emit('update:modelValue', false)
}

const handleKeyDown = (event) => {
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
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
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
  color: var(--text-primary);
  transition: background-color var(--transition-fast) var(--ease-standard),
              color var(--transition-fast) var(--ease-standard),
              transform var(--transition-fast) var(--ease-standard);
}

.menu-item small {
  color: var(--text-tertiary);
  transition: color var(--transition-fast) var(--ease-standard);
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
  transition: opacity var(--transition-fast) var(--ease-standard),
              transform var(--transition-fast) var(--ease-standard);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>

