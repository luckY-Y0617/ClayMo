<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container" @click.stop>
          <!-- 头部 -->
          <div class="modal-header">
            <h3 class="modal-title">删除文档</h3>
            <button class="modal-close" @click="handleClose">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body">
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
          </div>

          <!-- 底部 -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
            <button
              type="button"
              class="btn btn-danger"
              :disabled="submitting"
              @click="handleConfirm"
            >
              <span v-if="submitting" class="btn-loading">
                <svg class="spinner" width="14" height="14" viewBox="0 0 14 14">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                    <animate attributeName="stroke-dashoffset" values="31.416;0;31.416" dur="1s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              </span>
              <span v-else>确认删除</span>
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
  title: {
    type: String,
    default: '未命名文档',
  },
  hasChildren: {
    type: Boolean,
    default: false,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.alert-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: #FFF5F5;
  border: 1px solid rgba(245, 63, 63, 0.2);
  border-radius: 0;
}

.alert-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-text {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
  line-height: 1.5;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
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

.custom-checkbox:hover {
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

.checkbox-label {
  font-size: 14px;
  color: #1a1a1a;
  user-select: none;
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

.btn-danger {
  background: #f53f3f;
  border-color: #f53f3f;
  color: #FFFFFF;
}

.btn-danger:hover:not(:disabled) {
  background: #d93636;
  border-color: #d93636;
}

.btn-danger:active:not(:disabled) {
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
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
