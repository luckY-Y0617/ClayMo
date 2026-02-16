<template>
  <section class="tool-page">
    <!-- 顶部工具栏 -->
    <header class="page-toolbar">
      <div class="toolbar-left">
        <router-link to="/tools" class="back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          返回工具台
        </router-link>
        <div class="toolbar-divider"></div>
        <div class="toolbar-title">
          <p class="lab-eyebrow">图片工具</p>
          <h1>图片裁剪器</h1>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="btn ghost" @click="showHelp = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          使用帮助
        </button>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="page-content">
      <ImageCropper @crop="handleCrop" />
    </main>

    <!-- 使用帮助弹窗 -->
    <div v-if="showHelp" class="modal-overlay" @click="showHelp = false">
      <div class="modal-card" @click.stop>
        <header class="modal-header">
          <div>
            <p class="lab-eyebrow">帮助中心</p>
            <h3>使用帮助</h3>
          </div>
          <button class="btn-close" @click="showHelp = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </header>
        <div class="modal-body">
          <div class="help-section">
            <h4>基本操作</h4>
            <ul>
              <li>拖拽图片到裁剪区域或点击"更换图片"按钮选择图片</li>
              <li>调整裁剪框的位置和大小</li>
              <li>设置输出尺寸或选择预设比例</li>
              <li>点击"导出裁剪"保存图片</li>
            </ul>
          </div>
          <div class="help-section">
            <h4>快捷操作</h4>
            <ul>
              <li>拖拽裁剪框移动位置</li>
              <li>拖拽角点调整裁剪区域</li>
              <li>使用预设尺寸快速设置常用尺寸</li>
              <li>支持自由比例或锁定宽高比</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 裁剪成功提示 -->
    <div v-if="cropSuccess" class="toast-success">
      <div class="toast-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>图片裁剪完成！</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import ImageCropper from '@/components/image/ImageCropper.vue'

const showHelp = ref(false)
const cropSuccess = ref(false)

const handleCrop = (result) => {
  cropSuccess.value = true
  setTimeout(() => {
    cropSuccess.value = false
  }, 3000)
  
  console.log('裁剪结果:', result)
}
</script>

<style scoped>
.tool-page {
  min-height: 100vh;
  background: #FAFBFC;
  display: flex;
  flex-direction: column;
}

/* 顶部工具栏 */
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 48px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--surface-divider, rgba(226, 232, 240, 0.9));
  position: sticky;
  top: 0;
  z-index: 100;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--surface-divider, #d7e0ea);
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-secondary, #475569);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.18s ease;
}

.back-link:hover {
  border-color: #0f172a;
  color: #0f172a;
}

.toolbar-divider {
  width: 1px;
  height: 32px;
  background: var(--surface-divider, #e2e8f0);
}

.toolbar-title h1 {
  margin: 4px 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 主内容区域 */
.page-content {
  flex: 1;
  padding: 32px 48px 48px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* 通用按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.18s ease;
}

.btn.ghost {
  border-color: var(--surface-divider, #d7e0ea);
  color: var(--text-secondary, #475569);
  background: rgba(255, 255, 255, 0.8);
}

.btn.ghost:hover {
  border-color: #0f172a;
  color: #0f172a;
}

/* 标签样式 */
.lab-eyebrow {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-tertiary, #94a3b8);
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal-card {
  background: var(--surface-card, #fffdfb);
  border-radius: 28px;
  border: 1px solid var(--surface-divider, rgba(226, 232, 240, 0.9));
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.2);
  max-width: 560px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 0;
}

.modal-header h3 {
  margin: 6px 0 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.btn-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--surface-divider, #d7e0ea);
  border-radius: 12px;
  color: var(--text-secondary, #475569);
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-close:hover {
  border-color: #0f172a;
  color: #0f172a;
}

.modal-body {
  padding: 20px 24px 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.help-section {
  margin-bottom: 20px;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  margin: 0 0 12px 0;
}

.help-section ul {
  margin: 0;
  padding-left: 20px;
}

.help-section li {
  font-size: 0.9rem;
  color: var(--text-secondary, #475569);
  line-height: 1.7;
  margin-bottom: 8px;
}

.help-section li:last-child {
  margin-bottom: 0;
}

/* 成功提示 */
.toast-success {
  position: fixed;
  top: 24px;
  right: 24px;
  background: #0f172a;
  color: #fff;
  padding: 14px 20px;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.35);
  z-index: 1001;
  animation: slideIn 0.3s ease;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  font-weight: 600;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 992px) {
  .page-toolbar {
    padding: 16px 24px;
  }
  
  .page-content {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .page-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;
  }
  
  .toolbar-left {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .toolbar-divider {
    display: none;
  }
  
  .toolbar-right {
    width: 100%;
  }
  
  .toolbar-right .btn {
    flex: 1;
    justify-content: center;
  }
  
  .page-content {
    padding: 20px 16px;
  }
  
  .modal-card {
    margin: 16px;
    border-radius: 20px;
  }
  
  .modal-header {
    padding: 20px 20px 0;
  }
  
  .modal-body {
    padding: 16px 20px 20px;
  }
}

@media (max-width: 480px) {
  .toolbar-title h1 {
    font-size: 1.25rem;
  }
  
  .back-link span {
    display: none;
  }
}
</style>
