<template>
  <section class="home-page">
    <!-- 顶部工具栏 -->
    <header class="page-toolbar">
      <div class="toolbar-left">
        <div class="toolbar-brand">
          <span class="brand-logo">ClayMo</span>
        </div>
        <div class="toolbar-divider"></div>
        <TeamSwitcher @change="handleTeamChange" />
        <div class="toolbar-divider"></div>
        <div class="toolbar-title">
          <p class="lab-eyebrow">工作台</p>
          <h1>时间线</h1>
        </div>
      </div>
      <div class="toolbar-right">
        <nav class="nav-links">
          <router-link to="/kb" class="nav-link">知识库</router-link>
          <router-link to="/travel" class="nav-link">旅程</router-link>
        </nav>

        <!-- 日历/通知中心触发器 -->
        <div class="calendar-trigger" @click="toggleCalendarPanel">
          <div class="trigger-datetime">
            <span class="trigger-time">{{ currentTime }}</span>
            <span class="trigger-date">{{ shortDateText }}</span>
          </div>
          <el-icon :size="16"><Calendar /></el-icon>
        </div>
      </div>
    </header>

    <!-- 日历面板 -->
    <Transition name="calendar-panel">
      <div v-if="showCalendarPanel" class="calendar-panel-overlay" @click.self="toggleCalendarPanel">
        <div class="calendar-panel">
          <div class="panel-header">
            <h3>{{ currentMonth }}</h3>
            <button class="panel-close" @click="toggleCalendarPanel">
              <el-icon :size="16"><Close /></el-icon>
            </button>
          </div>
          <div class="panel-calendar">
            <div class="calendar-weekdays">
              <span v-for="w in weekdays" :key="w">{{ w }}</span>
            </div>
            <div class="calendar-grid">
              <div
                v-for="day in calendarDates"
                :key="day.key"
                class="calendar-day"
                :class="{
                  'other-month': day.isOtherMonth,
                  'is-today': day.isToday,
                  'is-selected': day.key === selectedDate,
                  'is-checked': monthCheckedDates.has(day.key),
                }"
                @click="handleDayClick(day)"
              >
                <span class="day-number">{{ day.day }}</span>
                <span v-if="monthCheckedDates.has(day.key)" class="check-dot"></span>
              </div>
            </div>
          </div>
          <div class="panel-footer">
            <div class="upcoming-events">
              <div class="events-header">
                <div class="events-label">{{ selectedDateLabel }} 安排</div>
                <button
                  v-if="canCheckinSelectedDate"
                  class="checkin-btn-small"
                  :disabled="isCheckingIn"
                  @click="handleCalendarCheckin"
                >
                  {{ isCheckingIn ? '打卡中...' : '✓ 打卡' }}
                </button>
              </div>
              <div v-if="selectedDayGoalsLoading" class="events-loading">加载中...</div>
              <div v-else-if="selectedDayGoals.length > 0" class="events-list">
                <div
                  v-for="goal in selectedDayGoals"
                  :key="goal.id"
                  class="event-item"
                  :class="{ completed: goal.isChecked }"
                >
                  <span class="event-checkbox">
                    <el-icon v-if="goal.isChecked" :size="10"><Check /></el-icon>
                  </span>
                  <span class="event-title">{{ goal.title }}</span>
                </div>
              </div>
              <div v-else class="events-empty">暂无目标</div>
              <div v-if="selectedDayGoals.length > 0" class="events-summary">
                已完成 {{ selectedDayGoalsSummary.completed }}/{{ selectedDayGoalsSummary.total }}
              </div>
            </div>
            <!-- 打卡统计 -->
            <div class="checkin-stats">
              <div class="stat-item">
                <span class="stat-icon">🔥</span>
                <span class="stat-value">{{ monthCheckinData.streakCount }}</span>
                <span class="stat-label">连续天</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">📅</span>
                <span class="stat-value">{{ monthCheckinData.monthCount }}</span>
                <span class="stat-label">本月</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 主内容区域 -->
    <main class="page-content">
      <!-- 左侧导航 -->
      <SideNav :has-today-events="hasTodayEvents" :today-ref="todayRef" @pomodoro-completed="onPomodoroCompleted" @pomodoro-stats-updated="onPomodoroStatsUpdated" />

      <!-- 时间线主区域 -->
      <TimelineSection ref="timelineSectionRef" @today-ref-found="handleTodayRefFound" />

      <!-- 右侧边栏：今日状态 -->
      <TodayStatus ref="todayStatusRef" @dashboard-updated="onDashboardUpdated" />
    </main>

    <!-- 悬浮账号按钮 -->
    <div class="account-fab" @click="toggleAccountMenu">
      <el-icon :size="20"><User /></el-icon>
      <div v-if="showAccountMenu" class="account-menu">
        <div class="menu-item" @click="viewProfile">个人信息</div>
        <div class="menu-item" @click="openSettings">设置</div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click="authStore.isAuthenticated ? handleLogout() : router.push({ name: 'Login' })">
          {{ authStore.isAuthenticated ? '退出登录' : '登录' }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, Close, Check, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import TeamSwitcher from '@/components/common/TeamSwitcher.vue'
import SideNav from '@/components/home/SideNav.vue'
import TimelineSection from '@/components/home/TimelineSection.vue'
import TodayStatus from '@/components/home/TodayStatus.vue'
import { dashboardApi, weeklyCheckinApi, type MonthCheckInDto, type TodayGoalDto } from '@/api'

const router = useRouter()
const authStore = useAuthStore()

// Refs
const timelineSectionRef = ref<InstanceType<typeof TimelineSection> | null>(null)
const todayStatusRef = ref<InstanceType<typeof TodayStatus> | null>(null)
const todayRef = ref<HTMLElement | null>(null)

// 界面状态
const showAccountMenu = ref(false)
const showCalendarPanel = ref(false)
const currentTime = ref(format(new Date(), 'HH:mm'))
const shortDateText = computed(() => format(new Date(), 'yyyy/M/d'))
const currentMonth = computed(() => {
  const today = new Date()
  return format(today, 'yyyy 年 M 月', { locale: zhCN })
})

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

interface CalendarDay {
  key: string
  day: string
  isToday: boolean
  isOtherMonth: boolean
}

const calendarDates = computed<CalendarDay[]>(() => {
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  return days.map((date) => ({
    key: format(date, 'yyyy-MM-dd'),
    day: format(date, 'd'),
    isToday: isToday(date),
    isOtherMonth: !isSameMonth(date, today),
  }))
})

// ===== 日历打卡与目标功能 =====
const selectedDate = ref(format(new Date(), 'yyyy-MM-dd'))
const monthCheckinData = ref<MonthCheckInDto>({ year: 0, month: 0, checkedDates: [], streakCount: 0, monthCount: 0 })
const monthCheckedDates = computed(() => new Set(monthCheckinData.value.checkedDates))
const selectedDayGoals = ref<TodayGoalDto[]>([])
const selectedDayGoalsSummary = ref({ completed: 0, total: 0 })
const selectedDayGoalsLoading = ref(false)
const isCheckingIn = ref(false)

// 选中日期的标签
const selectedDateLabel = computed(() => {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (selectedDate.value === today) return '今日'
  const date = new Date(selectedDate.value)
  return format(date, 'M月d日', { locale: zhCN })
})

// 是否可以在选中日期打卡（只能打今天）
const canCheckinSelectedDate = computed(() => {
  const today = format(new Date(), 'yyyy-MM-dd')
  return selectedDate.value === today && !monthCheckedDates.value.has(today)
})

// 加载月度打卡数据
const loadMonthCheckin = async () => {
  try {
    const now = new Date()
    const data = await dashboardApi.getMonthCheckIn({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    })
    monthCheckinData.value = data
  } catch (error) {
    console.error('加载月度打卡数据失败:', error)
  }
}

// 加载指定日期的目标
const loadDayGoals = async (date: string) => {
  selectedDayGoalsLoading.value = true
  try {
    const data = await dashboardApi.getDayGoals({ date })
    selectedDayGoals.value = data.goals
    selectedDayGoalsSummary.value = data.summary
  } catch (error) {
    console.error('加载目标失败:', error)
    selectedDayGoals.value = []
    selectedDayGoalsSummary.value = { completed: 0, total: 0 }
  } finally {
    selectedDayGoalsLoading.value = false
  }
}

// 点击日期
const handleDayClick = (day: CalendarDay) => {
  if (day.isOtherMonth) return
  selectedDate.value = day.key
  loadDayGoals(day.key)
}

// 日历内打卡
const handleCalendarCheckin = async () => {
  if (isCheckingIn.value) return
  isCheckingIn.value = true
  try {
    await weeklyCheckinApi.checkin()
    // 更新本地状态
    monthCheckinData.value.checkedDates.push(selectedDate.value)
    monthCheckinData.value.monthCount++
    monthCheckinData.value.streakCount++
    // 刷新右侧栏数据
    todayStatusRef.value?.loadDashboard()
  } catch (error) {
    console.error('打卡失败:', error)
  } finally {
    isCheckingIn.value = false
  }
}

// 计算：是否有今天的事件
const hasTodayEvents = computed(() => {
  if (!timelineSectionRef.value) return false
  return true
})

// 生命周期
let timeInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timeInterval = setInterval(() => {
    currentTime.value = format(new Date(), 'HH:mm')
  }, 1000)

  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
  document.removeEventListener('click', handleOutsideClick)
})

// 方法
const handleOutsideClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.account-fab')) {
    showAccountMenu.value = false
  }
}

const toggleCalendarPanel = () => {
  showCalendarPanel.value = !showCalendarPanel.value
  if (showCalendarPanel.value) {
    // 打开面板时加载数据
    loadMonthCheckin()
    loadDayGoals(selectedDate.value)
  }
}

const toggleAccountMenu = () => {
  showAccountMenu.value = !showAccountMenu.value
}

const handleTeamChange = (context: { type: 'personal' | 'team'; teamId?: string }) => {
  console.log('[Home] Team context changed:', context)
  timelineSectionRef.value?.resetAndLoad()
  todayStatusRef.value?.loadDashboard()
}

const handleTodayRefFound = (el: HTMLElement) => {
  todayRef.value = el
}

const handleLogout = async () => {
  showAccountMenu.value = false
  await authStore.logout('manual')
}

const viewProfile = () => {
  showAccountMenu.value = false
  router.push({ name: 'Profile' })
}

const openSettings = () => {
  showAccountMenu.value = false
}

const onPomodoroCompleted = () => {
  // 使用智能刷新，只对新增条目应用动画
  timelineSectionRef.value?.refreshWithDiff()
}

const onPomodoroStatsUpdated = () => {
  // 更新统计时可刷新
}

const onDashboardUpdated = () => {
  // 仪表板更新时的逻辑
}

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (!isAuthenticated) {
      showAccountMenu.value = false
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
@import '@/styles/components/home.scss';
</style>
