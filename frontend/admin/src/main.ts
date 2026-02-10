import { createApp, type ComponentPublicInstance } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import App from './App.vue'
import router from './router'

// Element Plus 样式（按需引入组件时仍需基础样式）
import 'element-plus/dist/index.css'
import '@/styles/index.scss'

const app = createApp(App)

// ============ 全局错误边界 ============

/**
 * Vue 组件渲染错误处理
 * 捕获组件生命周期、渲染函数、事件处理器中的错误
 */
app.config.errorHandler = (
  err: unknown,
  _instance: ComponentPublicInstance | null,
  info: string
) => {
  // 生产环境不输出详细错误到控制台
  if (import.meta.env.DEV) {
    console.error('🔴 Vue 错误:', err)
    console.error('  组件:', _instance?.$options?.name || '未知')
    console.error('  信息:', info)
  }

  // 用户友好提示
  ElMessage.error({
    message: '页面发生错误，请刷新重试',
    duration: 5000,
    showClose: true,
  })

  // TODO: 生产环境可上报到 Sentry 等监控平台
  // if (import.meta.env.PROD) {
  //   reportError({ error: err, component: instance?.$options?.name, info })
  // }
}

/**
 * Vue 警告处理（仅开发环境）
 */
if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('⚠️ Vue 警告:', msg)
    if (trace) console.warn('  追踪:', trace)
  }
}

/**
 * 全局未捕获 Promise 错误
 */
window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.DEV) {
    console.error('🔴 未处理的 Promise 错误:', event.reason)
  }

  // 防止默认处理（避免重复报错）
  event.preventDefault()
})

/**
 * 全局 JavaScript 错误
 */
window.addEventListener('error', (event) => {
  // 忽略资源加载错误（图片、脚本等）
  if (event.target !== window) return

  if (import.meta.env.DEV) {
    console.error('🔴 全局 JS 错误:', event.error)
  }
})

// Pinia
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// Router
app.use(router)

// Element Plus 组件已通过 unplugin-vue-components 按需自动导入
// locale 配置通过 App.vue 中的 ElConfigProvider 设置

// 注册所有 Element Plus 图标（确保图标都能正常显示）
for (const [name, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(name, component)
}

app.mount('#app')

