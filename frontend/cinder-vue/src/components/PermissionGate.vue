<template>
  <template v-if="hasPermission">
    <slot />
  </template>
  <template v-else-if="showFallback">
    <slot name="fallback">
      <div v-if="showDefaultFallback" class="permission-gate-fallback">
        <span class="fallback-text">{{ fallbackText }}</span>
      </div>
    </slot>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import { usePermissionStore } from '@/stores/permission'

const props = defineProps({
  /**
   * 需要的权限码（字符串或数组）
   */
  required: {
    type: [String, Array],
    required: true,
  },

  /**
   * 是否要求所有权限都满足（默认 false，即 hasAny）
   */
  requireAll: {
    type: Boolean,
    default: false,
  },

  /**
   * 是否显示 fallback 内容（默认 false，即完全不渲染）
   */
  showFallback: {
    type: Boolean,
    default: false,
  },

  /**
   * 是否显示默认的 fallback 文本（当 showFallback 为 true 且没有提供 fallback slot 时）
   */
  showDefaultFallback: {
    type: Boolean,
    default: true,
  },

  /**
   * 默认 fallback 文本
   */
  fallbackText: {
    type: String,
    default: '无权限访问此内容',
  },
})

const permissionStore = usePermissionStore()

const hasPermission = computed(() => {
  const { required, requireAll } = props

  if (!required) {
    return true
  }

  if (Array.isArray(required)) {
    if (requireAll) {
      return permissionStore.hasAll(required)
    } else {
      return permissionStore.hasAny(required)
    }
  } else if (typeof required === 'string') {
    return permissionStore.has(required)
  }

  return true
})
</script>

<style scoped>
.permission-gate-fallback {
  padding: 8px 12px;
  color: #999;
  font-size: 14px;
  text-align: center;
}

.fallback-text {
  display: inline-block;
}
</style>

