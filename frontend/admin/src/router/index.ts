import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import NProgress from 'nprogress'
import { useUserStore } from '@/stores/user'

// Layout
const Layout = () => import('@/layout/index.vue')

// Routes
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '仪表盘', icon: 'Odometer' },
      },
    ],
  },
  {
    path: '/system',
    component: Layout,
    meta: { title: '系统管理', icon: 'Setting' },
    children: [
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/system/users/index.vue'),
        meta: { title: '用户管理', icon: 'User', permission: 'system.users.view' },
      },
      {
        path: 'roles',
        name: 'Roles',
        component: () => import('@/views/system/roles/index.vue'),
        meta: { title: '角色管理', icon: 'UserFilled', permission: 'system.roles.view' },
      },
      {
        path: 'teams',
        name: 'Teams',
        component: () => import('@/views/system/teams/index.vue'),
        meta: { title: '团队管理', icon: 'Coordinate', permission: 'system.teams.view' },
      },
      {
        path: 'permissions',
        name: 'Permissions',
        component: () => import('@/views/system/permissions/index.vue'),
        meta: { title: '权限目录', icon: 'Lock', permission: 'system.permission-center.view' },
      },
    ],
  },
  {
    path: '/tenants',
    component: Layout,
    meta: { title: '租户管理', icon: 'OfficeBuilding', permission: 'system.tenants.view' },
    children: [
      {
        path: 'list',
        name: 'TenantList',
        component: () => import('@/views/tenants/list/index.vue'),
        meta: { title: '租户列表', icon: 'List' },
      },
      {
        path: 'create',
        name: 'TenantCreate',
        component: () => import('@/views/tenants/create/index.vue'),
        meta: { title: '创建租户', icon: 'Plus', permission: 'system.tenants.manage' },
      },
      {
        path: ':id',
        name: 'TenantDetail',
        component: () => import('@/views/tenants/detail/index.vue'),
        meta: { title: '租户详情', hidden: true },
      },
    ],
  },
  {
    path: '/audit',
    component: Layout,
    meta: { title: '审计与日志', icon: 'Tickets', permission: 'system.auditlogs.view' },
    children: [
      {
        path: 'logs',
        name: 'AuditLogs',
        component: () => import('@/views/audit/logs/index.vue'),
        meta: { title: '请求审计', icon: 'Connection' },
      },
      {
        path: 'entity-changes',
        name: 'EntityChanges',
        component: () => import('@/views/audit/entity-changes/index.vue'),
        meta: { title: '实体变更', icon: 'DataAnalysis' },
      },
    ],
  },
  {
    path: '/scheduler',
    component: Layout,
    meta: { title: '任务调度', icon: 'Timer', permission: 'system.hangfire.dashboard' },
    children: [
      {
        path: 'dashboard',
        name: 'SchedulerDashboard',
        component: () => import('@/views/scheduler/index.vue'),
        meta: { title: '调度中心', icon: 'Operation' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', public: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guards
router.beforeEach(async (to, _from, next) => {
  NProgress.start()
  document.title = `${to.meta.title || 'ClayMo'} - 后台管理`

  const userStore = useUserStore()

  // Public routes don't need auth
  if (to.meta.public) {
    next()
    return
  }

  // Check if logged in
  if (!userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  // Check permission
  const permission = to.meta.permission as string | undefined
  if (permission && !userStore.hasPermission(permission)) {
    next({ path: '/dashboard' })
    return
  }

  next()
})

router.afterEach(() => {
  NProgress.done()
})

export default router

// Extend vue-router types
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    permission?: string
    hostOnly?: boolean
    public?: boolean
    hidden?: boolean
  }
}
