<template>
  <div
    class="pomodoro-card"
    :class="{
      'is-running': isRunning,
      'is-paused': isPaused,
      'is-break': currentPhase === 'break',
    }"
  >
    <!-- 头部 -->
    <div class="pomodoro-header">
      <span class="pomodoro-phase">{{ phaseText }}</span>
      <div class="header-actions">
        <button
          v-if="hasActiveSession"
          class="pomodoro-action-btn cancel-btn"
          @click="handleCancel"
          title="取消"
          :disabled="loading"
        >
          <el-icon :size="14"><Close /></el-icon>
        </button>
        <button class="pomodoro-action-btn settings-btn" @click="$emit('openSettings')" title="设置">
          <el-icon :size="14"><Setting /></el-icon>
        </button>
      </div>
    </div>

    <!-- 计时器 -->
    <div class="pomodoro-timer">
      <svg class="timer-ring" viewBox="0 0 100 100">
        <circle class="timer-bg" cx="50" cy="50" r="45" />
        <circle class="timer-progress" cx="50" cy="50" r="45" :style="{ strokeDashoffset: progressOffset }" />
      </svg>
      <div class="timer-display">
        <span class="timer-time">{{ timeFormatted }}</span>
        <span class="timer-label">{{ statusLabel }}</span>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="pomodoro-controls">
      <button
        class="pomodoro-main-btn"
        :class="{ 'is-running': isRunning }"
        @click="handleMainAction"
        :disabled="loading"
      >
        <!-- 开始图标 -->
        <el-icon v-if="!hasActiveSession || isPaused" :size="16"><VideoPlay /></el-icon>
        <!-- 暂停图标 -->
        <el-icon v-else :size="16"><VideoPause /></el-icon>
        {{ mainButtonText }}
      </button>

      <!-- 完成按钮（运行中或暂停时显示） -->
      <button
        v-if="hasActiveSession"
        class="pomodoro-finish-btn"
        @click="handleFinish"
        :disabled="loading"
        title="完成"
      >
        <el-icon :size="14"><Check /></el-icon>
      </button>
    </div>

    <!-- 会话信息（如果有标题） -->
    <div v-if="session?.title" class="session-title">
      {{ session.title }}
    </div>

    <!-- 今日统计 -->
    <div class="pomodoro-stats">
      <div class="stat-item">
        <span class="stat-value">{{ todayStats.completedPomodoros }}</span>
        <span class="stat-label">今日番茄</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">{{ todayStats.focusMinutes }}</span>
        <span class="stat-label">分钟</span>
      </div>
    </div>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Close, Setting, VideoPlay, VideoPause, Check } from '@element-plus/icons-vue'
import { useTeamStore } from '@/stores/team'
import { focusApi, type FocusSessionDto, type FocusTodayStatsDto } from '@/api/modules/workspace'

// ============ Props & Emits ============
interface Props {
  defaultFocusDuration?: number
  defaultBreakDuration?: number
}

const props = withDefaults(defineProps<Props>(), {
  defaultFocusDuration: 25 * 60, // 25分钟
  defaultBreakDuration: 5 * 60, // 5分钟
})

const emit = defineEmits<{
  openSettings: []
  sessionCompleted: [session: FocusSessionDto]
  sessionCanceled: [session: FocusSessionDto]
  statsUpdated: [stats: FocusTodayStatsDto]
}>()

// ============ Stores ============
const teamStore = useTeamStore()

// ============ 状态 ============
const loading = ref(false)
const session = ref<FocusSessionDto | null>(null)
const currentPhase = ref<'focus' | 'break'>('focus')
const displaySeconds = ref(props.defaultFocusDuration)
const todayStats = ref<FocusTodayStatsDto>({
  focusMinutes: 0,
  completedPomodoros: 0,
})

// 本地计时器
let timerInterval: ReturnType<typeof setInterval> | null = null
let syncInterval: ReturnType<typeof setInterval> | null = null

// ============ 计算属性 ============
const teamId = computed(() => teamStore.currentTeamId)

const hasActiveSession = computed(() => {
  return session.value && ['Running', 'Paused'].includes(session.value.status)
})

const isRunning = computed(() => session.value?.status === 'Running')
const isPaused = computed(() => session.value?.status === 'Paused')

const phaseText = computed(() => {
  if (currentPhase.value === 'break') return '休息时间'
  return '专注时间'
})

const statusLabel = computed(() => {
  if (loading.value) return '加载中...'
  if (isRunning.value) return currentPhase.value === 'break' ? '休息中' : '专注中'
  if (isPaused.value) return '已暂停'
  return '准备开始'
})

const mainButtonText = computed(() => {
  if (loading.value) return '...'
  if (isPaused.value) return '继续'
  if (isRunning.value) return '暂停'
  return '开始专注'
})

const timeFormatted = computed(() => {
  const m = Math.floor(displaySeconds.value / 60)
    .toString()
    .padStart(2, '0')
  const s = (displaySeconds.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const totalSeconds = computed(() => {
  if (session.value?.plannedSeconds) {
    return session.value.plannedSeconds
  }
  return currentPhase.value === 'focus' ? props.defaultFocusDuration : props.defaultBreakDuration
})

const progressOffset = computed(() => {
  const circumference = 2 * Math.PI * 45
  const progress = displaySeconds.value / totalSeconds.value
  return circumference * (1 - progress)
})

// ============ 方法 ============

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function calculateDisplayTime() {
  if (!session.value) {
    displaySeconds.value = props.defaultFocusDuration
    return
  }

  const { plannedSeconds, actualSeconds, status, runningSegmentStartAt } = session.value

  if (status === 'Paused') {
    displaySeconds.value = Math.max(0, plannedSeconds - actualSeconds)
  } else if (status === 'Running' && runningSegmentStartAt) {
    const segmentStart = new Date(runningSegmentStartAt).getTime()
    const now = Date.now()
    const currentSegmentSeconds = Math.floor((now - segmentStart) / 1000)
    const totalElapsed = actualSeconds + currentSegmentSeconds
    displaySeconds.value = Math.max(0, plannedSeconds - totalElapsed)
  } else {
    displaySeconds.value = plannedSeconds
  }
}

function startLocalTimer() {
  stopLocalTimer()

  timerInterval = setInterval(() => {
    if (displaySeconds.value > 0) {
      displaySeconds.value -= 1
    } else {
      handleTimerComplete()
    }
  }, 1000)
}

function stopLocalTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

async function handleTimerComplete() {
  stopLocalTimer()

  if (!session.value) return

  try {
    loading.value = true
    await focusApi.finish(session.value.id)

    if (currentPhase.value === 'focus') {
      showNotification('🍅 专注完成！', '休息一下吧')
      emit('sessionCompleted', session.value)
    } else {
      showNotification('☕ 休息结束！', '继续加油')
    }

    if (currentPhase.value === 'focus') {
      currentPhase.value = 'break'
      displaySeconds.value = props.defaultBreakDuration
    } else {
      currentPhase.value = 'focus'
      displaySeconds.value = props.defaultFocusDuration
    }

    session.value = null
    await loadTodayStats()
  } catch (error) {
    console.error('完成会话失败:', error)
  } finally {
    loading.value = false
  }
}

function showNotification(title: string, body: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

async function handleMainAction() {
  if (loading.value) return

  if (!hasActiveSession.value) {
    await startSession()
  } else if (isRunning.value) {
    await pauseSession()
  } else if (isPaused.value) {
    await resumeSession()
  }
}

async function startSession() {
  try {
    loading.value = true

    const sessionId = generateUUID()
    const input = {
      id: sessionId,
      teamId: teamId.value || null,
      plannedSeconds: props.defaultFocusDuration,
      title: null,
    }

    const response = await focusApi.start(input)
    session.value = response
    currentPhase.value = 'focus'

    calculateDisplayTime()
    startLocalTimer()
  } catch (error: unknown) {
    console.error('开始会话失败:', error)
    const err = error as { response?: { status?: number } }
    if (err.response?.status === 400) {
      await loadCurrentSession()
    }
  } finally {
    loading.value = false
  }
}

async function pauseSession() {
  if (!session.value) return

  try {
    loading.value = true
    stopLocalTimer()

    const response = await focusApi.pause(session.value.id)
    session.value = response
    calculateDisplayTime()
  } catch (error) {
    console.error('暂停会话失败:', error)
    await loadCurrentSession()
  } finally {
    loading.value = false
  }
}

async function resumeSession() {
  if (!session.value) return

  try {
    loading.value = true

    const response = await focusApi.resume(session.value.id)
    session.value = response
    calculateDisplayTime()
    startLocalTimer()
  } catch (error) {
    console.error('继续会话失败:', error)
    await loadCurrentSession()
  } finally {
    loading.value = false
  }
}

async function handleFinish() {
  if (!session.value || loading.value) return

  try {
    loading.value = true
    stopLocalTimer()

    await focusApi.finish(session.value.id)

    showNotification('🍅 专注完成！', '做得好！')
    emit('sessionCompleted', session.value)

    session.value = null
    currentPhase.value = 'focus'
    displaySeconds.value = props.defaultFocusDuration

    await loadTodayStats()
  } catch (error) {
    console.error('完成会话失败:', error)
  } finally {
    loading.value = false
  }
}

async function handleCancel() {
  if (!session.value || loading.value) return

  try {
    loading.value = true
    stopLocalTimer()

    await focusApi.cancel(session.value.id)

    emit('sessionCanceled', session.value)

    session.value = null
    currentPhase.value = 'focus'
    displaySeconds.value = props.defaultFocusDuration

    await loadTodayStats()
  } catch (error) {
    console.error('取消会话失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadCurrentSession() {
  try {
    const response = await focusApi.getCurrent()

    if (response) {
      session.value = response
      currentPhase.value = 'focus'
      calculateDisplayTime()

      if (response.status === 'Running') {
        startLocalTimer()
      }
    } else {
      session.value = null
      displaySeconds.value = props.defaultFocusDuration
    }
  } catch (error) {
    console.error('加载当前会话失败:', error)
  }
}

async function loadTodayStats() {
  try {
    const response = await focusApi.getTodayStats()
    if (response) {
      todayStats.value = {
        focusMinutes: Math.round(response.focusMinutes || 0),
        completedPomodoros: response.completedPomodoros || 0,
      }
      emit('statsUpdated', todayStats.value)
    }
  } catch (error) {
    console.error('加载今日统计失败:', error)
  }
}

function calculateRemainingFromSession(sess: FocusSessionDto): number {
  if (!sess) return props.defaultFocusDuration

  const { plannedSeconds, actualSeconds, status, runningSegmentStartAt } = sess

  if (status === 'Paused') {
    return Math.max(0, plannedSeconds - actualSeconds)
  } else if (status === 'Running' && runningSegmentStartAt) {
    const segmentStart = new Date(runningSegmentStartAt).getTime()
    const now = Date.now()
    const currentSegmentSeconds = Math.floor((now - segmentStart) / 1000)
    const totalElapsed = actualSeconds + currentSegmentSeconds
    return Math.max(0, plannedSeconds - totalElapsed)
  }

  return plannedSeconds
}

async function initialize() {
  loading.value = true

  try {
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }

    await Promise.all([loadCurrentSession(), loadTodayStats()])
  } catch (error) {
    console.error('初始化失败:', error)
  } finally {
    loading.value = false
  }
}

// ============ 生命周期 ============

onMounted(() => {
  initialize()

  // 定期同步后端状态（防止漂移）
  syncInterval = setInterval(async () => {
    if (isRunning.value && session.value) {
      try {
        const response = await focusApi.getCurrent()
        if (response && response.id === session.value.id) {
          session.value = response
          const newRemaining = calculateRemainingFromSession(response)
          if (Math.abs(newRemaining - displaySeconds.value) > 5) {
            displaySeconds.value = newRemaining
          }
        }
      } catch (error) {
        console.warn('同步会话状态失败:', error)
      }
    }
  }, 30000)
})

onUnmounted(() => {
  stopLocalTimer()
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
})

// 监听团队切换
watch(teamId, () => {
  stopLocalTimer()
  session.value = null
  initialize()
})

// 暴露方法给父组件
defineExpose({
  refresh: initialize,
  loadTodayStats,
})
</script>

<style scoped>
.pomodoro-card {
  position: relative;
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.pomodoro-card.is-running {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #fff;
}

.pomodoro-card.is-paused {
  background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
  color: #fff;
}

.pomodoro-card.is-running.is-break {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

/* 头部 */
.pomodoro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.pomodoro-phase {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary, #64748b);
}

.pomodoro-card.is-running .pomodoro-phase,
.pomodoro-card.is-paused .pomodoro-phase {
  color: rgba(255, 255, 255, 0.7);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.pomodoro-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-tertiary, #94a3b8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pomodoro-action-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-secondary, #64748b);
}

.pomodoro-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pomodoro-card.is-running .pomodoro-action-btn,
.pomodoro-card.is-paused .pomodoro-action-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

.pomodoro-card.is-running .pomodoro-action-btn:hover,
.pomodoro-card.is-paused .pomodoro-action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.cancel-btn:hover {
  color: #ef4444 !important;
}

/* 计时器 */
.pomodoro-timer {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 14px;
}

.timer-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.timer-bg {
  fill: none;
  stroke: rgba(0, 0, 0, 0.06);
  stroke-width: 6;
}

.pomodoro-card.is-running .timer-bg,
.pomodoro-card.is-paused .timer-bg {
  stroke: rgba(255, 255, 255, 0.15);
}

.timer-progress {
  fill: none;
  stroke: #0f172a;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: calc(2 * 3.14159 * 45);
  transition: stroke-dashoffset 0.5s ease;
}

.pomodoro-card.is-running .timer-progress,
.pomodoro-card.is-paused .timer-progress {
  stroke: #fff;
}

.timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.timer-time {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary, #0f172a);
  line-height: 1.2;
}

.pomodoro-card.is-running .timer-time,
.pomodoro-card.is-paused .timer-time {
  color: #fff;
}

.timer-label {
  font-size: 0.65rem;
  color: var(--text-tertiary, #94a3b8);
  margin-top: 2px;
}

.pomodoro-card.is-running .timer-label,
.pomodoro-card.is-paused .timer-label {
  color: rgba(255, 255, 255, 0.7);
}

/* 控制按钮 */
.pomodoro-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 14px;
}

.pomodoro-main-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #0f172a;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pomodoro-main-btn:hover:not(:disabled) {
  background: #1e293b;
  transform: scale(1.02);
}

.pomodoro-main-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pomodoro-main-btn.is-running {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.pomodoro-card.is-running .pomodoro-main-btn,
.pomodoro-card.is-paused .pomodoro-main-btn {
  background: rgba(255, 255, 255, 0.2);
}

.pomodoro-finish-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pomodoro-finish-btn:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.pomodoro-finish-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 会话标题 */
.session-title {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
  padding: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 统计 */
.pomodoro-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.pomodoro-card.is-running .pomodoro-stats,
.pomodoro-card.is-paused .pomodoro-stats {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.pomodoro-card.is-running .stat-value,
.pomodoro-card.is-paused .stat-value {
  color: #fff;
}

.stat-label {
  font-size: 0.65rem;
  color: var(--text-tertiary, #94a3b8);
}

.pomodoro-card.is-running .stat-label,
.pomodoro-card.is-paused .stat-label {
  color: rgba(255, 255, 255, 0.6);
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: rgba(0, 0, 0, 0.08);
}

.pomodoro-card.is-running .stat-divider,
.pomodoro-card.is-paused .stat-divider {
  background: rgba(255, 255, 255, 0.15);
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.pomodoro-card.is-running .loading-overlay,
.pomodoro-card.is-paused .loading-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #0f172a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.pomodoro-card.is-running .loading-spinner,
.pomodoro-card.is-paused .loading-spinner {
  border-color: rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

