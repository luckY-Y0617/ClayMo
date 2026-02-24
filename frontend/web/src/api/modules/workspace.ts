import { http, API } from '@/utils/http'

// ============ 类型定义 ============

export interface ActivityQueryParams {
  teamId?: string | null
  userId?: string | null
  objectType?: string | null
  objectId?: string | null
  subjectType?: string | null
  subjectId?: string | null
  skipCount?: number
  maxResultCount?: number
}

export interface ActivityDto {
  id: string
  action: string
  occurredAt: string
  actorUserId: string
  actorUserName: string
  objectType: string
  objectId: string
  subjectType?: string
  subjectId?: string
  dataJson?: string
}

export interface FocusStartInput {
  id: string
  teamId?: string | null
  plannedSeconds: number
  title?: string | null
}

export interface FocusSessionDto {
  id: string
  teamId?: string | null
  userId: string
  title?: string | null
  plannedSeconds: number
  actualSeconds: number
  status: 'Running' | 'Paused' | 'Completed' | 'Canceled'
  startAt: string
  endAt?: string | null
  runningSegmentStartAt?: string | null
}

export interface FocusTodayStatsDto {
  teamId?: string | null
  focusMinutes: number
  completedPomodoros: number
}

export interface TodayGoalDto {
  id: string
  title: string
  mode: 'checkbox' | 'counter'
  targetCount?: number
  doneCount?: number
  isChecked: boolean
  sort: number
  isActive: boolean
}

export interface TodayGoalCreateInput {
  title: string
  mode?: 'checkbox' | 'counter'
  targetCount?: number
  sort?: number
}

export interface TodayGoalUpdateInput {
  title?: string
  mode?: 'checkbox' | 'counter'
  targetCount?: number
  sort?: number
  isActive?: boolean
}

export interface WeeklyFocusItemDto {
  id: string
  text: string
  sort: number
}

export interface WeeklyCheckinDto {
  days: Array<{ date: string; checked: boolean }>
  weekCount: number
}

export interface DashboardTodayDto {
  goals: TodayGoalDto[]
  goalsSummary: { completed: number; total: number }
  weeklyFocus: WeeklyFocusItemDto[]
  weekCheckIn: WeeklyCheckinDto
}

// ============ API 实现 ============

export const activityApi = {
  /**
   * 获取活动列表
   */
  getActivities(params: ActivityQueryParams = {}): Promise<ActivityDto[]> {
    return http.get(`${API}/app/workspace/activity`, {
      params: {
        teamId: params.teamId || null,
        userId: params.userId || null,
        objectType: params.objectType || null,
        objectId: params.objectId || null,
        subjectType: params.subjectType || null,
        subjectId: params.subjectId || null,
        skipCount: params.skipCount ?? 0,
        maxResultCount: params.maxResultCount ?? 20,
      },
    })
  },

  getRecent(params: { teamId?: string | null; limit?: number } = {}): Promise<ActivityDto[]> {
    return this.getActivities({
      teamId: params.teamId,
      maxResultCount: params.limit ?? 20,
    })
  },

  getKbActivities(kbId: string, params: ActivityQueryParams = {}): Promise<ActivityDto[]> {
    return this.getActivities({
      ...params,
      subjectType: 'kb',
      subjectId: kbId,
    })
  },

  getDocActivities(docId: string, params: ActivityQueryParams = {}): Promise<ActivityDto[]> {
    return this.getActivities({
      ...params,
      objectType: 'doc',
      objectId: docId,
    })
  },
}

export const focusApi = {
  /**
   * 开始一个新的专注会话
   */
  start(input: FocusStartInput): Promise<FocusSessionDto> {
    return http.post(`${API}/app/workspace/focus/start`, input)
  },

  /**
   * 暂停当前会话
   */
  pause(id: string): Promise<FocusSessionDto> {
    return http.post(`${API}/app/workspace/focus/${id}/pause`, {})
  },

  /**
   * 继续当前会话
   */
  resume(id: string): Promise<FocusSessionDto> {
    return http.post(`${API}/app/workspace/focus/${id}/resume`, {})
  },

  /**
   * 完成会话
   */
  finish(id: string): Promise<FocusSessionDto> {
    return http.post(`${API}/app/workspace/focus/${id}/finish`, {})
  },

  /**
   * 取消会话
   */
  cancel(id: string): Promise<FocusSessionDto> {
    return http.post(`${API}/app/workspace/focus/${id}/cancel`, {})
  },

  /**
   * 获取当前进行中的会话
   */
  getCurrent(): Promise<FocusSessionDto | null> {
    return http.get(`${API}/app/workspace/focus/current`)
  },

  /**
   * 获取今日统计
   */
  getTodayStats(): Promise<FocusTodayStatsDto> {
    return http.get(`${API}/app/workspace/focus/stats/today`)
  },
}

export interface MonthCheckInDto {
  year: number
  month: number
  checkedDates: string[]
  streakCount: number
  monthCount: number
}

export interface DayGoalsDto {
  date: string
  goals: TodayGoalDto[]
  summary: { completed: number; total: number }
}

export const dashboardApi = {
  /**
   * 获取今日状态聚合数据
   */
  getToday(params: { date?: string; weekStart?: string } = {}): Promise<DashboardTodayDto> {
    return http.get(`${API}/app/workspace/dashboard/today`, { params })
  },

  /**
   * 获取指定月份的打卡记录
   */
  getMonthCheckIn(params: { year?: number; month?: number } = {}): Promise<MonthCheckInDto> {
    return http.get(`${API}/app/workspace/dashboard/month-checkin`, { params })
  },

  /**
   * 获取指定日期的目标进度
   */
  getDayGoals(params: { date?: string } = {}): Promise<DayGoalsDto> {
    return http.get(`${API}/app/workspace/dashboard/day-goals`, { params })
  },
}

export const todayGoalsApi = {
  /**
   * 新增目标
   */
  create(goal: TodayGoalCreateInput): Promise<TodayGoalDto> {
    return http.post(`${API}/app/workspace/today/goals`, goal)
  },

  /**
   * 编辑目标
   */
  update(id: string, goal: TodayGoalUpdateInput): Promise<TodayGoalDto> {
    return http.put(`${API}/app/workspace/today/goals/${id}`, goal)
  },

  /**
   * 删除目标
   */
  delete(id: string): Promise<void> {
    return http.delete(`${API}/app/workspace/today/goals/${id}`)
  },

  /**
   * 勾选类目标完成/取消
   */
  check(id: string, isChecked: boolean): Promise<TodayGoalDto> {
    return http.post(`${API}/app/workspace/today/goals/${id}/check`, { isChecked })
  },

  /**
   * 计数类目标 +1
   */
  increment(id: string): Promise<TodayGoalDto> {
    return http.post(`${API}/app/workspace/today/goals/${id}/increment`, {})
  },

  /**
   * 计数类目标 -1
   */
  decrement(id: string): Promise<TodayGoalDto> {
    return http.post(`${API}/app/workspace/today/goals/${id}/decrement`, {})
  },
}

export const weeklyFocusApi = {
  /**
   * 获取本周关注列表
   */
  getList(weekStart?: string): Promise<WeeklyFocusItemDto[]> {
    const params = weekStart ? { weekStart } : {}
    return http.get(`${API}/app/workspace/week/focus-items`, { params })
  },

  /**
   * 新增关注项
   */
  create(item: { text: string; sort?: number }): Promise<WeeklyFocusItemDto> {
    return http.post(`${API}/app/workspace/week/focus-items`, item)
  },

  /**
   * 删除关注项
   */
  delete(id: string): Promise<void> {
    return http.delete(`${API}/app/workspace/week/focus-items/${id}`)
  },
}

export const weeklyCheckinApi = {
  /**
   * 获取本周打卡状态
   */
  get(weekStart?: string): Promise<WeeklyCheckinDto> {
    const params = weekStart ? { weekStart } : {}
    return http.get(`${API}/app/workspace/week/checkin`, { params })
  },

  /**
   * 手动打卡
   */
  checkin(date?: string): Promise<void> {
    const body = date ? { date } : {}
    return http.post(`${API}/app/workspace/week/checkin`, body)
  },
}

// 统一导出
export const workspaceApi = {
  activity: activityApi,
  focus: focusApi,
  dashboard: dashboardApi,
  todayGoals: todayGoalsApi,
  weeklyFocus: weeklyFocusApi,
  weeklyCheckin: weeklyCheckinApi,
}
