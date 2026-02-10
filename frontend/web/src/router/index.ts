/**
 * Vue Router 配置
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { setupGuards } from './guards'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginPage.vue'),
    meta: { title: '登录', guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterPage.vue'),
    meta: { title: '注册', guest: true },
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/home/HomePage.vue'),
    meta: { title: '首页' },
  },
  // 知识库路由
  {
    path: '/kb',
    name: 'kb-root',
    component: () => import('@/views/knowledge/KnowledgeOverviewPage.vue'),
    meta: { title: '知识库' },
  },
  {
    path: '/kb/:baseId/overview',
    name: 'kb-overview',
    component: () => import('@/views/knowledge/KnowledgeOverviewPage.vue'),
    props: true,
    meta: { title: '知识库' },
  },
  {
    path: '/kb/:baseId/edit/:docId?',
    name: 'kb-editor',
    component: () => import('@/views/knowledge/KnowledgeEditorPage.vue'),
    props: true,
    meta: { title: '编辑文档' },
  },
  // 兼容旧路由（无 /overview 后缀）
  {
    path: '/kb/:baseId',
    redirect: (to) => `/kb/${to.params.baseId}/overview`,
  },
  // 404 页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/NotFoundPage.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 设置路由守卫
setupGuards(router)

export default router

