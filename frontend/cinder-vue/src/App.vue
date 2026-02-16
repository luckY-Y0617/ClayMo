<template>
  <div id="app">
    <router-view v-slot="{ Component, route }">
      <template v-if="Component">
        <keep-alive include="KnowledgeOverviewPage,KnowledgeSettingsPage">
          <component
            v-if="route.meta.keepAlive"
            :is="Component"
          />
        </keep-alive>
        <component
          v-if="!route.meta.keepAlive"
          :is="Component"
        />
      </template>
    </router-view>
  </div>
</template>

<script setup>
import { onErrorCaptured, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAutoLogout } from '@/composables/useAutoLogout'

// 捕获组件错误
onErrorCaptured((err, instance, info) => {
  console.error('组件错误:', err, info)
  return false
})

// 初始化自动登出机制
const authStore = useAuthStore()
const { init, cleanup } = useAutoLogout()

// 监听登录状态变化，启动/停止自动登出检测
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      // 用户已登录，启动自动登出检测
      init()
    } else {
      // 用户已登出，清理自动登出检测
      cleanup()
    }
  },
  { immediate: true }
)

// 组件挂载时，如果已登录则启动自动登出检测
onMounted(() => {
  if (authStore.isAuthenticated) {
    init()
  }
})
</script>

<style>
#app {
  width: 100%;
  min-height: 100vh;
  /* 允许页面按照内容高度滚动，仅横向隐藏溢出 */
  overflow-x: hidden;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "HarmonyOS Sans", "Source Sans 3", "PingFang SC", "Segoe UI", system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* 避免因隐藏滚动条造成的居中偏移 */
  scrollbar-gutter: stable;
}

</style>

