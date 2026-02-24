<template>
  <BaseModal :model-value="modelValue" container-class="delete-confirm-modal" @update:model-value="$emit('update:modelValue', $event)">
    <!-- 头部 -->
    <template #header>
      <h3 class="modal-title">删除文档</h3>
      <button class="modal-close" @click="handleClose">
        <el-icon :size="16"><Close /></el-icon>
      </button>
    </template>

    <!-- 内容 -->
    <template #body>
      <p class="warning-text">
        此操作不可恢复，确认要删除
        <strong>「{{ title }}」</strong>
        吗？
      </p>

      <div v-if="hasChildren" class="alert-box">
        <svg class="alert-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 6V9M9 12H9.01M17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9Z" stroke="#f53f3f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="alert-text">该文档包含子文档，删除后子文档也会被移除。</span>
      </div>

      <label v-if="hasChildren" class="checkbox-wrapper">
        <input
          v-model="includeChildren"
          type="checkbox"
          class="custom-checkbox"
        />
        <span class="checkbox-label">同时删除所有子节点</span>
      </label>
    </template>

    <!-- 底部 -->
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
      <button
        type="button"
        class="btn btn-danger"
        :disabled="submitting"
        @click="handleConfirm"
      >
        <span v-if="submitting" class="btn-loading">
          <el-icon class="is-loading" :size="14"><Loading /></el-icon>
        </span>
        <span v-else>确认删除</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Close, Loading } from '@element-plus/icons-vue'
import BaseModal from './BaseModal.vue'

interface Props {
  modelValue?: boolean
  title?: string
  hasChildren?: boolean
  submitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: '未命名文档',
  hasChildren: false,
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [data: { includeChildren: boolean }]
}>()

const includeChildren = ref(false)

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      includeChildren.value = props.hasChildren
    }
  }
)

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleConfirm = () => {
  emit('confirm', { includeChildren: includeChildren.value })
}
</script>

<style scoped>
.warning-text {
  font-size: 15px;
  line-height: 1.6;
  color: #666;
  margin: 0;
}

.warning-text strong {
  color: #1a1a1a;
  font-weight: 600;
}
</style>

