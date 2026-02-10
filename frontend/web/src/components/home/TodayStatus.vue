<template>
  <aside class="right-sidebar">
    <div class="sidebar-card self-state-card">
      <div class="card-header">
        <h3>今日状态</h3>
      </div>

      <!-- 今日目标 -->
      <div class="state-block goals-block">
        <div class="block-header">
          <div class="block-label">今日目标</div>
          <button class="add-btn" title="添加目标" @click="openAddGoalModal">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div v-if="dailyGoals.length > 0" class="goals-list">
          <div
            v-for="goal in dailyGoals"
            :key="goal.id"
            class="goal-item"
            :class="{ completed: goal.isChecked }"
            @click="toggleGoalComplete(goal)"
          >
            <div class="goal-checkbox">
              <svg v-if="goal.isChecked" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span class="goal-title">{{ goal.title }}</span>

            <div class="goal-actions">
              <button class="action-btn edit" title="编辑" @click.stop="openEditGoalModal(goal)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button class="action-btn delete" title="删除" @click.stop="deleteGoal(goal)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="goals-empty">
          <button class="add-first-goal" @click="openAddGoalModal">+ 添加第一个目标</button>
        </div>

        <!-- 添加/编辑目标输入框 -->
        <div v-if="isAddingGoal || isEditingGoal" class="goal-input-wrapper">
          <input
            ref="goalInputRef"
            v-model="goalFormText"
            class="goal-input"
            :placeholder="isEditingGoal ? '修改目标标题...' : '输入目标标题...'"
            @keyup.enter="confirmGoalForm"
            @keyup.escape="cancelGoalForm"
          />
          <div class="goal-form-actions">
            <button class="form-btn cancel" @click="cancelGoalForm">取消</button>
            <button class="form-btn confirm" @click="confirmGoalForm">确定</button>
          </div>
        </div>

        <div v-if="goalsSummary.total > 0" class="goals-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: goalsProgress + '%' }"></div>
          </div>
          <span class="progress-text">{{ goalsSummary.completed }}/{{ goalsSummary.total }}</span>
        </div>
      </div>

      <!-- 本周关注 -->
      <div class="state-block">
        <div class="block-header">
          <div class="block-label">本周关注</div>
          <button class="add-btn" title="添加" @click="addWeeklyFocus">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        <div class="focus-tags">
          <span v-for="(item, index) in weeklyFocusItems" :key="item.id || index" class="focus-tag">
            {{ item.text }}
            <button class="remove-tag-btn" @click.stop="removeWeeklyFocus(index)">×</button>
          </span>
          <input
            v-if="isAddingFocus"
            ref="focusInputRef"
            v-model="newFocusText"
            class="focus-input"
            placeholder="输入关注点..."
            @keyup.enter="confirmAddFocus"
            @keyup.escape="cancelAddFocus"
            @blur="handleFocusBlur"
          />
        </div>
      </div>

      <!-- 本周打卡 -->
      <div class="state-block">
        <div class="block-header">
          <div class="block-label">本周打卡</div>
          <div class="checkin-streak-inline">
            <span class="streak-icon">🔥</span>
            <span>{{ checkinStreak }}</span>
          </div>
        </div>
        <div class="checkin-week">
          <div
            v-for="(day, index) in weeklyCheckinData"
            :key="index"
            class="checkin-day"
            :class="{ checked: day.checked, today: day.isToday }"
            :title="day.isToday ? (day.checked ? '今天已打卡' : '点击打卡') : ''"
            @click="handleCheckin(day)"
          >
            <div class="checkin-bar">
              <svg v-if="day.checked" class="check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span class="checkin-label">{{ day.label }}</span>
          </div>
        </div>
        <button v-if="canCheckinToday" class="checkin-btn" :disabled="isCheckingIn" @click="handleTodayCheckin">
          {{ isCheckingIn ? '打卡中...' : '✨ 今日打卡' }}
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { format } from 'date-fns'
import {
  dashboardApi,
  todayGoalsApi,
  weeklyFocusApi,
  weeklyCheckinApi,
  type TodayGoalDto,
  type WeeklyFocusItemDto,
  type WeeklyCheckinDto,
} from '@/api'

// Emits
const emit = defineEmits<{
  dashboardUpdated: []
}>()

// 今日目标状态
interface LocalGoal {
  id: string
  title: string
  isChecked: boolean
  sort: number
  isActive: boolean
}

const dailyGoals = ref<LocalGoal[]>([])
const goalsSummary = ref({ completed: 0, total: 0 })
const isAddingGoal = ref(false)
const isEditingGoal = ref(false)
const editingGoalId = ref<string | null>(null)
const goalFormText = ref('')
const goalInputRef = ref<HTMLInputElement | null>(null)

// 本周关注状态
const weeklyFocusItems = ref<WeeklyFocusItemDto[]>([])
const isAddingFocus = ref(false)
const newFocusText = ref('')
const focusInputRef = ref<HTMLInputElement | null>(null)

// 本周打卡状态
const weekCheckinData = ref<WeeklyCheckinDto>({ days: [], weekCount: 0 })
const isCheckingIn = ref(false)

// 防抖刷新
let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null
const scheduleRefresh = (delay = 500) => {
  if (refreshDebounceTimer) {
    clearTimeout(refreshDebounceTimer)
  }
  refreshDebounceTimer = setTimeout(() => {
    loadDashboard()
  }, delay)
}

// 计算属性
const goalsProgress = computed(() => {
  if (goalsSummary.value.total === 0) return 0
  return Math.round((goalsSummary.value.completed / goalsSummary.value.total) * 100)
})

interface CheckinDay {
  date: string
  checked: boolean
  label: string
  isToday: boolean
}

const weeklyCheckinData = computed<CheckinDay[]>(() => {
  const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
  const today = format(new Date(), 'yyyy-MM-dd')

  if (weekCheckinData.value.days && weekCheckinData.value.days.length > 0) {
    return weekCheckinData.value.days.map((day, index) => ({
      date: day.date,
      checked: day.checked,
      label: weekLabels[index] || '',
      isToday: day.date === today,
    }))
  }

  return weekLabels.map((label) => ({
    date: '',
    checked: false,
    label,
    isToday: false,
  }))
})

const checkinStreak = computed(() => {
  return weekCheckinData.value.weekCount || 0
})

const canCheckinToday = computed(() => {
  const todayData = weeklyCheckinData.value.find((d) => d.isToday)
  return todayData && !todayData.checked
})

// 加载数据
const loadDashboard = async () => {
  try {
    const response = await dashboardApi.getToday()

    if (response) {
      dailyGoals.value = (response.goals || []).map((goal: TodayGoalDto) => ({
        id: goal.id,
        title: goal.title,
        isChecked: goal.isChecked || false,
        sort: goal.sort || 0,
        isActive: goal.isActive !== false,
      }))

      goalsSummary.value = response.goalsSummary || { completed: 0, total: 0 }
      weeklyFocusItems.value = response.weeklyFocus || []
      weekCheckinData.value = response.weekCheckIn || { days: [], weekCount: 0 }

      emit('dashboardUpdated')
    }
  } catch (error) {
    console.error('加载今日状态失败:', error)
  }
}

// 目标方法
const openAddGoalModal = () => {
  isAddingGoal.value = true
  isEditingGoal.value = false
  editingGoalId.value = null
  goalFormText.value = ''
  nextTick(() => goalInputRef.value?.focus())
}

const openEditGoalModal = (goal: LocalGoal) => {
  isAddingGoal.value = false
  isEditingGoal.value = true
  editingGoalId.value = goal.id
  goalFormText.value = goal.title
  nextTick(() => goalInputRef.value?.focus())
}

const confirmGoalForm = async () => {
  const title = goalFormText.value.trim()
  if (!title) {
    cancelGoalForm()
    return
  }

  try {
    if (isEditingGoal.value && editingGoalId.value) {
      await todayGoalsApi.update(editingGoalId.value, { title })
    } else {
      await todayGoalsApi.create({ title })
    }
    await loadDashboard()
  } catch (error) {
    console.error(isEditingGoal.value ? '编辑目标失败:' : '添加目标失败:', error)
  }

  cancelGoalForm()
}

const cancelGoalForm = () => {
  goalFormText.value = ''
  isAddingGoal.value = false
  isEditingGoal.value = false
  editingGoalId.value = null
}

const deleteGoal = async (goal: LocalGoal) => {
  if (!confirm(`确定要删除目标"${goal.title}"吗？`)) return

  try {
    await todayGoalsApi.delete(goal.id)
    const index = dailyGoals.value.findIndex((g) => g.id === goal.id)
    if (index !== -1) {
      dailyGoals.value.splice(index, 1)
      goalsSummary.value.total = Math.max(0, goalsSummary.value.total - 1)
      if (goal.isChecked) {
        goalsSummary.value.completed = Math.max(0, goalsSummary.value.completed - 1)
      }
    }
  } catch (error) {
    console.error('删除目标失败:', error)
    await loadDashboard()
  }
}

const toggleGoalComplete = async (goal: LocalGoal) => {
  const newChecked = !goal.isChecked

  // 立即更新本地状态
  goal.isChecked = newChecked

  // 更新 summary
  if (newChecked) {
    goalsSummary.value.completed = Math.min(goalsSummary.value.completed + 1, goalsSummary.value.total)
  } else {
    goalsSummary.value.completed = Math.max(goalsSummary.value.completed - 1, 0)
  }

  try {
    await todayGoalsApi.check(goal.id, newChecked)
    scheduleRefresh(1000)
  } catch (error) {
    console.error('更新目标状态失败:', error)
    // 回滚
    goal.isChecked = !newChecked
    if (newChecked) {
      goalsSummary.value.completed = Math.max(goalsSummary.value.completed - 1, 0)
    } else {
      goalsSummary.value.completed = Math.min(goalsSummary.value.completed + 1, goalsSummary.value.total)
    }
  }
}

// 关注方法
const addWeeklyFocus = () => {
  isAddingFocus.value = true
  nextTick(() => focusInputRef.value?.focus())
}

const confirmAddFocus = async () => {
  const text = newFocusText.value.trim()
  if (!text) {
    cancelAddFocus()
    return
  }

  try {
    await weeklyFocusApi.create({ text })
    await loadDashboard()
  } catch (error) {
    console.error('添加关注失败:', error)
  }

  newFocusText.value = ''
  isAddingFocus.value = false
}

const cancelAddFocus = () => {
  newFocusText.value = ''
  isAddingFocus.value = false
}

const handleFocusBlur = () => {
  setTimeout(() => {
    if (isAddingFocus.value && !newFocusText.value.trim()) {
      cancelAddFocus()
    }
  }, 200)
}

const removeWeeklyFocus = async (index: number) => {
  const item = weeklyFocusItems.value[index]
  if (!item?.id) return

  const removed = weeklyFocusItems.value.splice(index, 1)

  try {
    await weeklyFocusApi.delete(item.id)
  } catch (error) {
    console.error('删除关注失败:', error)
    weeklyFocusItems.value.splice(index, 0, ...removed)
  }
}

// 打卡方法
const handleCheckin = async (day: CheckinDay) => {
  if (!day.isToday || day.checked) return
  await handleTodayCheckin()
}

const handleTodayCheckin = async () => {
  if (isCheckingIn.value) return

  isCheckingIn.value = true

  try {
    await weeklyCheckinApi.checkin()
    const todayData = weeklyCheckinData.value.find((d) => d.isToday)
    if (todayData) {
      todayData.checked = true
    }
    weekCheckinData.value.weekCount = (weekCheckinData.value.weekCount || 0) + 1
    scheduleRefresh(500)
  } catch (error) {
    console.error('打卡失败:', error)
  } finally {
    isCheckingIn.value = false
  }
}

// 暴露方法
defineExpose({
  loadDashboard,
})

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped lang="scss">
.right-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.card-header {
  margin-bottom: 8px;

  h3 {
    font-size: 0.85rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }
}

.state-block {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.block-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.04);
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #0f172a;
    color: #fff;
  }
}

// Goals Block
.goals-block {
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.goals-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.goal-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.04);

    .goal-actions {
      opacity: 1;
    }
  }

  &.completed {
    opacity: 0.6;

    .goal-title {
      text-decoration: line-through;
    }

    .goal-checkbox {
      background: #22c55e;
      border-color: #22c55e;

      svg {
        stroke: #fff;
      }
    }
  }
}

.goal-checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #fff;
  transition: all 0.2s ease;
}

.goal-item:hover .goal-checkbox {
  border-color: #22c55e;
}

.goal-title {
  flex: 1;
  font-size: 0.75rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.goal-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }

  &.edit:hover {
    color: #3b82f6;
  }

  &.delete:hover {
    color: #ef4444;
  }
}

.goal-input-wrapper {
  margin-top: 8px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
}

.goal-input {
  width: 100%;
  padding: 8px;
  font-size: 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #fff;
  color: #0f172a;
  margin-bottom: 8px;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0f172a;
  }
}

.goal-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.form-btn {
  padding: 6px 12px;
  font-size: 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  &.cancel {
    background: #f1f5f9;
    color: #64748b;

    &:hover {
      background: #e2e8f0;
    }
  }

  &.confirm {
    background: #0f172a;
    color: #fff;

    &:hover {
      background: #1e293b;
    }
  }
}

.goals-empty {
  text-align: center;
  padding: 8px;
}

.add-first-goal {
  padding: 6px 12px;
  background: transparent;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #0f172a;
    color: #0f172a;
  }
}

.goals-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.65rem;
  color: #94a3b8;
  white-space: nowrap;
}

// Weekly Focus
.focus-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.focus-tag {
  position: relative;
  padding: 4px 8px;
  font-size: 0.7rem;
  color: #475569;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  padding-right: 18px;

  &:hover .remove-tag-btn {
    opacity: 1;
  }
}

.remove-tag-btn {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: #ef4444;
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 8px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.focus-input {
  flex: 1;
  min-width: 80px;
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.7rem;
  outline: none;

  &:focus {
    border-color: #0f172a;
  }
}

// Weekly Checkin
.checkin-streak-inline {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  font-weight: 600;
  color: #64748b;

  .streak-icon {
    font-size: 0.7rem;
  }
}

.checkin-week {
  display: flex;
  gap: 4px;
}

.checkin-day {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;

  .checkin-bar {
    width: 100%;
    height: 20px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 4px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &:hover .checkin-bar {
    transform: translateY(-1px);
  }

  &.checked .checkin-bar {
    background: #0f172a;
  }

  &.today .checkin-bar {
    box-shadow: 0 0 0 2px #3b82f6;
  }

  .check-icon {
    stroke: #fff;
  }
}

.checkin-label {
  font-size: 0.55rem;
  color: #94a3b8;
}

.checkin-day.today .checkin-label {
  color: #0f172a;
  font-weight: 600;
}

.checkin-btn {
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

@media (max-width: 768px) {
  .goal-actions {
    opacity: 1;
  }

  .remove-tag-btn {
    opacity: 1;
  }
}
</style>

