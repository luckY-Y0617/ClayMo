export { authApi, captchaApi, smsApi, teamApi } from './modules/auth'
export type { CaptchaResponse } from './modules/auth'
export {
  workspaceApi,
  activityApi,
  focusApi,
  dashboardApi,
  todayGoalsApi,
  weeklyFocusApi,
  weeklyCheckinApi,
} from './modules/workspace'
export { kbApi } from './modules/knowledge'

// 类型导出
export type {
  ActivityDto,
  ActivityQueryParams,
  FocusSessionDto,
  FocusStartInput,
  FocusTodayStatsDto,
  TodayGoalDto,
  WeeklyFocusItemDto,
  WeeklyCheckinDto,
  DashboardTodayDto,
  MonthCheckInDto,
  DayGoalsDto,
} from './modules/workspace'

export type {
  KbVisibility,
  KbMemberRole,
  DocumentType,
  KnowledgeBase,
  KbContext,
  DocumentNode,
  DocumentDetail,
  Comment,
  CommentPosition,
  KbMember,
  KbCapabilities,
  Tag,
} from './modules/knowledge'

// 默认导出
import { authApi, captchaApi, smsApi, teamApi } from './modules/auth'
import { workspaceApi } from './modules/workspace'
import { kbApi } from './modules/knowledge'

export default {
  auth: authApi,
  captcha: captchaApi,
  sms: smsApi,
  team: teamApi,
  workspace: workspaceApi,
  kb: kbApi,
}

