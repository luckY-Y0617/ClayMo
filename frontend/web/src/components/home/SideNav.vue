<template>
  <aside class="side-nav">
    <!-- 回到今天 -->
    <button v-if="showTodayBtn" class="nav-today-btn" @click="scrollToToday">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span>今天</span>
    </button>

    <!-- GitHub 信息卡片 -->
    <div class="module-card github-card">
      <div class="github-header">
        <svg class="github-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
          />
        </svg>
        <span class="github-username">{{ githubInfo.username }}</span>
      </div>
      <div class="github-stats">
        <div class="github-stat">
          <span class="stat-number">{{ githubInfo.repos }}</span>
          <span class="stat-label">仓库</span>
        </div>
        <div class="github-stat">
          <span class="stat-number">{{ githubInfo.followers }}</span>
          <span class="stat-label">关注者</span>
        </div>
        <div class="github-stat">
          <span class="stat-number">{{ githubInfo.following }}</span>
          <span class="stat-label">关注</span>
        </div>
      </div>
      <div class="github-contributions">
        <div class="contributions-label">本周贡献</div>
        <div class="contributions-bar">
          <div
            v-for="(count, idx) in githubInfo.weeklyContributions"
            :key="idx"
            class="contribution-day"
            :class="getContributionLevel(count)"
            :title="`${count} contributions`"
          ></div>
        </div>
      </div>
      <a :href="githubInfo.profileUrl" target="_blank" class="github-link"> 查看主页 → </a>
    </div>

    <!-- 番茄钟卡片 -->
    <PomodoroTimer
      ref="pomodoroRef"
      class="module-card"
      @session-completed="handlePomodoroCompleted"
      @stats-updated="handleStatsUpdated"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PomodoroTimer from '@/components/common/PomodoroTimer.vue'
import type { FocusSessionDto, FocusTodayStatsDto } from '@/api/modules/workspace'

// Props & Emits
const props = defineProps<{
  hasTodayEvents?: boolean
  todayRef?: HTMLElement | null
}>()

const emit = defineEmits<{
  pomodoroCompleted: []
  pomodoroStatsUpdated: []
}>()

// 状态
interface GitHubInfo {
  username: string
  repos: number
  followers: number
  following: number
  weeklyContributions: number[]
  profileUrl: string
}

const githubInfo = ref<GitHubInfo>({
  username: 'luckYY',
  repos: 42,
  followers: 128,
  following: 56,
  weeklyContributions: [3, 7, 2, 5, 8, 1, 4],
  profileUrl: 'https://github.com/luckYY',
})

const pomodoroRef = ref<InstanceType<typeof PomodoroTimer> | null>(null)

// 计算属性
const showTodayBtn = computed(() => props.hasTodayEvents)

// 方法
const getContributionLevel = (count: number) => {
  if (count === 0) return 'level-0'
  if (count <= 2) return 'level-1'
  if (count <= 4) return 'level-2'
  if (count <= 6) return 'level-3'
  return 'level-4'
}

const scrollToToday = () => {
  if (props.todayRef) {
    props.todayRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const handlePomodoroCompleted = (_session: FocusSessionDto) => {
  emit('pomodoroCompleted')
}

const handleStatsUpdated = (_stats: FocusTodayStatsDto) => {
  emit('pomodoroStatsUpdated')
}

// 暴露方法
defineExpose({
  refreshPomodoro: () => pomodoroRef.value?.refresh(),
})
</script>

<style scoped lang="scss">
@import '@/styles/components/side-nav.scss';
</style>

