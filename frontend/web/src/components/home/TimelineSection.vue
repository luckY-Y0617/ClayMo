<template>
  <div class="timeline-main">
    <!-- 时间线顶部筛选 -->
    <div class="timeline-header">
      <div class="timeline-filters">
        <button
          v-for="tag in filterTags"
          :key="tag.key"
          class="filter-chip"
          :class="{ active: activeFilter === tag.key }"
          @click="setActiveFilter(tag.key)"
        >
          {{ tag.label }}
        </button>
      </div>
    </div>

    <!-- 加载状态（首次加载） -->
    <div v-if="timelineLoading && timelineEvents.length === 0" class="loading-state">
      <div class="loading-spinner">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      </div>
      <p>正在加载时间线...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="timelineError && timelineEvents.length === 0" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>加载失败</h3>
      <p>{{ timelineError }}</p>
      <button class="btn primary" @click="retryLoad">重新加载</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredEvents.length === 0 && !timelineLoading" class="empty-state">
      <div class="empty-icon">📝</div>
      <h3>时间线还空空的</h3>
      <p>从创建第一篇文档或第一篇旅程开始，让这里记录你的一切。</p>
      <button class="btn primary" @click="handleStartWriting">开始写作</button>
    </div>

    <!-- 时间线 -->
    <div v-else class="timeline-list">
      <TransitionGroup name="timeline-group">
        <div
          v-for="group in groupedEvents"
          :key="group.date"
          :ref="(el) => { if (group.isToday && el) emit('todayRefFound', el as HTMLElement) }"
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
            <TransitionGroup name="event-card">
              <div
                v-for="event in group.events"
                :key="event.id"
                class="event-card"
                :class="{ 'has-link': event.link, 'is-new': isNewEvent(event.id) }"
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
                  <div v-if="event.detail" class="event-detail">{{ event.detail }}</div>
                </div>
                <div v-if="event.relation || event.primaryAction" class="event-footer">
                  <span class="event-relation">{{ event.relation }}</span>
                  <a
                    v-if="event.primaryAction && event.link"
                    href="#"
                    class="event-action"
                    @click.stop.prevent="handlePrimaryAction(event)"
                  >
                    {{ event.primaryAction }} →
                  </a>
                </div>
              </div>
            </TransitionGroup>
          </div>
        </div>
      </TransitionGroup>

      <!-- 加载更多 -->
      <div v-if="hasMore" class="load-more">
        <button class="load-more-btn" :disabled="timelineLoading" @click="loadMoreEvents">
          <span v-if="timelineLoading" class="loading-text">
            <el-icon class="is-loading" :size="16"><Loading /></el-icon>
            加载中...
          </span>
          <span v-else>加载更多</span>
        </button>
      </div>

      <!-- 已加载全部 -->
      <div v-else-if="timelineEvents.length > 0" class="all-loaded">
        <span>— 已加载全部 —</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import {
  groupActivitiesByDate,
  getModuleLabel as _getModuleLabel,
  mapActivities,
  type ActivityViewModel,
  type ActivityGroup,
} from '@/utils/activity-mapper'
import { activityApi, type ActivityDto } from '@/api'
import { useTeamStore } from '@/stores/team'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const teamStore = useTeamStore()
const authStore = useAuthStore()

// Props & Emits
const emit = defineEmits<{
  todayRefFound: [el: HTMLElement]
}>()

// 状态
const timelineEvents = ref<ActivityViewModel[]>([])
const timelineLoading = ref(false)
const timelineError = ref<string | null>(null)
const hasMore = ref(true)
const currentPage = ref(0)
const pageSize = 20
const activeFilter = ref<string>('all')

// 新增条目追踪（用于动画）
const newEventIds = ref<Set<string>>(new Set())

interface FilterTag {
  key: string
  label: string
}

const filterTags = ref<FilterTag[]>([
  { key: 'all', label: '全部' },
  { key: 'knowledge', label: '知识' },
  { key: 'travel', label: '旅程' },
  { key: 'system', label: '系统' },
])

// 计算属性
const filteredEvents = computed(() => {
  if (activeFilter.value === 'all') {
    return timelineEvents.value
  }
  return timelineEvents.value.filter((event) => event.module === activeFilter.value)
})

const groupedEvents = computed<ActivityGroup[]>(() => {
  return groupActivitiesByDate(filteredEvents.value)
})

// 方法
const setActiveFilter = (key: string) => {
  activeFilter.value = key
}

const getModuleLabel = (module: string) => {
  return _getModuleLabel(module)
}

const resetAndLoad = () => {
  timelineEvents.value = []
  currentPage.value = 0
  hasMore.value = true
  timelineError.value = null
  newEventIds.value.clear()
  loadTimelineEvents()
}

/**
 * 智能刷新：对比新旧数据，只对新增条目应用动画
 */
const refreshWithDiff = async () => {
  if (timelineLoading.value) return

  timelineLoading.value = true
  timelineError.value = null

  try {
    // 保存当前已有的 ID
    const existingIds = new Set(timelineEvents.value.map((e) => e.id))

    // 个人空间传userId，团队空间传teamId
    const isPersonal = !teamStore.currentTeamId
    const params = isPersonal
      ? { userId: authStore.user?.id, skipCount: 0, maxResultCount: pageSize }
      : { teamId: teamStore.currentTeamId || null, skipCount: 0, maxResultCount: pageSize }

    const response = await activityApi.getActivities(params)

    const rawActivities: ActivityDto[] = Array.isArray(response)
      ? response
      : ((response as any)?.items || (response as any)?.list || [])

    const viewModels = mapActivities(rawActivities)

    // 找出新增的条目 ID
    const newIds = new Set<string>()
    viewModels.forEach((vm) => {
      if (!existingIds.has(vm.id)) {
        newIds.add(vm.id)
      }
    })

    // 更新新增 ID 集合（用于模板中判断是否应用动画）
    newEventIds.value = newIds

    // 更新数据
    timelineEvents.value = viewModels
    hasMore.value = rawActivities.length >= pageSize
    currentPage.value = 1

    // 动画完成后清除标记（避免滚动时重复动画）
    if (newIds.size > 0) {
      setTimeout(() => {
        newEventIds.value.clear()
      }, 800) // 动画时长 + 缓冲
    }
  } catch (error: any) {
    console.error('[Timeline] 刷新失败:', error)
    timelineError.value = error?.message || '刷新失败'
  } finally {
    timelineLoading.value = false
  }
}

const loadTimelineEvents = async (loadMore = false) => {
  if (timelineLoading.value) return
  if (loadMore && !hasMore.value) return

  timelineLoading.value = true
  timelineError.value = null

  try {
    const skipCount = loadMore ? timelineEvents.value.length : 0

    // 个人空间传userId，团队空间传teamId
    const isPersonal = !teamStore.currentTeamId
    const params = isPersonal
      ? { userId: authStore.user?.id, skipCount, maxResultCount: pageSize }
      : { teamId: teamStore.currentTeamId || null, skipCount, maxResultCount: pageSize }

    const response = await activityApi.getActivities(params)

    const rawActivities: ActivityDto[] = Array.isArray(response)
      ? response
      : ((response as any)?.items || (response as any)?.list || [])

    const viewModels = mapActivities(rawActivities)

    if (loadMore) {
      timelineEvents.value = [...timelineEvents.value, ...viewModels]
    } else {
      timelineEvents.value = viewModels
    }

    hasMore.value = rawActivities.length >= pageSize
    currentPage.value += 1
  } catch (error: any) {
    console.error('[Timeline] 加载时间线失败:', error)
    timelineError.value = error?.message || '加载失败，请稍后重试'

    if (!loadMore) {
      timelineEvents.value = []
    }
  } finally {
    timelineLoading.value = false
  }
}

const loadMoreEvents = () => {
  loadTimelineEvents(true)
}

const retryLoad = () => {
  resetAndLoad()
}

const handleEventClick = (event: ActivityViewModel) => {
  if (event.link) {
    router.push(event.link)
  }
}

const handlePrimaryAction = (event: ActivityViewModel) => {
  if (event.link) {
    router.push(event.link)
  }
}

const handleStartWriting = () => {
  console.log('跳转到创建文档')
}

// 判断是否为新增条目
const isNewEvent = (eventId: string) => newEventIds.value.has(eventId)

// 暴露方法
defineExpose({
  resetAndLoad,
  loadTimelineEvents,
  refreshWithDiff,
})

// 初始化
resetAndLoad()
</script>

<style scoped lang="scss">
@import '@/styles/components/timeline.scss';
</style>

