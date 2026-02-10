<template>
  <BaseModal
    :model-value="modelValue"
    container-class="create-base-modal"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- 头部 -->
    <template #header>
      <h3 class="modal-title">新建知识库</h3>
      <button class="modal-close" @click="handleClose">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 4L4 12M4 4l8 8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </template>

    <!-- 内容 -->
    <template #body>
      <form class="modal-form" @submit.prevent="handleSubmit">
        <!-- 图标选择 -->
        <div class="form-item">
          <label class="form-label">图标</label>
          <div class="icon-picker">
            <button
              v-for="icon in iconOptions"
              :key="icon.key"
              type="button"
              class="icon-option"
              :class="{ active: form.icon === icon.key }"
              :title="icon.label"
              @click="form.icon = icon.key"
            >
              <span class="icon-emoji">{{ icon.emoji }}</span>
            </button>
          </div>
        </div>

        <!-- 知识库名称 -->
        <div class="form-item">
          <label class="form-label required">知识库名称</label>
          <div class="input-wrapper">
            <input
              v-model="form.name"
              type="text"
              class="custom-input"
              :class="{ 'has-error': nameError }"
              placeholder="输入知识库名称"
              maxlength="50"
              @blur="validateName"
              @input="nameError = ''"
            />
            <span class="input-count">{{ form.name.length }} / 50</span>
          </div>
          <p v-if="nameError" class="error-message">{{ nameError }}</p>
        </div>

        <!-- 描述 -->
        <div class="form-item">
          <label class="form-label">描述</label>
          <div class="textarea-wrapper">
            <textarea
              v-model="form.description"
              class="custom-textarea"
              placeholder="简要描述知识库内容（可选）"
              maxlength="200"
              rows="3"
            ></textarea>
            <span class="textarea-count">{{ form.description.length }} / 200</span>
          </div>
        </div>

        <!-- 可见性 -->
        <div class="form-item">
          <label class="form-label">可见性</label>
          <div class="visibility-options">
            <button
              v-for="option in visibilityOptions"
              :key="option.value"
              type="button"
              class="visibility-option"
              :class="{ active: form.visibility === option.value }"
              @click="form.visibility = option.value"
            >
              <span class="visibility-icon">{{ option.icon }}</span>
              <div class="visibility-text">
                <span class="visibility-label">{{ option.label }}</span>
                <span class="visibility-desc">{{ option.description }}</span>
              </div>
            </button>
          </div>
        </div>
      </form>
    </template>

    <!-- 底部 -->
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
      <button type="button" class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
        <span v-if="submitting" class="btn-loading">
          <svg class="spinner" width="14" height="14" viewBox="0 0 14 14">
            <circle
              cx="7"
              cy="7"
              r="6"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
              stroke-dasharray="31.416"
              stroke-dashoffset="31.416"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="31.416;0;31.416"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </span>
        <span v-else>创建</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'

// 图标选项
const iconOptions = [
  { key: 'icon_default', emoji: '📚', label: '默认' },
  { key: 'icon_book', emoji: '📖', label: '书籍' },
  { key: 'icon_code', emoji: '💻', label: '代码' },
  { key: 'icon_idea', emoji: '💡', label: '想法' },
  { key: 'icon_star', emoji: '⭐', label: '收藏' },
  { key: 'icon_folder', emoji: '📁', label: '文件夹' },
  { key: 'icon_note', emoji: '📝', label: '笔记' },
  { key: 'icon_rocket', emoji: '🚀', label: '项目' },
]

// 可见性选项
const visibilityOptions = [
  {
    value: 0,
    label: '私有',
    icon: '🔒',
    description: '仅自己可见',
  },
  {
    value: 1,
    label: '团队可见',
    icon: '👥',
    description: '团队成员可见',
  },
  {
    value: 2,
    label: '公开',
    icon: '🌐',
    description: '所有人可见',
  },
]

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
  submit: [payload: { name: string; description: string; icon: string; visibility: number }]
}>()

// Form State
const form = reactive({
  name: '',
  description: '',
  icon: 'icon_default',
  visibility: 0,
})

const nameError = ref('')

// Validation
const validateName = (): boolean => {
  if (!form.name.trim()) {
    nameError.value = '请输入知识库名称'
    return false
  }
  nameError.value = ''
  return true
}

const resetForm = () => {
  form.name = ''
  form.description = ''
  form.icon = 'icon_default'
  form.visibility = 0
  nameError.value = ''
}

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSubmit = () => {
  if (!validateName()) return
  emit('submit', { ...form })
}

// Watch modal visibility
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetForm()
    }
  }
)
</script>

<style scoped>
/* 表单样式 */
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
  font-weight: 500;
  color: #666;
}

.form-label.required::before {
  content: '* ';
  color: #f53f3f;
}

/* 图标选择器 */
.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 40px;
  height: 40px;
  border: 1px solid #E0E0E0;
  background: #F7F7F7;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-option:hover {
  background: #FFFFFF;
  border-color: #999;
}

.icon-option.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.icon-emoji {
  font-size: 18px;
}

/* 输入框 */
.input-wrapper,
.textarea-wrapper {
  position: relative;
}

.custom-input {
  width: 100%;
  padding: 10px 14px;
  padding-right: 60px;
  border-radius: 0;
  border: 1px solid #E0E0E0;
  background: #F7F7F7;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.custom-input:hover {
  border-color: #CCCCCC;
  background: #FFFFFF;
}

.custom-input:focus {
  border-color: #999;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  background: #FFFFFF;
}

.custom-input.has-error {
  border-color: #f53f3f;
}

.input-count,
.textarea-count {
  position: absolute;
  right: 12px;
  font-size: 12px;
  color: #999;
  pointer-events: none;
}

.input-count {
  top: 50%;
  transform: translateY(-50%);
}

.textarea-count {
  bottom: 10px;
}

.error-message {
  font-size: 12px;
  color: #f53f3f;
  margin: 0;
}

/* 文本域 */
.custom-textarea {
  width: 100%;
  padding: 10px 14px;
  padding-bottom: 28px;
  border-radius: 0;
  border: 1px solid #E0E0E0;
  background: #F7F7F7;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
  outline: none;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
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

/* 可见性选项 */
.visibility-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.visibility-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #E0E0E0;
  background: #F7F7F7;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.visibility-option:hover {
  background: #FFFFFF;
  border-color: #CCCCCC;
}

.visibility-option.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.visibility-option.active .visibility-label,
.visibility-option.active .visibility-desc {
  color: #FFFFFF;
}

.visibility-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.visibility-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.visibility-label {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.visibility-desc {
  font-size: 12px;
  color: #999;
}

/* 按钮 */
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
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #FFFFFF;
}

.btn-primary:hover:not(:disabled) {
  background: #333;
  border-color: #333;
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
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

