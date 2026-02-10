<script setup lang="ts">
import { ref, computed } from 'vue'

// Hangfire Dashboard URL（通过网关代理访问，自动携带 cookie）
const hangfireUrl = computed(() => {
  // 在开发环境使用代理路径，生产环境使用相对路径
  return '/api/hangfire'
})

const iframeRef = ref<HTMLIFrameElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// 全屏模式
const isFullscreen = ref(false)

// iframe 加载完成
const onIframeLoad = () => {
  loading.value = false
  error.value = null
}

// iframe 加载失败
const onIframeError = () => {
  loading.value = false
  error.value = '无法加载任务调度面板，请检查后端服务是否正常运行。'
}

// 刷新 iframe
const refreshDashboard = () => {
  if (iframeRef.value) {
    loading.value = true
    error.value = null
    iframeRef.value.src = hangfireUrl.value
  }
}

// 切换全屏模式
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 在新标签页打开
const openInNewTab = () => {
  window.open(hangfireUrl.value, '_blank')
}

onMounted(() => {
  // 监听 iframe 消息（可选：用于 Hangfire 与父页面通信）
  window.addEventListener('message', (event) => {
    // 可以在这里处理来自 Hangfire Dashboard 的消息
    console.log('Message from Hangfire:', event.data)
  })
})
</script>

<template>
  <div class="scheduler-container" :class="{ fullscreen: isFullscreen }">
    <!-- 工具栏 -->
    <div class="scheduler-toolbar">
      <div class="toolbar-left">
        <h2 class="page-title">
          <el-icon><Operation /></el-icon>
          <span>任务调度中心</span>
        </h2>
        <el-tag type="success" size="small" class="status-tag">
          <el-icon class="status-icon"><CircleCheck /></el-icon>
          运行中
        </el-tag>
      </div>
      <div class="toolbar-right">
        <el-button-group>
          <el-tooltip content="刷新面板" placement="top">
            <el-button :icon="Refresh" @click="refreshDashboard" :loading="loading" />
          </el-tooltip>
          <el-tooltip :content="isFullscreen ? '退出全屏' : '全屏显示'" placement="top">
            <el-button :icon="isFullscreen ? Aim : FullScreen" @click="toggleFullscreen" />
          </el-tooltip>
          <el-tooltip content="新标签页打开" placement="top">
            <el-button :icon="TopRight" @click="openInNewTab" />
          </el-tooltip>
        </el-button-group>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="scheduler-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading-content">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span>正在加载任务调度面板...</span>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-if="error" class="error-overlay">
        <el-result icon="error" title="加载失败" :sub-title="error">
          <template #extra>
            <el-button type="primary" @click="refreshDashboard">重新加载</el-button>
          </template>
        </el-result>
      </div>

      <!-- Hangfire Dashboard iframe -->
      <iframe
        ref="iframeRef"
        :src="hangfireUrl"
        class="hangfire-iframe"
        frameborder="0"
        @load="onIframeLoad"
        @error="onIframeError"
        allow="fullscreen"
      />
    </div>

    <!-- 底部信息栏 -->
    <div class="scheduler-footer">
      <div class="footer-left">
        <el-icon><InfoFilled /></el-icon>
        <span>任务调度基于 Hangfire 构建，支持延迟任务、定时任务、周期任务等多种模式</span>
      </div>
      <div class="footer-right">
        <el-link type="primary" href="https://docs.hangfire.io" target="_blank" underline="never">
          查看文档
          <el-icon><TopRight /></el-icon>
        </el-link>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Operation, Refresh, FullScreen, Aim, TopRight, Loading, CircleCheck, InfoFilled } from '@element-plus/icons-vue'

export default {
  components: {
    Operation,
    Refresh,
    FullScreen,
    Aim,
    TopRight,
    Loading,
    CircleCheck,
    InfoFilled
  }
}
</script>

<style lang="scss" scoped>
.scheduler-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  background: var(--bg-primary, #0f172a);
  padding: 20px;
  gap: 16px;

  &.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    height: 100vh;
    padding: 16px;
  }
}

.scheduler-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-secondary, #1e293b);
  border-radius: 12px;
  border: 1px solid var(--border-color, #334155);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #f1f5f9);

  .el-icon {
    font-size: 22px;
    color: var(--primary-color, #3b82f6);
  }
}

.status-tag {
  :deep(.el-tag__content) {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .status-icon {
    font-size: 12px;
  }
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scheduler-content {
  flex: 1;
  position: relative;
  background: var(--bg-secondary, #1e293b);
  border-radius: 12px;
  border: 1px solid var(--border-color, #334155);
  overflow: hidden;
}

.hangfire-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
  border-radius: 8px;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-secondary, #1e293b);
  z-index: 10;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--text-muted, #94a3b8);

  .loading-icon {
    font-size: 48px;
    color: var(--primary-color, #3b82f6);
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.scheduler-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-secondary, #1e293b);
  border-radius: 12px;
  border: 1px solid var(--border-color, #334155);
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;

  .el-icon {
    font-size: 16px;
    color: var(--primary-color, #3b82f6);
  }
}

.footer-right {
  .el-link {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;

    .el-icon {
      font-size: 12px;
    }
  }
}

// 响应式适配
@media (max-width: 768px) {
  .scheduler-container {
    padding: 12px;
  }

  .scheduler-toolbar {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: center;
  }

  .scheduler-footer {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}
</style>

