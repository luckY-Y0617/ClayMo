<template>
  <BaseModal :model-value="modelValue" container-class="delete-confirm-modal" @update:model-value="$emit('update:modelValue', $event)">
    <!-- 头部 -->
    <template #header>
      <h3 class="modal-title">删除确认</h3>
      <button class="modal-close" @click="handleClose">
        <el-icon :size="16"><Close /></el-icon>
      </button>
    </template>

    <!-- 内容 -->
    <template #body>
      <div class="delete-content">
        <p class="warning-text">
          确定要删除文档
          <strong>「{{ title }}」</strong>
          吗？
        </p>
        
        <p class="warning-desc">此操作不可恢复，删除后数据将无法找回</p>

        <div v-if="hasChildren" class="alert-box">
          <svg class="alert-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 5V8.5M8 11H8.01M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z" stroke="#f53f3f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="alert-text">该文档包含子文档，删除后子文档也会被删除</span>
        </div>

        <label v-if="hasChildren" class="checkbox-wrapper">
          <input
            v-model="includeChildren"
            type="checkbox"
            class="custom-checkbox"
          />
          <span class="checkbox-label">包含删除子文档</span>
        </label>
      </div>
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
.delete-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10px 0;
}

.warning-text {
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  margin: 0 0 8px;
}

.warning-text strong {
  color: #1a1a1a;
  font-weight: 600;
}

.warning-desc {
  font-size: 13px;
  color: #999;
  margin: 0 0 20px;
}

.alert-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fef2f2;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 12px;
}

.alert-icon {
  flex-shrink: 0;
}

.alert-text {
  font-size: 13px;
  color: #f53f3f;
  line-height: 1.4;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  width: 100%;
}

.custom-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #f53f3f;
  cursor: pointer;
}

.checkbox-label {
  font-size: 13px;
  color: #666;
  user-select: none;
}

.btn-danger {
  background: #f53f3f;
  color: #fff;
  border: none;
}

.btn-danger:hover:not(:disabled) {
  background: #e63939;
}

.btn-danger:disabled {
  background: #fab3b3;
  cursor: not-allowed;
}
</style>

