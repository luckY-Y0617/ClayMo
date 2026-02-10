<template>
  <BaseModal :model-value="modelValue" container-class="save-version-modal" @update:model-value="$emit('update:modelValue', $event)">
    <template #header>
      <h3 class="modal-title">保存新版本</h3>
      <button class="modal-close" @click="handleCancel">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </template>

    <template #body>
      <form class="modal-form" @submit.prevent="handleSubmit">
        <div class="form-item">
          <label class="form-label">版本摘要</label>
          <textarea
            v-model="changeSummary"
            class="custom-textarea"
            placeholder="请填写本次修改的说明（可选）"
            maxlength="200"
            rows="4"
          ></textarea>
          <div class="textarea-footer">
            <span class="form-hint">简要描述本次修改的内容，方便后续查看版本历史</span>
            <span class="textarea-count">{{ changeSummary.length }} / 200</span>
          </div>
        </div>
      </form>
    </template>

    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleCancel">取消</button>
      <button type="button" class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
        <span v-if="submitting" class="btn-loading">
          <svg class="spinner" width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
              <animate attributeName="stroke-dashoffset" values="31.416;0;31.416" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </span>
        <span v-else>保存版本</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'

interface Props {
  modelValue: boolean
  submitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [data: { changeSummary: string | null }]
  cancel: []
}>()

const changeSummary = ref('')

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      changeSummary.value = ''
    }
  }
)

const handleCancel = () => {
  emit('update:modelValue', false)
  changeSummary.value = ''
  emit('cancel')
}

const handleSubmit = () => {
  emit('submit', {
    changeSummary: changeSummary.value.trim() || null,
  })
}
</script>

<style scoped>
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.custom-textarea {
  width: 100%;
  padding: 12px 14px;
  background: #F7F7F7;
  border: 1px solid #E0E0E0;
  border-radius: 0;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  transition: all 0.2s ease;
  outline: none;
  color: #1a1a1a;
  font-family: inherit;
}

.custom-textarea::placeholder {
  color: #999;
}

.custom-textarea:hover {
  border-color: #CCCCCC;
  background: #FFFFFF;
}

.custom-textarea:focus {
  border-color: #999;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  background: #FFFFFF;
}

.textarea-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-hint {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

.textarea-count {
  font-size: 12px;
  color: #999;
}

.btn {
  border-radius: 0;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #E0E0E0;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  outline: none;
}

.btn-secondary {
  background: #FFFFFF;
  color: #1a1a1a;
}

.btn-secondary:hover {
  background: #F5F5F5;
  border-color: #CCCCCC;
}

.btn-primary {
  background: #0f172a;
  border-color: #0f172a;
  color: #FFFFFF;
}

.btn-primary:hover:not(:disabled) {
  background: #1e293b;
  border-color: #1e293b;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-loading {
  display: inline-flex;
  align-items: center;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

