<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container kb-modal-container" @click.stop>
          <!-- 头部 -->
          <div class="modal-header">
            <h3 class="modal-title">重命名文档</h3>
            <button class="modal-close" @click="handleClose">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body">
            <form @submit.prevent="handleSubmit" class="modal-form">
              <!-- 当前标题 -->
              <div class="form-item">
                <label class="form-label">当前标题</label>
                <input
                  :value="originalTitle"
                  type="text"
                  class="custom-input disabled"
                  disabled
                />
              </div>

              <!-- 新标题 -->
              <div class="form-item">
                <label class="form-label required">新标题</label>
                <div class="input-wrapper">
                  <input
                    v-model="form.title"
                    type="text"
                    class="custom-input"
                    :class="{ 'has-error': titleError }"
                    placeholder="请输入新标题"
                    maxlength="80"
                    @blur="validateTitle"
                    @input="titleError = ''"
                  />
                  <span class="input-count">{{ form.title.length }} / 80</span>
                </div>
                <p v-if="titleError" class="error-message">{{ titleError }}</p>
              </div>
            </form>
          </div>

          <!-- 底部 -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="submitting"
              @click="handleSubmit"
            >
              <span v-if="submitting" class="btn-loading">
                <svg class="spinner" width="14" height="14" viewBox="0 0 14 14">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                    <animate attributeName="stroke-dashoffset" values="31.416;0;31.416" dur="1s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              </span>
              <span v-else>保存</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  originalTitle: {
    type: String,
    default: '',
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const form = reactive({
  title: '',
})

const titleError = ref('')

const validateTitle = () => {
  if (!form.title.trim()) {
    titleError.value = '请输入标题'
    return false
  }
  titleError.value = ''
  return true
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.title = props.originalTitle
      titleError.value = ''
    }
  }
)

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSubmit = () => {
  if (!validateTitle()) return
  emit('submit', { title: form.title })
}
</script>

<style scoped>
/* 遮罩层 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

/* 对话框容器 */
.modal-container {
  width: 420px;
  max-width: 90vw;
  max-height: 90vh;
  background: #FFFFFF;
  border-radius: 0;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #E8E8E8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
.modal-header {
  padding: 24px 28px;
  background: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.01em;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #F5F5F5;
  color: #1a1a1a;
}

/* 内容区 */
.modal-body {
  padding: 28px;
  background: #FFFFFF;
  overflow-y: auto;
  flex: 1;
}

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
  color: var(--text-secondary);
  font-weight: 500;
}

.form-label.required::before {
  content: '* ';
  color: #f53f3f;
}

/* 输入框 */
.input-wrapper {
  position: relative;
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

.custom-input:hover:not(.disabled) {
  border-color: #CCCCCC;
  background: #FFFFFF;
}

.custom-input:focus:not(.disabled) {
  border-color: #999;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  background: #FFFFFF;
}

.custom-input.has-error {
  border-color: #f53f3f;
}

.custom-input.disabled {
  background: #F5F5F5;
  border-color: #E0E0E0;
  cursor: not-allowed;
  color: #999;
}

.input-count {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.error-message {
  font-size: 12px;
  color: #f53f3f;
  margin: 0;
}

/* 底部 */
.modal-footer {
  padding: 20px 28px 24px;
  background: #FFFFFF;
  border-top: 1px solid #E8E8E8;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
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

/* 过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
