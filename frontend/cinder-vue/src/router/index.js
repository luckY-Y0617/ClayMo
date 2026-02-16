import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import KnowledgeOverviewPage from '@/views/KnowledgeOverviewPage.vue'
import KnowledgeEditorPage from '@/views/KnowledgeEditorPage.vue'
import KnowledgeSettingsPage from '@/views/KnowledgeSettingsPage.vue'
import KbWorkspaceLayout from '@/layouts/KbWorkspaceLayout.vue'
import TravelOverviewPage from '@/views/TravelOverviewPage.vue'
import ToolsPage from '@/views/ToolsPage.vue'
import ImageCropperPage from '@/views/tools/ImageCropperPage.vue'
import ImageMontagePage from '@/views/tools/ImageMontagePage.vue'
import ImageResizerPage from '@/views/tools/ImageResizerPage.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import UserPage from '@/views/system/UserPage.vue'
import RolePage from '@/views/system/RolePage.vue'
import AuditLogPage from '@/views/system/AuditLogPage.vue'
import { SYSTEM_PERMISSIONS } from '@/permission/permission.constants'
import { setupPermissionGuard } from './guards'

const routes = [
  {
    path: '/',
    name: 'Timeline',
    component: Home, // 时间线首页
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    // 登录页面不需要权限
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    // 注册页面不需要权限
  },
  {
    path: '/travel',
    name: 'TravelOverview',
    component: TravelOverviewPage,
    // 示例：如果需要权限，可以这样配置
    // meta: {
    //   requiredPermissions: ['travel.view'],
    //   requireAll: false,
    // },
  },
  // 工具台路由
  {
    path: '/tools',
    name: 'Tools',
    component: ToolsPage,
  },
  {
    path: '/tools/image-cropper',
    name: 'ImageCropper',
    component: ImageCropperPage,
  },
  {
    path: '/tools/image-montage',
    name: 'ImageMontage',
    component: ImageMontagePage,
  },
  {
    path: '/tools/image-resizer',
    name: 'ImageResizer',
    component: ImageResizerPage,
  },
  {
    path: '/home',
    redirect: '/', // 重定向到时间线首页
  },
  {
    path: '/overview',
    redirect: '/',
  },
  // Overview 页面独立，不使用 KbWorkspaceLayout
  {
    path: '/kb/:baseId/overview',
    name: 'kb-overview',
    component: KnowledgeOverviewPage,
    meta: { keepAlive: true }
  },
  // 管理页面继续使用 KbWorkspaceLayout
  {
    path: '/kb',
    component: KbWorkspaceLayout,
    children: [
      {
        path: ':baseId/manage',
        name: 'kb-manage',
        component: KnowledgeSettingsPage,
        props: true,
        meta: { keepAlive: true },
      },
    ],
  },
  {
    path: '/kb/:baseId/edit/:docId?',
    name: 'kb-editor',
    component: KnowledgeEditorPage,
    props: true,
    // 示例：知识库编辑需要编辑权限
    // meta: {
    //   requiredPermissions: ['kb.doc.edit'],
    //   requireAll: false,
    // },
  },
  // 系统管理路由
  {
    path: '/system/users',
    name: 'SystemUsers',
    component: UserPage,
    meta: {
      permission: SYSTEM_PERMISSIONS.USERS_VIEW,
      title: '用户管理',
    },
  },
  {
    path: '/system/roles',
    name: 'SystemRoles',
    component: RolePage,
    meta: {
      permission: SYSTEM_PERMISSIONS.ROLES_VIEW,
      title: '角色管理',
    },
  },
  {
    path: '/system/audit-logs',
    name: 'SystemAuditLogs',
    component: AuditLogPage,
    meta: {
      permission: SYSTEM_PERMISSIONS.AUDITLOGS_VIEW,
      title: '审计日志',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 设置权限守卫
setupPermissionGuard(router)

export default router

