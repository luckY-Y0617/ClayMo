<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container" @click.stop>
          <!-- 头部 -->
          <div class="modal-header">
            <h3 class="modal-title">导出文档</h3>
            <button class="modal-close" @click="handleClose">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body">
            <form @submit.prevent="handleSubmit" class="modal-form">
              <!-- 导出格式 -->
              <div class="form-item">
                <label class="form-label">导出格式</label>
                <div class="checkbox-group">
                  <label class="checkbox-wrapper">
                    <input
                      v-model="form.formats"
                      type="checkbox"
                      value="markdown"
                      class="custom-checkbox"
                    />
                    <span class="checkbox-label">Markdown (.md)</span>
                  </label>
                  <label class="checkbox-wrapper">
                    <input
                      v-model="form.formats"
                      type="checkbox"
                      value="html"
                      class="custom-checkbox"
                    />
                    <span class="checkbox-label">HTML (.html)</span>
                  </label>
                  <label class="checkbox-wrapper disabled">
                    <input
                      type="checkbox"
                      value="pdf"
                      class="custom-checkbox"
                      disabled
                    />
                    <span class="checkbox-label">PDF (.pdf)</span>
                  </label>
                  <label class="checkbox-wrapper disabled">
                    <input
                      type="checkbox"
                      value="word"
                      class="custom-checkbox"
                      disabled
                    />
                    <span class="checkbox-label">Word (.docx)</span>
                  </label>
                </div>
              </div>

              <!-- 附加选项 -->
              <div class="form-item">
                <label class="form-label">附加选项</label>
                <div class="checkbox-group">
                  <label class="checkbox-wrapper">
                    <input
                      v-model="form.includeImages"
                      type="checkbox"
                      class="custom-checkbox"
                    />
                    <span class="checkbox-label">资源一并导出</span>
                  </label>
                  <label class="checkbox-wrapper">
                    <input
                      v-model="form.keepInternalLinks"
                      type="checkbox"
                      class="custom-checkbox"
                    />
                    <span class="checkbox-label">保留内部链接</span>
                  </label>
                </div>
              </div>

              <!-- 导出范围 -->
              <div class="form-item">
                <label class="form-label">导出范围</label>
                <div class="radio-group">
                  <label class="radio-wrapper">
                    <input
                      v-model="form.scope"
                      type="radio"
                      value="current"
                      class="custom-radio"
                    />
                    <span class="radio-label">当前文档</span>
                  </label>
                  <label class="radio-wrapper">
                    <input
                      v-model="form.scope"
                      type="radio"
                      value="with-children"
                      class="custom-radio"
                    />
                    <span class="radio-label">当前文档 + 子文档</span>
                  </label>
                </div>
              </div>

              <!-- 进度条 -->
              <div v-if="progress >= 0" class="form-item">
                <div class="progress-wrapper">
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: `${progress}%` }"
                    ></div>
                  </div>
                  <span class="progress-text">{{ progress }}%</span>
                </div>
              </div>
            </form>
          </div>

          <!-- 底部 -->
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              :disabled="exporting"
              @click="handleClose"
            >
              取消
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="!form.formats.length || exporting"
              @click="handleSubmit"
            >
              <span v-if="exporting" class="btn-loading">
                <svg class="spinner" width="14" height="14" viewBox="0 0 14 14">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                    <animate attributeName="stroke-dashoffset" values="31.416;0;31.416" dur="1s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              </span>
              <span v-else>开始导出</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  exporting: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Number,
    default: -1,
  },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const form = reactive({
  formats: ['markdown'],
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
  width: 520px;
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

/* 复选框组 */
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

/* 单选框组 */
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

/* 进度条 */
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

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
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
