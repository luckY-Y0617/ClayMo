<template>
  <BaseModal :model-value="modelValue" container-class="export-modal" @update:model-value="$emit('update:modelValue', $event)">
    <template #header>
      <h3 class="modal-title">导出文档</h3>
      <button class="modal-close" @click="handleClose">
        <el-icon :size="16"><Close /></el-icon>
      </button>
    </template>

    <template #body>
      <form class="modal-form" @submit.prevent="handleSubmit">
        <div class="form-item">
          <label class="form-label">导出格式</label>
          <div class="checkbox-group">
            <label class="checkbox-wrapper">
              <input v-model="form.formats" type="checkbox" value="markdown" class="custom-checkbox" />
              <span class="checkbox-label">Markdown (.md)</span>
            </label>
            <label class="checkbox-wrapper">
              <input v-model="form.formats" type="checkbox" value="html" class="custom-checkbox" />
              <span class="checkbox-label">HTML (.html)</span>
            </label>
            <label class="checkbox-wrapper disabled">
              <input type="checkbox" value="pdf" class="custom-checkbox" disabled />
              <span class="checkbox-label">PDF (.pdf)</span>
            </label>
            <label class="checkbox-wrapper disabled">
              <input type="checkbox" value="word" class="custom-checkbox" disabled />
              <span class="checkbox-label">Word (.docx)</span>
            </label>
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">附加选项</label>
          <div class="checkbox-group">
            <label class="checkbox-wrapper">
              <input v-model="form.includeImages" type="checkbox" class="custom-checkbox" />
              <span class="checkbox-label">资源一并导出</span>
            </label>
            <label class="checkbox-wrapper">
              <input v-model="form.keepInternalLinks" type="checkbox" class="custom-checkbox" />
              <span class="checkbox-label">保留内部链接</span>
            </label>
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">导出范围</label>
          <div class="radio-group">
            <label class="radio-wrapper">
              <input v-model="form.scope" type="radio" value="current" class="custom-radio" />
              <span class="radio-label">当前文档</span>
            </label>
            <label class="radio-wrapper">
              <input v-model="form.scope" type="radio" value="with-children" class="custom-radio" />
              <span class="radio-label">当前文档 + 子文档</span>
            </label>
          </div>
        </div>

        <div v-if="progress >= 0" class="form-item">
          <div class="progress-wrapper">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <span class="progress-text">{{ progress }}%</span>
          </div>
        </div>
      </form>
    </template>

    <template #footer>
      <button type="button" class="btn btn-secondary" :disabled="exporting" @click="handleClose">取消</button>
      <button type="button" class="btn btn-primary" :disabled="!form.formats.length || exporting" @click="handleSubmit">
        <span v-if="exporting" class="btn-loading">
          <el-icon class="is-loading" :size="14"><Loading /></el-icon>
        </span>
        <span v-else>开始导出</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Close, Loading } from '@element-plus/icons-vue'
import BaseModal from './BaseModal.vue'

interface Props {
  modelValue: boolean
  exporting?: boolean
  progress?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  exporting: false,
  progress: -1,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [data: { formats: string[]; includeImages: boolean; keepInternalLinks: boolean; scope: string }]
}>()

const form = reactive({
  formats: ['markdown'] as string[],
  includeImages: true,
  keepInternalLinks: true,
  scope: 'current',
})

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      Object.assign(form, {
        formats: ['markdown'],
        includeImages: true,
        keepInternalLinks: true,
        scope: 'current',
      })
    }
  }
)

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSubmit = () => {
  emit('submit', { ...form })
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

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-wrapper.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid #E0E0E0;
  border-radius: 0;
  background: #FFFFFF;
  cursor: pointer;
  appearance: none;
  position: relative;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.custom-checkbox:hover:not(:disabled) {
  border-color: #999;
}

.custom-checkbox:checked {
  background: #0f172a;
  border-color: #0f172a;
}

.custom-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.custom-checkbox:disabled {
  cursor: not-allowed;
}

.checkbox-label {
  font-size: 14px;
  color: #1a1a1a;
  user-select: none;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.custom-radio {
  width: 18px;
  height: 18px;
  border: 2px solid #E0E0E0;
  border-radius: 50%;
  background: #FFFFFF;
  cursor: pointer;
  appearance: none;
  position: relative;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.custom-radio:hover {
  border-color: #999;
}

.custom-radio:checked {
  border-color: #0f172a;
  background: #FFFFFF;
}

.custom-radio:checked::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: #0f172a;
  border-radius: 50%;
}

.radio-label {
  font-size: 14px;
  color: #1a1a1a;
  user-select: none;
}

.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #F5F5F5;
  border-radius: 0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #0f172a;
  border-radius: 0;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: right;
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

.btn-secondary:hover:not(:disabled) {
  background: #F5F5F5;
  border-color: #CCCCCC;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.btn-primary:disabled {
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

