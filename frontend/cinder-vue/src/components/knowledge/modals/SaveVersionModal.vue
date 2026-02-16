<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleCancel">
        <div class="modal-container" @click.stop>
          <!-- 头部 -->
          <div class="modal-header">
            <h3 class="modal-title">保存新版本</h3>
            <button class="modal-close" @click="handleCancel">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body">
            <form @submit.prevent="handleSubmit" class="modal-form">
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
          </div>

          <!-- 底部 -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="handleCancel">取消</button>
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
              <span v-else>保存版本</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const changeSummary = ref('')

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      // 关闭时清空内容
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
  width: 500px;
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

/* 过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
