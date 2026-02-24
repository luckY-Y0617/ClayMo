/**
 * 应用入口
 */
import { createApp, type ComponentPublicInstance } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import App from './App.vue'
import router from './router'
import { pinia, useAuthStore, usePermissionStore, useTeamStore } from './stores'

// Element Plus 样式
import 'element-plus/dist/index.css'
import './styles/main.scss'

// 代码高亮样式（用于编辑器代码块）
// highlight.js 样式已内置在 main.scss 中

// Element Plus 配置（用于 ConfigProvider）
export const elementPlusConfig = {
  locale: zhCn,
}

// ============ 全局错误边界 ============

/**
 * 设置全局错误处理器
 */
function setupErrorHandlers(app: ReturnType<typeof createApp>): void {
  /**
   * Vue 组件渲染错误处理
   * 捕获组件生命周期、渲染函数、事件处理器中的错误
   */
  app.config.errorHandler = (
    err: unknown,
    instance: ComponentPublicInstance | null,
    info: string
  ) => {
    // 生产环境不输出详细错误到控制台
    if (import.meta.env.DEV) {
      console.error('🔴 Vue 错误:', err)
      console.error('  组件:', instance?.$options?.name || '未知')
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
    app.config.warnHandler = (msg, _instance, trace) => {
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
}

/**
 * 初始化多标签页同步登出监听
 */
function setupMultiTabLogoutSync(): void {
  window.addEventListener('storage', (event) => {
    if (event.key === 'auth.logout_at' && event.newValue) {
      console.log('检测到其他标签页触发登出，同步登出当前标签页')

      setTimeout(() => {
        try {
          const authStore = useAuthStore()
          authStore.reset()

          if (router.currentRoute.value.name !== 'Login') {
            router.replace({
              name: 'Login',
              query: { reason: 'multi_tab_logout' },
            })
          }
        } catch (e) {
          console.error('同步登出时出错:', e)
        }
      }, 0)
    }
  })
}

async function bootstrap(): Promise<void> {
  const app = createApp(App)

  // 设置全局错误处理器
  setupErrorHandlers(app)

  // 注册 Element Plus 图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })

  // 初始化多标签页同步登出监听
  setupMultiTabLogoutSync()

  app.mount('#app')

  // 在应用挂载后初始化用户信息
  setTimeout(async () => {
    try {
      const authStore = useAuthStore()
      const permissionStore = usePermissionStore()
      const teamStore = useTeamStore()

      // 如果已登录但权限或团队信息未加载，则重新获取用户信息
      if (authStore.isAuthenticated && (!permissionStore.initialized || !teamStore.loaded)) {
        try {
          await authStore.fetchCurrentUser()
        } catch (error) {
          console.warn('初始化用户信息失败:', error)
        }
      }
    } catch (e) {
      console.warn('初始化时出错:', e)
    }
  }, 0)

  console.log('✅ 应用已成功挂载')
}

bootstrap().catch((error) => {
  console.error('❌ 应用初始化失败:', error)
})

