<template>
  <section class="home-page">
    <!-- 顶部工具栏 -->
    <header class="page-toolbar">
      <div class="toolbar-left">
        <div class="toolbar-brand">
          <span class="brand-logo">ClayMo</span>
        </div>
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
          <router-link to="/tools" class="nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.5 20H13.5C17 20 18.5 18.5 18.5 15V13.5C18.5 10 17 8.5 13.5 8.5H10.5C7 8.5 5.5 10 5.5 13.5V15C5.5 18.5 7 20 10.5 20Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.5 15.5H19.5C20.6 15.5 21.5 14.6 21.5 13.5V10.5C21.5 9.4 20.6 8.5 19.5 8.5H18.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5.5 15.5H4.5C3.4 15.5 2.5 14.6 2.5 13.5V10.5C2.5 9.4 3.4 8.5 4.5 8.5H5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10.5 8.5V5.5C10.5 4.4 11.4 3.5 12.5 3.5H13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5.5 4.5H13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5.5 3.5V5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M13.5 3.5V5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            工具台
          </router-link>
        </nav>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="page-content">
      <!-- 左侧导航面板 -->
      <aside class="side-nav">
        <!-- 回到今天 -->
        <button v-if="hasTodayEvents" class="nav-today-btn" @click="scrollToToday">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>今天</span>
        </button>

        <!-- 日期显示 -->
        <div class="nav-date">{{ todayDateText }}</div>

        <!-- 筛选标签 -->
        <div class="nav-filters">
          <button
            v-for="tag in filterTags"
            :key="tag.key"
            class="filter-btn"
            :class="{ active: activeFilter === tag.key }"
            @click="setActiveFilter(tag.key)"
          >
            {{ tag.label }}
          </button>
        </div>

        <!-- 番茄钟 & 目标 -->
        <div class="nav-modules">
          <div class="module-card">
            <div class="module-header">
              <span class="module-title">今日目标</span>
              <span class="module-count">{{ todayTodoCount }}</span>
            </div>
            <button class="pomodoro-btn" @click="togglePomodoro">
              <span v-if="!pomodoroRunning">开始番茄钟</span>
              <span v-else>停止 · {{ pomodoroTimeFormatted }}</span>
            </button>
          </div>

          <!-- 小日历 -->
          <div class="module-card module-calendar">
            <div class="calendar-month">{{ currentMonth }}</div>
            <div class="calendar-weekdays">
              <span v-for="w in weekdays" :key="w">{{ w }}</span>
            </div>
            <div class="calendar-grid">
              <div
                v-for="day in calendarDates"
                :key="day.key"
                class="calendar-day"
                :class="{ 'other-month': day.isOtherMonth, 'is-today': day.isToday }"
              >
                {{ day.day }}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 时间线主区域 -->
      <div class="timeline-main">
        <!-- 空状态 -->
        <div v-if="filteredEvents.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>时间线还空空的</h3>
          <p>从创建第一篇文档或第一篇旅程开始，让这里记录你的一切。</p>
          <button class="btn primary" @click="handleStartWriting">开始写作</button>
        </div>

        <!-- 时间线 -->
        <div v-else class="timeline-list">
          <div
            v-for="group in groupedEvents"
            :key="group.date"
            :ref="el => { if (group.isToday) todayRef = el }"
            class="timeline-group"
          >
            <div class="group-header">
              <div class="timeline-marker">
                <div class="timeline-dot" :class="{ 'dot-today': group.isToday }"></div>
                <div class="timeline-line"></div>
              </div>
              <div class="group-info">
                <h2>{{ group.title }}</h2>
                <span class="group-count">{{ group.events.length }} 项</span>
              </div>
            </div>
            <div class="group-events">
              <div
                v-for="event in group.events"
                :key="event.id"
                class="event-card"
                @click="handleEventClick(event)"
              >
                <div class="event-body">
                  <div class="event-top">
                    <span class="event-tag" :class="`tag-${event.module}`">
                      {{ getModuleLabel(event.module) }}
                    </span>
                    <span class="event-time">{{ event.time }}</span>
                  </div>
                  <div class="event-summary">{{ event.summary }}</div>
                  <div class="event-info">{{ event.info }}</div>
                </div>
                <div class="event-footer">
                  <span class="event-relation">{{ event.relation }}</span>
                  <a href="#" class="event-action" @click.prevent="handlePrimaryAction(event)">
                    {{ event.primaryAction }} →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧边栏 -->
      <aside class="right-sidebar">
        <!-- 旅程模块 -->
        <div class="sidebar-card">
          <div class="card-header">
            <h3>旅程</h3>
            <a href="#" class="card-link" @click.prevent="viewAllTravels">查看全部</a>
          </div>
          <div v-if="upcomingTravel" class="travel-preview">
            <div class="travel-info">
              <div class="travel-name">{{ upcomingTravel.title }}</div>
              <div class="travel-date">{{ upcomingTravel.dateRange }}</div>
            </div>
            <div class="travel-countdown">D-{{ upcomingTravel.daysLeft }}</div>
          </div>
          <div v-if="lastTravelMemory" class="travel-memory">
            <div class="memory-label">上次旅程</div>
            <div class="memory-location">{{ lastTravelMemory.location }}</div>
            <div class="memory-text">{{ lastTravelMemory.memory }}</div>
          </div>
          <button class="btn ghost full-width" @click="handleCreateTravel">
            记录今天的心情 →
          </button>
        </div>

        <!-- 自我状态模块 -->
        <div class="sidebar-card">
          <h3>自我状态</h3>

          <div class="state-block">
            <div class="block-label">本周关注</div>
            <div class="focus-tags">
              <span v-for="(tag, index) in weeklyFocus" :key="index" class="focus-tag">
                {{ tag }}
              </span>
            </div>
          </div>

          <div class="state-block">
            <div class="block-label">今日提示</div>
            <div class="tip-text">{{ todayTip }}</div>
          </div>

          <div class="state-block">
            <div class="block-label">给自己的问题</div>
            <div class="question-text">{{ selfQuestion }}</div>
            <a href="#" class="question-link" @click.prevent="handleRecordReflection">
              记录一下 →
            </a>
          </div>

          <div class="state-block">
            <div class="block-label">本周写作打卡</div>
            <div class="checkin-bars">
              <div
                v-for="(day, index) in weeklyCheckin"
                :key="index"
                class="checkin-bar"
                :class="{ checked: day }"
              ></div>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <!-- 悬浮账号按钮 -->
    <div class="account-fab" @click="toggleAccountMenu">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" stroke-width="2"/>
      </svg>
      <div v-if="showAccountMenu" class="account-menu">
        <div class="menu-item" @click="viewProfile">个人信息</div>
        <div class="menu-item" @click="openSettings">设置</div>
        <div v-if="hasUserManage" class="menu-item" @click="openUserManagement">用户管理</div>
        <div v-if="hasPermissionManage" class="menu-item" @click="openPermissionManagement">权限管理</div>
        <div class="menu-divider"></div>
        <div
          class="menu-item"
          @click="authStore.isAuthenticated ? handleLogout() : router.push({ name: 'Login' })"
        >
          {{ authStore.isAuthenticated ? '退出登录' : '登录' }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import { SYSTEM_PERMISSIONS } from '@/permission/permission.constants'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const router = useRouter()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()

const timelineEvents = ref([])
const showAccountMenu = ref(false)
const todayRef = ref(null)
const hasTodayEvents = ref(false)
const activeFilter = ref('all')

const canCreateDoc = ref(true)
const canCreateKb = ref(true)
const canCreateTravel = ref(true)

const upcomingTravel = ref({
  title: '厦门三日游',
  dateRange: '2025-01-01 ~ 2025-01-03',
  daysLeft: 7
})

const lastTravelMemory = ref({
  location: '京都',
  memory: '走到鸭川的时候，突然有点想家。'
})

const weeklyFocus = ref(['ClayMo 多租户重构', '数学焦虑论文修订'])
const todayTip = ref('今天至少写 10 分钟，不求完成，只求开始。')
const selfQuestion = ref('今天有没有为未来的自己做一点点事情？')
const weeklyCheckin = ref([true, true, false, true, false, false, false])

const filterTags = ref([
  { key: 'all', label: '全部' },
  { key: 'knowledge', label: '知识' },
  { key: 'travel', label: '旅程' },
  { key: 'system', label: '系统' }
])

const todayDateText = computed(() => {
  const today = new Date()
  return `今天 · ${format(today, 'M 月 d 日', { locale: zhCN })}`
})

const currentMonth = computed(() => {
  const today = new Date()
  return format(today, 'yyyy 年 M 月', { locale: zhCN })
})

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const calendarDates = computed(() => {
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  return days.map(date => ({
    key: format(date, 'yyyy-MM-dd'),
    day: format(date, 'd'),
    isToday: isToday(date),
    isOtherMonth: !isSameMonth(date, today)
  }))
})

const todayTodoCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return timelineEvents.value.filter(ev => {
    const d = new Date(ev.timestamp)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  }).length
})

const pomodoroRunning = ref(false)
const pomodoroSeconds = ref(25 * 60)
const pomodoroInterval = ref(null)

const pomodoroTimeFormatted = computed(() => {
  const m = Math.floor(pomodoroSeconds.value / 60).toString().padStart(2, '0')
  const s = (pomodoroSeconds.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const togglePomodoro = () => {
  if (pomodoroRunning.value) {
    if (pomodoroInterval.value) {
      clearInterval(pomodoroInterval.value)
      pomodoroInterval.value = null
    }
    pomodoroRunning.value = false
    pomodoroSeconds.value = 25 * 60
    return
  }
  pomodoroRunning.value = true
  pomodoroSeconds.value = 25 * 60
  pomodoroInterval.value = setInterval(() => {
    if (pomodoroSeconds.value > 0) {
      pomodoroSeconds.value -= 1
    } else {
      if (pomodoroInterval.value) {
        clearInterval(pomodoroInterval.value)
        pomodoroInterval.value = null
      }
      pomodoroRunning.value = false
    }
  }, 1000)
}

onUnmounted(() => {
  if (pomodoroInterval.value) {
    clearInterval(pomodoroInterval.value)
    pomodoroInterval.value = null
  }
})

const filteredEvents = computed(() => {
  if (activeFilter.value === 'all') {
    return timelineEvents.value
  }
  return timelineEvents.value.filter(event => event.module === activeFilter.value)
})

const setActiveFilter = (key) => {
  activeFilter.value = key
}

const groupedEvents = computed(() => {
  const groups = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  filteredEvents.value.forEach(event => {
    const eventDate = new Date(event.timestamp)
    eventDate.setHours(0, 0, 0, 0)

    let groupKey
    let title
    let isToday = false

    if (eventDate.getTime() === today.getTime()) {
      groupKey = 'today'
      title = `今天 · ${format(eventDate, 'M 月 d 日', { locale: zhCN })}`
      isToday = true
      hasTodayEvents.value = true
    } else if (eventDate.getTime() === yesterday.getTime()) {
      groupKey = 'yesterday'
      title = `昨天 · ${format(eventDate, 'M 月 d 日', { locale: zhCN })}`
    } else {
      groupKey = format(eventDate, 'yyyy-MM-dd')
      title = format(eventDate, 'M 月 d 日', { locale: zhCN })
    }

    if (!groups[groupKey]) {
      groups[groupKey] = { date: groupKey, title, isToday, events: [] }
    }
    groups[groupKey].events.push(event)
  })

  const sortedGroups = Object.values(groups).sort((a, b) => {
    if (a.isToday) return -1
    if (b.isToday) return 1
    if (a.date === 'yesterday') return -1
    if (b.date === 'yesterday') return 1
    return b.date.localeCompare(a.date)
  })

  if (!hasTodayEvents.value && sortedGroups.length > 0) {
    sortedGroups[0].title = '更早'
  }

  return sortedGroups
})

const getModuleLabel = (module) => {
  const labels = { knowledge: '[知识]', travel: '[TRAVEL]', system: '[系统]' }
  return labels[module] || '[未知]'
}

const scrollToToday = () => {
  if (todayRef.value) {
    todayRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const handleEventClick = (event) => {}

const handlePrimaryAction = (event) => {
  if (event.module === 'knowledge') {
    router.push(`/kb/${event.baseId}/edit/${event.docId}`)
  } else if (event.module === 'travel') {
    router.push(`/travel/${event.travelId}`)
  }
}

const handleCreateDoc = () => {
  if (!canCreateDoc.value) {
    alert('您没有创建文档的权限')
    return
  }
}

const handleCreateTravel = () => {
  if (!canCreateTravel.value) {
    alert('您没有创建旅行日记的权限')
    return
  }
}

const handleStartWriting = () => {
  handleCreateDoc()
}

const viewAllTravels = () => {
  router.push('/travel')
}

const handleRecordReflection = () => {}

const toggleAccountMenu = () => {
  showAccountMenu.value = !showAccountMenu.value
}

const hasUserManage = computed(() => {
  return permissionStore.has(SYSTEM_PERMISSIONS.USERS_VIEW) ||
         permissionStore.has(SYSTEM_PERMISSIONS.USERS_MANAGE)
})

const hasPermissionManage = computed(() => {
  return permissionStore.has(SYSTEM_PERMISSIONS.ROLES_VIEW) ||
         permissionStore.has(SYSTEM_PERMISSIONS.ROLES_MANAGE)
})

const viewProfile = () => {
  showAccountMenu.value = false
}

const openSettings = () => {
  showAccountMenu.value = false
}

const openUserManagement = () => {
  showAccountMenu.value = false
  router.push({ name: 'SystemUsers' })
}

const openPermissionManagement = () => {
  showAccountMenu.value = false
  router.push({ name: 'SystemRoles' })
}

const handleLogout = async () => {
  showAccountMenu.value = false
  await authStore.logout('manual')
}

watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (!isAuthenticated) {
    showAccountMenu.value = false
  }
}, { immediate: true })

const loadTimelineEvents = async () => {
  try {
    timelineEvents.value = [
      {
        id: '1',
        module: 'knowledge',
        summary: '创建了文档《系统设计》',
        info: '来自知识库《系统设计》',
        time: '16:35',
        relation: '我创建',
        primaryAction: '查看文档',
        timestamp: new Date(),
        baseId: '1',
        docId: '1'
      },
      {
        id: '2',
        module: 'knowledge',
        summary: '更新了文档《API 设计规范》',
        info: '来自知识库《技术文档》',
        time: '14:20',
        relation: '我创建',
        primaryAction: '查看文档',
        timestamp: new Date(),
        baseId: '1',
        docId: '2'
      },
      {
        id: '3',
        module: 'travel',
        summary: '记录了旅程日记',
        info: '厦门之行 Day 1',
        time: '10:15',
        relation: '我创建',
        primaryAction: '查看详情',
        timestamp: new Date(),
        travelId: '1'
      }
    ]
  } catch (error) {
    console.error('加载时间线失败:', error)
  }
}

onMounted(() => {
  loadTimelineEvents()
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.account-fab')) {
      showAccountMenu.value = false
    }
  })
})
</script>

<style scoped>
.home-page {
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
  background: #0f172a;
  position: sticky;
  top: 0;
  z-index: 100;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.toolbar-brand {
  display: flex;
  align-items: center;
}

.brand-logo {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.toolbar-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
}

.toolbar-title h1 {
  margin: 4px 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
}

.lab-eyebrow {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.18s ease;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-link.router-link-active {
  background: #fff;
  color: #0f172a;
}

/* 主内容区域 */
.page-content {
  flex: 1;
  display: grid;
  grid-template-columns: 240px 1fr 360px;
  gap: 48px;
  max-width: 1600px;
  margin: 0 auto;
  padding: 32px 48px;
  width: 100%;
  box-sizing: border-box;
}

/* 左侧导航 */
.side-nav {
  position: sticky;
  top: 100px;
  height: fit-content;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nav-today-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--surface-divider, #e2e8f0);
  border-radius: 16px;
  color: var(--text-secondary, #475569);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.nav-today-btn:hover {
  border-color: #0f172a;
  color: #0f172a;
}

.nav-date {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  padding: 8px 0;
}

.nav-filters {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-btn {
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary, #475569);
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.filter-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #0f172a;
}

.filter-btn.active {
  background: #0f172a;
  color: #fff;
}

.nav-modules {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.module-card {
  background: #fff;
  border: 1px solid var(--surface-divider, #e2e8f0);
  border-radius: 16px;
  padding: 16px;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.module-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.module-count {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
}

.pomodoro-btn {
  width: 100%;
  padding: 10px;
  background: #0f172a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.pomodoro-btn:hover {
  background: #1e293b;
}

.module-calendar {
  padding: 16px;
}

.calendar-month {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  margin-bottom: 12px;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  font-size: 0.7rem;
  color: var(--text-tertiary, #94a3b8);
  text-align: center;
  margin-bottom: 8px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--text-secondary, #475569);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.calendar-day:hover {
  background: rgba(0, 0, 0, 0.04);
}

.calendar-day.other-month {
  color: #d1d5db;
}

.calendar-day.is-today {
  background: #0f172a;
  color: #fff;
  font-weight: 700;
}

/* 时间线主区域 */
.timeline-main {
  min-width: 0;
}

.empty-state {
  text-align: center;
  padding: 80px 40px;
  background: #fff;
  border: 1px solid var(--surface-divider, #e2e8f0);
  border-radius: 20px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  margin: 0 0 8px;
}

.empty-state p {
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
  margin: 0 0 24px;
}

.timeline-list {
  display: flex;
  flex-direction: column;
}

.timeline-group {
  position: relative;
  padding: 32px 0;
  border-bottom: 1px solid var(--surface-divider, #e2e8f0);
}

.timeline-group:last-child {
  border-bottom: none;
}

.group-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.timeline-marker {
  position: relative;
  flex-shrink: 0;
  width: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d1d5db;
  border: 2px solid #FAFBFC;
  z-index: 2;
}

.timeline-dot.dot-today {
  background: #0f172a;
  width: 12px;
  height: 12px;
}

.timeline-line {
  position: absolute;
  top: 12px;
  bottom: -32px;
  width: 2px;
  background: rgba(0, 0, 0, 0.08);
  z-index: 1;
}

.timeline-group:last-child .timeline-line {
  display: none;
}

.group-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.group-info h2 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  margin: 0;
}

.group-count {
  font-size: 0.85rem;
  color: var(--text-tertiary, #94a3b8);
}

.group-events {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-left: 36px;
}

.event-card {
  background: #fff;
  border: 1px solid var(--surface-divider, #e2e8f0);
  border-radius: 16px;
  padding: 20px 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.event-card:hover {
  border-color: #0f172a;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}

.event-body {
  margin-bottom: 14px;
}

.event-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.event-tag {
  padding: 4px 10px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.event-time {
  font-size: 0.85rem;
  color: var(--text-tertiary, #94a3b8);
}

.event-summary {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  line-height: 1.5;
  margin-bottom: 4px;
}

.event-info {
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
  line-height: 1.5;
}

.event-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid var(--surface-divider, #e2e8f0);
}

.event-relation {
  font-size: 0.85rem;
  color: var(--text-tertiary, #94a3b8);
}

.event-action {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  text-decoration: none;
  transition: color 0.15s ease;
}

.event-action:hover {
  color: #64748b;
}

/* 右侧边栏 */
.right-sidebar {
  position: sticky;
  top: 100px;
  height: fit-content;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-card {
  background: #fff;
  border: 1px solid var(--surface-divider, #e2e8f0);
  border-radius: 20px;
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sidebar-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  margin: 0;
}

.card-link {
  font-size: 0.8rem;
  color: var(--text-secondary, #64748b);
  text-decoration: none;
  transition: color 0.15s ease;
}

.card-link:hover {
  color: #0f172a;
}

.travel-preview {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  margin-bottom: 16px;
}

.travel-info {
  flex: 1;
}

.travel-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  margin-bottom: 4px;
}

.travel-date {
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
}

.travel-countdown {
  font-size: 2.5rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  letter-spacing: -2px;
}

.travel-memory {
  padding: 14px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 10px;
  margin-bottom: 16px;
}

.memory-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-tertiary, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.memory-location {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  margin-bottom: 4px;
}

.memory-text {
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  line-height: 1.5;
  font-style: italic;
}

.state-block {
  margin-bottom: 20px;
}

.state-block:last-child {
  margin-bottom: 0;
}

.block-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.focus-tags {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.focus-tag {
  padding: 10px 12px;
  font-size: 0.85rem;
  color: var(--text-secondary, #475569);
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.tip-text {
  font-size: 0.9rem;
  color: var(--text-secondary, #475569);
  font-style: italic;
  line-height: 1.6;
}

.question-text {
  font-size: 0.9rem;
  color: var(--text-secondary, #475569);
  line-height: 1.6;
  margin-bottom: 8px;
}

.question-link {
  font-size: 0.8rem;
  color: var(--text-tertiary, #94a3b8);
  text-decoration: none;
  transition: color 0.15s ease;
}

.question-link:hover {
  color: #0f172a;
}

.checkin-bars {
  display: flex;
  gap: 6px;
}

.checkin-bar {
  flex: 1;
  height: 28px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.checkin-bar.checked {
  background: #0f172a;
}

.checkin-bar:hover {
  transform: translateY(-2px);
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.18s ease;
}

.btn.primary {
  background: #0f172a;
  color: #fff;
}

.btn.primary:hover {
  background: #1e293b;
}

.btn.ghost {
  border-color: var(--surface-divider, #e2e8f0);
  color: var(--text-secondary, #475569);
  background: transparent;
}

.btn.ghost:hover {
  border-color: #0f172a;
  color: #0f172a;
}

.btn.full-width {
  width: 100%;
}

/* 悬浮账号按钮 */
.account-fab {
  position: fixed;
  right: 32px;
  bottom: 32px;
  width: 52px;
  height: 52px;
  background: #0f172a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
  z-index: 100;
  transition: all 0.2s ease;
}

.account-fab:hover {
  background: #1e293b;
  transform: scale(1.05);
}

.account-fab svg {
  color: #fff;
}

.account-menu {
  position: absolute;
  bottom: 60px;
  right: 0;
  min-width: 160px;
  background: #fff;
  border: 1px solid var(--surface-divider, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  overflow: hidden;
  padding: 6px;
}

.menu-item {
  padding: 10px 14px;
  font-size: 0.9rem;
  color: var(--text-secondary, #475569);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.menu-item:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #0f172a;
}

.menu-divider {
  height: 1px;
  background: var(--surface-divider, #e2e8f0);
  margin: 6px 0;
}

/* 响应式 */
@media (max-width: 1200px) {
  .page-content {
    grid-template-columns: 200px 1fr 300px;
    gap: 32px;
    padding: 24px 32px;
  }
}

@media (max-width: 992px) {
  .page-toolbar {
    padding: 16px 24px;
  }
  
  .page-content {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px;
  }
  
  .side-nav {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .nav-modules {
    display: none;
  }
  
  .nav-filters {
    flex-direction: row;
    gap: 8px;
  }
  
  .filter-btn {
    width: auto;
    padding: 8px 14px;
  }
  
  .right-sidebar {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
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
  
  .nav-links {
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .nav-link {
    padding: 6px 12px;
    font-size: 0.85rem;
  }
  
  .page-content {
    padding: 20px 16px;
  }
  
  .right-sidebar {
    grid-template-columns: 1fr;
  }
  
  .group-events {
    margin-left: 24px;
  }
}

@media (max-width: 480px) {
  .toolbar-title h1 {
    font-size: 1.25rem;
  }
  
  .event-card {
    padding: 16px 18px;
  }
}
</style>
