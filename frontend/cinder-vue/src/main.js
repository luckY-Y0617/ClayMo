import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import App from './App.vue'
import router from './router'
import './styles/main.css'
import 'tippy.js/dist/tippy.css'

// 导入权限相关
import { permissionDirective } from './permission'
import PermissionGate from './components/PermissionGate.vue'

// 导入认证相关
import { useAuthStore } from './stores/auth'
import { usePermissionStore } from './stores/permission'
import { useTenantStore } from './stores/tenant'
import { useTeamStore } from './stores/team'
import { clearAuthLocalStorage } from './utils/authStorage'
import 'highlight.js/styles/github.css'


console.log('🚀 应用开始初始化...')

/**
 * 初始化多标签页同步登出监听
 * 当其他标签页触发登出时，当前标签页也会同步登出
 */
function setupMultiTabLogoutSync() {
  window.addEventListener('storage', (event) => {
    // 监听 auth.logout_at 的变化
    if (event.key === 'auth.logout_at' && event.newValue) {
      console.log('检测到其他标签页触发登出，同步登出当前标签页')
      
      // 清除认证相关的 localStorage（包括 auth.logout_at）
      clearAuthLocalStorage()
      
      // 重置 store（需要在 pinia 实例创建后使用）
      // 这里使用 setTimeout 确保 pinia 已经初始化
      setTimeout(() => {
        try {
          const authStore = useAuthStore()
          const permissionStore = usePermissionStore()
          const tenantStore = useTenantStore()
          const teamStore = useTeamStore()
          
          authStore.reset()
          permissionStore.reset()
          tenantStore.setTenant('') // 清除 tenantId
          teamStore.reset() // 清除团队上下文
          
          // 如果当前不在登录页，则跳转
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

try {
  const app = createApp(App)
  const pinia = createPinia()

  // 注册 Element Plus 图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  // 注册权限指令
  app.directive('permission', permissionDirective)

  // 注册权限门控组件
  app.component('PermissionGate', PermissionGate)

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })

  // 初始化多标签页同步登出监听
  setupMultiTabLogoutSync()

  // 应用挂载后，如果从 localStorage 恢复了登录状态，同步恢复权限
  app.mount('#app')
  
  // 在应用挂载后初始化权限（如果已登录）
  setTimeout(() => {
    try {
      const authStore = useAuthStore()
      const permissionStore = usePermissionStore()
      const teamStore = useTeamStore()
      
      // 如果已登录且有权限数据，恢复权限
      if (authStore.isAuthenticated && authStore.permissions && authStore.permissions.length > 0) {
        permissionStore.setPermissions(authStore.permissions)
      }

      // 如果已登录且团队上下文未加载，初始化 my-teams
      if (authStore.isAuthenticated && !teamStore.loaded) {
        teamStore.loadMyTeams().catch((e) => console.warn('初始化团队上下文失败', e))
      }
    } catch (e) {
      console.warn('初始化权限时出错:', e)
    }
  }, 0)
  console.log('✅ 应用已成功挂载')
} catch (error) {
  console.error('❌ 应用初始化失败:', error)
  // 显示错误信息
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace;">
      <h1>应用初始化失败</h1>
      <pre>${error.stack || error.message}</pre>
    </div>
  `
}

