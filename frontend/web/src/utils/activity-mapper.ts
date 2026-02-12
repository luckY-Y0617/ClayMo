import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { ActivityDto } from '@/api/modules/workspace'

// ============ 类型定义 ============

export interface ActivityActor {
  id: string
  name: string
}

export interface ActivityRaw {
  objectType: string
  objectId: string
  subjectType?: string
  subjectId?: string
  data: Record<string, unknown>
}

export interface ActivityViewModel {
  id: string
  timestamp: string
  time: string
  timeAgo: string
  actor: ActivityActor
  module: 'knowledge' | 'travel' | 'system'
  action: string
  icon: string
  summary: string
  detail: string | null
  link: string | null
  primaryAction: string | null
  relation: string | null
  raw: ActivityRaw
}

export interface ActivityGroup {
  date: string
  title: string
  isToday: boolean
  isYesterday: boolean
  events: ActivityViewModel[]
}

// ============ Action 类型常量 ============

export const ActivityActions = {
  KB_CREATED: 'kb.created',
  KB_UPDATED: 'kb.updated',
  KB_DELETED: 'kb.deleted',
  KB_MEMBER_ADDED: 'kb.member.added',
  KB_MEMBER_REMOVED: 'kb.member.removed',
  DOC_CREATED: 'kb.doc.created',
  DOC_UPDATED: 'kb.doc.updated',
  DOC_DELETED: 'kb.doc.deleted',
  DOC_MOVED: 'kb.doc.moved',
  DOC_PUBLISHED: 'kb.doc.published',
  DOC_ARCHIVED: 'kb.doc.archived',
  COMMENT_CREATED: 'kb.doc.comment.created',
  COMMENT_REPLIED: 'kb.doc.comment.replied',
  COMMENT_RESOLVED: 'kb.doc.comment.resolved',
  TRAVEL_CREATED: 'travel.created',
  TRAVEL_UPDATED: 'travel.updated',
  TRAVEL_NODE_ADDED: 'travel.node.added',
  FOCUS_COMPLETED: 'focus.completed',
  USER_LOGIN: 'user.login',
  USER_SETTINGS_UPDATED: 'user.settings.updated',
} as const

// ============ 图标映射 ============

const IconMap: Record<string, string> = {
  'kb.created': 'kb-add',
  'kb.updated': 'kb-edit',
  'kb.deleted': 'kb-delete',
  'kb.member.added': 'user-add',
  'kb.member.removed': 'user-remove',
  'kb.doc.created': 'doc-add',
  'kb.doc.updated': 'doc-edit',
  'kb.doc.deleted': 'doc-delete',
  'kb.doc.moved': 'doc-move',
  'kb.doc.published': 'doc-publish',
  'kb.doc.archived': 'doc-archive',
  'kb.doc.comment.created': 'comment-add',
  'kb.doc.comment.replied': 'comment-reply',
  'kb.doc.comment.resolved': 'comment-check',
  'travel.created': 'travel-add',
  'travel.updated': 'travel-edit',
  'travel.node.added': 'travel-node',
  'focus.completed': 'focus-done',
  'user.login': 'user-login',
  'user.settings.updated': 'settings',
  default: 'activity',
}

// ============ 时间格式化 ============

export function formatActivityTime(dateStr: string): string {
  if (!dateStr) return ''

  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`
    if (isToday(date)) return format(date, 'HH:mm', { locale: zhCN })
    if (isYesterday(date)) return `昨天 ${format(date, 'HH:mm', { locale: zhCN })}`
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'M月d日 HH:mm', { locale: zhCN })
    }
    return format(date, 'yyyy年M月d日', { locale: zhCN })
  } catch {
    return dateStr
  }
}

export function formatTimeOnly(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, 'HH:mm', { locale: zhCN })
  } catch {
    return ''
  }
}

export function getDateGroupTitle(dateStr: string | Date): string {
  if (!dateStr) return '未知时间'

  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (isToday(date)) return `今天 · ${format(date, 'M月d日', { locale: zhCN })}`
    if (isYesterday(date)) return `昨天 · ${format(date, 'M月d日', { locale: zhCN })}`
    return format(date, 'M月d日', { locale: zhCN })
  } catch {
    return '未知时间'
  }
}

// ============ 安全解析 JSON ============

function safeParseJson(jsonStr?: string): Record<string, unknown> {
  if (!jsonStr) return {}
  try {
    return JSON.parse(jsonStr)
  } catch {
    return {}
  }
}

// ============ 渲染器函数 ============

type ActivityModule = 'knowledge' | 'travel' | 'system'

function createViewModel(
  activity: ActivityDto,
  options: {
    module: ActivityModule
    icon: string
    summary: string
    detail?: string | null
    link?: string | null
    primaryAction?: string | null
    relation?: string | null
  }
): ActivityViewModel {
  const data = safeParseJson(activity.dataJson)

  return {
    id: activity.id,
    timestamp: activity.occurredAt,
    time: formatTimeOnly(activity.occurredAt),
    timeAgo: formatActivityTime(activity.occurredAt),
    actor: {
      id: activity.actorUserId,
      name: activity.actorUserName || '用户',
    },
    module: options.module,
    action: activity.action,
    icon: options.icon,
    summary: options.summary,
    detail: options.detail ?? null,
    link: options.link ?? null,
    primaryAction: options.primaryAction ?? null,
    relation: options.relation ?? null,
    raw: {
      objectType: activity.objectType,
      objectId: activity.objectId,
      subjectType: activity.subjectType,
      subjectId: activity.subjectId,
      data,
    },
  }
}

function renderDocCreated(activity: ActivityDto): ActivityViewModel {
  const data = safeParseJson(activity.dataJson)
  const title = (data.Title as string) || (data.title as string) || '未命名文档'

  return createViewModel(activity, {
    module: 'knowledge',
    icon: IconMap[activity.action] || 'doc-add',
    summary: `创建了文档「${title}」`,
    detail: data.KnowledgeBaseName ? `在知识库「${data.KnowledgeBaseName}」中` : null,
    link:
      activity.subjectId && activity.objectId
        ? `/kb/${activity.subjectId}/edit/${activity.objectId}`
        : null,
    primaryAction: '查看文档',
    relation: '我创建',
  })
}

function renderDocUpdated(activity: ActivityDto): ActivityViewModel {
  const data = safeParseJson(activity.dataJson)
  const title = (data.Title as string) || (data.title as string) || '未命名文档'

  return createViewModel(activity, {
    module: 'knowledge',
    icon: IconMap[activity.action] || 'doc-edit',
    summary: `更新了文档「${title}」`,
    detail: data.ChangeType ? `${data.ChangeType}` : null,
    link:
      activity.subjectId && activity.objectId
        ? `/kb/${activity.subjectId}/edit/${activity.objectId}`
        : null,
    primaryAction: '查看文档',
    relation: '我编辑',
  })
}

function renderDocDeleted(activity: ActivityDto): ActivityViewModel {
  const data = safeParseJson(activity.dataJson)
  const title = (data.Title as string) || (data.title as string) || '未命名文档'

  return createViewModel(activity, {
    module: 'knowledge',
    icon: IconMap[activity.action] || 'doc-delete',
    summary: `删除了文档「${title}」`,
    relation: '我删除',
  })
}

function renderDocMoved(activity: ActivityDto): ActivityViewModel {
  const data = safeParseJson(activity.dataJson)
  const title = (data.Title as string) || (data.title as string) || '未命名文档'
  const fromFolder = (data.FromFolder as string) || (data.fromFolder as string)
  const toFolder = (data.ToFolder as string) || (data.toFolder as string)

  let detail: string | null = null
  if (fromFolder && toFolder) {
    detail = `从「${fromFolder}」移动到「${toFolder}」`
  } else if (toFolder) {
    detail = `移动到「${toFolder}」`
  }

  return createViewModel(activity, {
    module: 'knowledge',
    icon: IconMap[activity.action] || 'doc-move',
    summary: `移动了文档「${title}」`,
    detail,
    link:
      activity.subjectId && activity.objectId
        ? `/kb/${activity.subjectId}/edit/${activity.objectId}`
        : null,
    primaryAction: '查看文档',
    relation: '我移动',
  })
}

function renderKbCreated(activity: ActivityDto): ActivityViewModel {
  const data = safeParseJson(activity.dataJson)
  const name = (data.Name as string) || (data.name as string) || '未命名知识库'

  return createViewModel(activity, {
    module: 'knowledge',
    icon: IconMap[activity.action] || 'kb-add',
    summary: `创建了知识库「${name}」`,
    detail: (data.Description as string) || null,
    link: activity.objectId ? `/kb/${activity.objectId}/overview` : null,
    primaryAction: '进入知识库',
    relation: '我创建',
  })
}

function renderCommentCreated(activity: ActivityDto): ActivityViewModel {
  const data = safeParseJson(activity.dataJson)
  const docTitle = (data.DocTitle as string) || (data.docTitle as string) || '文档'
  const commentText = (data.Content as string) || (data.content as string) || ''
  const preview = commentText.length > 30 ? commentText.slice(0, 30) + '...' : commentText

  return createViewModel(activity, {
    module: 'knowledge',
    icon: IconMap[activity.action] || 'comment-add',
    summary: `在「${docTitle}」中添加了评论`,
    detail: preview || null,
    link:
      data.DocId && data.KnowledgeBaseId
        ? `/kb/${data.KnowledgeBaseId}/edit/${data.DocId}`
        : null,
    primaryAction: '查看评论',
    relation: '我评论',
  })
}

function renderTravelCreated(activity: ActivityDto): ActivityViewModel {
  const data = safeParseJson(activity.dataJson)
  const title = (data.Title as string) || (data.title as string) || '未命名旅程'

  return createViewModel(activity, {
    module: 'travel',
    icon: IconMap[activity.action] || 'travel-add',
    summary: `创建了旅程「${title}」`,
    detail: data.Destination ? `目的地：${data.Destination}` : null,
    link: activity.objectId ? `/travel/${activity.objectId}` : null,
    primaryAction: '查看旅程',
    relation: '我创建',
  })
}

function renderFocusCompleted(activity: ActivityDto): ActivityViewModel {
  const data = safeParseJson(activity.dataJson)
  const title = (data.Title as string) || (data.title as string) || '专注'
  const focusMinutes = (data.FocusMinutes as number) || (data.focusMinutes as number) || 0
  const actualSeconds = (data.ActualSeconds as number) || (data.actualSeconds as number) || 0
  const minutes = focusMinutes || Math.floor(actualSeconds / 60)

  return createViewModel(activity, {
    module: 'system',
    icon: IconMap[activity.action] || 'focus-done',
    summary: `完成了 ${minutes} 分钟专注`,
    detail: title !== '专注' ? `「${title}」` : null,
    relation: '我完成',
  })
}

function renderDefault(activity: ActivityDto): ActivityViewModel {
  const actionParts = (activity.action || '').split('.')
  const firstPart = actionParts[0]

  const moduleMap: Record<string, ActivityModule> = {
    kb: 'knowledge',
    doc: 'knowledge',
    travel: 'travel',
    user: 'system',
  }

  const module: ActivityModule = moduleMap[activity.objectType] || moduleMap[firstPart] || 'system'

  return createViewModel(activity, {
    module,
    icon: IconMap[activity.action] || IconMap.default,
    summary: `执行了操作：${activity.action}`,
  })
}

// ============ 渲染器映射 ============

const activityRenderers: Record<string, (activity: ActivityDto) => ActivityViewModel> = {
  [ActivityActions.KB_CREATED]: renderKbCreated,
  [ActivityActions.DOC_CREATED]: renderDocCreated,
  [ActivityActions.DOC_UPDATED]: renderDocUpdated,
  [ActivityActions.DOC_DELETED]: renderDocDeleted,
  [ActivityActions.DOC_MOVED]: renderDocMoved,
  [ActivityActions.COMMENT_CREATED]: renderCommentCreated,
  [ActivityActions.COMMENT_REPLIED]: renderCommentCreated,
  [ActivityActions.TRAVEL_CREATED]: renderTravelCreated,
  [ActivityActions.FOCUS_COMPLETED]: renderFocusCompleted,
}

// ============ 主映射函数 ============

export function mapActivity(activity: ActivityDto): ActivityViewModel | null {
  if (!activity) return null

  const renderer = activityRenderers[activity.action]
  if (renderer) {
    return renderer(activity)
  }

  return renderDefault(activity)
}

export function mapActivities(activities: ActivityDto[]): ActivityViewModel[] {
  if (!Array.isArray(activities)) return []
  return activities.map(mapActivity).filter((vm): vm is ActivityViewModel => vm !== null)
}

export function groupActivitiesByDate(viewModels: ActivityViewModel[]): ActivityGroup[] {
  if (!Array.isArray(viewModels) || viewModels.length === 0) {
    return []
  }

  const groups: Record<string, ActivityGroup> = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  viewModels.forEach((vm) => {
    if (!vm.timestamp) return

    const date = typeof vm.timestamp === 'string' ? parseISO(vm.timestamp) : vm.timestamp
    const dateKey = format(date, 'yyyy-MM-dd')

    if (!groups[dateKey]) {
      const dateOnly = new Date(date)
      dateOnly.setHours(0, 0, 0, 0)

      groups[dateKey] = {
        date: dateKey,
        title: getDateGroupTitle(date),
        isToday: dateOnly.getTime() === today.getTime(),
        isYesterday: dateOnly.getTime() === yesterday.getTime(),
        events: [],
      }
    }

    groups[dateKey].events.push(vm)
  })

  return Object.values(groups).sort((a, b) => {
    if (a.isToday) return -1
    if (b.isToday) return 1
    if (a.isYesterday) return -1
    if (b.isYesterday) return 1
    return b.date.localeCompare(a.date)
  })
}

// ============ 工具函数 ============

export function getModuleLabel(module: string): string {
  const labels: Record<string, string> = {
    knowledge: '知识库',
    travel: '旅程',
    system: '系统',
  }
  return labels[module] || '其他'
}

export function getModuleClass(module: string): string {
  return `tag-${module}`
}

export function canNavigate(vm: ActivityViewModel | null): boolean {
  return Boolean(vm?.link)
}

