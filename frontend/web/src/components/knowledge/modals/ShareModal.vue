<template>
  <BaseModal :model-value="modelValue" container-class="share-modal" @update:model-value="$emit('update:modelValue', $event)">
    <template #header>
      <h3 class="modal-title">分享设置</h3>
      <button class="modal-close" @click="handleClose">
        <el-icon :size="16"><Close /></el-icon>
      </button>
    </template>

    <template #body>
      <form class="modal-form" @submit.prevent="handleSubmit">
        <div class="form-item">
          <label class="form-label">链接可见性</label>
          <div class="radio-group">
            <label class="radio-wrapper">
              <input v-model="form.visibility" type="radio" value="private" class="custom-radio" />
              <span class="radio-label">私密（仅作者）</span>
            </label>
            <label class="radio-wrapper">
              <input v-model="form.visibility" type="radio" value="team" class="custom-radio" />
              <span class="radio-label">团队可见</span>
            </label>
            <label class="radio-wrapper">
              <input v-model="form.visibility" type="radio" value="public" class="custom-radio" />
              <span class="radio-label">公开链接</span>
            </label>
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">权限</label>
          <div class="checkbox-group">
            <label class="checkbox-wrapper" :class="{ disabled: isPrivate }">
              <input v-model="form.allowComment" type="checkbox" class="custom-checkbox" :disabled="isPrivate" />
              <span class="checkbox-label">允许评论</span>
            </label>
            <label class="checkbox-wrapper" :class="{ disabled: isPrivate }">
              <input v-model="form.allowEdit" type="checkbox" class="custom-checkbox" :disabled="isPrivate" />
              <span class="checkbox-label">允许编辑</span>
            </label>
          </div>
        </div>

        <div v-if="form.visibility === 'public'" class="form-item">
          <label class="form-label">链接有效期</label>
          <input v-model="form.expiresAt" type="datetime-local" class="custom-input" placeholder="可选，未设置则永久有效" />
        </div>

        <div v-if="form.visibility === 'public' && shareLink" class="form-item">
          <label class="form-label">分享链接</label>
          <div class="input-group">
            <input :value="shareLink" type="text" class="custom-input input-with-button" readonly />
            <button type="button" class="input-button" @click="copyLink">复制链接</button>
          </div>
        </div>
      </form>
    </template>

    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
      <button type="button" class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
        <span v-if="submitting" class="btn-loading">
          <el-icon class="is-loading" :size="14"><Loading /></el-icon>
        </span>
        <span v-else>保存设置</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Loading } from '@element-plus/icons-vue'
import BaseModal from './BaseModal.vue'

interface ShareSettings {
  visibility: 'private' | 'team' | 'public'
  allowComment: boolean
  allowEdit: boolean
  expiresAt: string
  shareLink: string
}

interface Props {
  modelValue: boolean
  settings?: Partial<ShareSettings>
  submitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  settings: () => ({
    visibility: 'private',
    allowComment: false,
    allowEdit: false,
    expiresAt: '',
    shareLink: '',
  }),
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [data: { visibility: string; allowComment: boolean; allowEdit: boolean; expiresAt: string }]
}>()

const form = reactive({
  visibility: 'private' as 'private' | 'team' | 'public',
  allowComment: false,
  allowEdit: false,
  expiresAt: '',
})

const shareLink = computed(() => props.settings?.shareLink || '')
const isPrivate = computed(() => form.visibility === 'private')

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      Object.assign(form, {
        visibility: props.settings?.visibility || 'private',
        allowComment: props.settings?.allowComment ?? false,
        allowEdit: props.settings?.allowEdit ?? false,
        expiresAt: props.settings?.expiresAt || '',
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

const copyLink = async () => {
  if (!shareLink.value) return
  try {
    await navigator.clipboard.writeText(shareLink.value)
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.error('复制失败')
  }
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

.radio-group {
  display: flex;
  flex-direction: row;
  gap: 20px;
  flex-wrap: wrap;
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

.checkbox-group {
  display: flex;
  flex-direction: row;
  gap: 20px;
  flex-wrap: wrap;
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

.custom-input {
  width: 100%;
  padding: 10px 14px;
  background: #F7F7F7;
  border: 1px solid #E0E0E0;
  border-radius: 0;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
  outline: none;
}

.custom-input::placeholder {
  color: #999;
}

.custom-input:hover:not(:disabled) {
  border-color: #CCCCCC;
  background: #FFFFFF;
}

.custom-input:focus:not(:disabled) {
  border-color: #999;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  background: #FFFFFF;
}

.input-group {
  display: flex;
  gap: 0;
}

.input-with-button {
  flex: 1;
  border-right: none;
}

.input-button {
  padding: 10px 16px;
  background: #0f172a;
  border: 1px solid #0f172a;
  border-radius: 0;
  font-size: 14px;
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-weight: 500;
}

.input-button:hover {
  background: #1e293b;
  border-color: #1e293b;
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

