import { onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * 自动登出 Composable
 * 
 * 实现场景：
 * 1. 空闲超时：用户长时间无操作
 * 2. 绝对会话时长：单次登录最长存活时间
 */
export function useAutoLogout() {
  const router = useRouter()
  const authStore = useAuthStore()

  // 配置常量
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 分钟
  const MAX_SESSION_MS = 8 * 60 * 60 * 1000 // 8 小时
  const CHECK_INTERVAL_MS = 60 * 1000 // 1 分钟
  const CHECK_SESSION_INTERVAL_MS = 5 * 60 * 1000 // 5 分钟
  const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']

  let lastActiveAt = Date.now()
  let idleCheckTimer = null
  let sessionCheckTimer = null
  let cleanupListeners = null

  /**
   * 更新最后活动时间
   */
  const updateLastActiveTime = () => {
    lastActiveAt = Date.now()
  }

  /**
   * 检查空闲超时
   */
  const checkIdleTimeout = () => {
    if (!authStore.isAuthenticated) {
      stopTimers()
      return
    }

    const idleTime = Date.now() - lastActiveAt
    if (idleTime > IDLE_TIMEOUT_MS) {
      console.log('用户空闲超时，自动登出')
      stopTimers()
      authStore.logout('idle').then(() => {
        router.replace({ name: 'Login', query: { reason: 'idle' } })
      })
    }
  }

  /**
   * 检查绝对会话时长
   */
  const checkMaxSession = () => {
    if (!authStore.isAuthenticated || !authStore.loginAt) {
      stopTimers()
      return
    }

    const sessionTime = Date.now() - authStore.loginAt
    if (sessionTime > MAX_SESSION_MS) {
      console.log('超过最大会话时长，自动登出')
      stopTimers()
      authStore.logout('max_session').then(() => {
        router.replace({ name: 'Login', query: { reason: 'max_session' } })
      })
    }
  }

  /**
   * 初始化事件监听
   */
  const setupActivityListeners = () => {
    ACTIVITY_EVENTS.forEach(eventType => {
      document.addEventListener(eventType, updateLastActiveTime, { passive: true })
    })

    return () => {
      ACTIVITY_EVENTS.forEach(eventType => {
        document.removeEventListener(eventType, updateLastActiveTime)
      })
    }
  }

  /**
   * 启动定时器
   */
  const startTimers = () => {
    stopTimers()
    idleCheckTimer = setInterval(checkIdleTimeout, CHECK_INTERVAL_MS)
    sessionCheckTimer = setInterval(checkMaxSession, CHECK_SESSION_INTERVAL_MS)
  }

  /**
   * 停止定时器
   */
  const stopTimers = () => {
    if (idleCheckTimer) {
      clearInterval(idleCheckTimer)
      idleCheckTimer = null
    }
    if (sessionCheckTimer) {
      clearInterval(sessionCheckTimer)
      sessionCheckTimer = null
    }
  }

  /**
   * 清理所有资源
   */
  const cleanup = () => {
    if (cleanupListeners) {
      cleanupListeners()
      cleanupListeners = null
    }
    stopTimers()
  }

  /**
   * 初始化自动登出机制
   */
  const init = () => {
    if (!authStore.isAuthenticated) {
      cleanup()
      return
    }

    lastActiveAt = Date.now()
    cleanupListeners = setupActivityListeners()
    startTimers()
  }

  onBeforeUnmount(cleanup)

  return {
    init,
    cleanup,
  }
}
