<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getRecentActivities, type RecentActivityDto } from '@/api/audit'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import {
  User,
  UserFilled,
  Coordinate,
  OfficeBuilding,
  Lock,
  Tickets,
  Timer,
  DataAnalysis,
  Grid,
  Clock,
  WarningFilled,
  Document,
  InfoFilled,
} from '@element-plus/icons-vue'

// 配置 dayjs
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const router = useRouter()
const userStore = useUserStore()

// 图标映射
const iconComponents: Record<string, any> = {
  User,
  UserFilled,
  Coordinate,
  OfficeBuilding,
  Lock,
  Tickets,
  Timer,
  DataAnalysis,
}

// 快捷操作
const quickActions = [
  { title: '用户管理', icon: 'User', color: '#3b82f6', route: '/system/users' },
  { title: '角色管理', icon: 'UserFilled', color: '#10b981', route: '/system/roles' },
  { title: '团队管理', icon: 'Coordinate', color: '#f59e0b', route: '/system/teams' },
  { title: '租户管理', icon: 'OfficeBuilding', color: '#8b5cf6', route: '/tenants/list' },
  { title: '权限目录', icon: 'Lock', color: '#ec4899', route: '/system/permissions' },
  { title: '审计日志', icon: 'Tickets', color: '#6366f1', route: '/audit/logs' },
  { title: '调度中心', icon: 'Timer', color: '#14b8a6', route: '/scheduler/dashboard' },
  { title: '实体变更', icon: 'DataAnalysis', color: '#f97316', route: '/audit/entity-changes' },
]

// 最近活动
const recentActivities = ref<RecentActivityDto[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// 格式化时间（相对时间）
const formatTime = (timeStr: string | null) => {
  if (!timeStr) return ''
  try {
    return dayjs(timeStr).fromNow()
  } catch {
    return timeStr
  }
}

// HTTP 方法颜色
const getMethodColor = (method: string | null) => {
  const colors: Record<string, string> = {
    GET: '#10b981',
    POST: '#3b82f6',
    PUT: '#f59e0b',
    DELETE: '#ef4444',
    PATCH: '#8b5cf6',
  }
  return colors[method || 'GET'] || '#6b7280'
}

// 加载最近活动
const loadRecentActivities = async () => {
  loading.value = true
  error.value = null
  try {
    recentActivities.value = await getRecentActivities(8)
  } catch (e: any) {
    error.value = e?.message || '加载失败'
    console.error('加载最近活动失败:', e)
  } finally {
    loading.value = false
  }
}

// 跳转到审计日志
const goToAuditLogs = () => {
  router.push('/audit/logs')
}

onMounted(() => {
  loadRecentActivities()
})
</script>

<template>
  <div class="dashboard">
    <!-- Welcome Section -->
    <div class="welcome-section">
      <div class="welcome-content">
        <h1 class="welcome-title">
          欢迎回来，<span class="highlight">{{ userStore.currentUser?.userName || '管理员' }}</span>
        </h1>
        <p class="welcome-subtitle">这是您的管理控制台</p>
      </div>
      <div class="welcome-time">
        {{ new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
      </div>
    </div>

    <!-- Quick Actions Grid -->
    <div class="section-title">
      <el-icon><Grid /></el-icon>
      <span>快捷操作</span>
    </div>
    <div class="quick-actions-grid">
      <router-link
        v-for="action in quickActions"
        :key="action.route"
        :to="action.route"
        class="action-card"
        :style="{ '--accent-color': action.color }"
      >
        <div class="action-icon">
          <el-icon :size="24"><component :is="iconComponents[action.icon]" /></el-icon>
        </div>
        <span class="action-title">{{ action.title }}</span>
      </router-link>
    </div>

    <!-- Recent Activity -->
    <div class="section-title">
      <el-icon><Clock /></el-icon>
      <span>最近操作</span>
      <el-button text type="primary" size="small" class="view-all-btn" @click="goToAuditLogs">
        查看全部
      </el-button>
    </div>
    <el-card class="activity-card">
      <!-- 加载状态 -->
      <el-skeleton v-if="loading" :rows="5" animated />

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <el-icon :size="32" color="#ef4444"><WarningFilled /></el-icon>
        <p>{{ error }}</p>
        <el-button type="primary" size="small" @click="loadRecentActivities">重试</el-button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="recentActivities.length === 0" class="empty-state">
        <el-icon :size="32" color="#9ca3af"><Document /></el-icon>
        <p>暂无操作记录</p>
      </div>

      <!-- 活动列表 -->
      <div v-else class="activity-list">
        <div
          v-for="(activity, index) in recentActivities"
          :key="index"
          class="activity-item"
          :class="{ 'has-exception': activity.hasException }"
        >
          <div class="activity-method" :style="{ background: getMethodColor(activity.httpMethod) }">
            {{ activity.httpMethod }}
          </div>
          <div class="activity-content">
            <div class="activity-main">
              <span class="activity-user">{{ activity.userName }}</span>
              <span class="activity-desc">{{ activity.description }}</span>
            </div>
            <div class="activity-meta">
              <span class="activity-time">{{ formatTime(activity.executionTime) }}</span>
              <span v-if="activity.executionDuration" class="activity-duration">
                {{ activity.executionDuration }}ms
              </span>
              <el-tag
                v-if="activity.hasException"
                type="danger"
                size="small"
                effect="dark"
              >
                异常
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- System Quick Info -->
    <div class="section-title">
      <el-icon><InfoFilled /></el-icon>
      <span>系统信息</span>
    </div>
    <div class="system-info-grid">
      <div class="info-card">
        <span class="info-label">当前用户</span>
        <span class="info-value">{{ userStore.currentUser?.userName }}</span>
      </div>
      <div class="info-card">
        <span class="info-label">用户邮箱</span>
        <span class="info-value">{{ userStore.currentUser?.email || '未设置' }}</span>
      </div>
      <div class="info-card">
        <span class="info-label">管理模式</span>
        <span class="info-value">
          <el-tag :type="userStore.tenantId ? 'primary' : 'warning'" size="small" effect="dark">
            {{ userStore.tenantId ? '🏢 租户' : '🏠 Host' }}
          </el-tag>
        </span>
      </div>
      <div class="info-card">
        <span class="info-label">系统版本</span>
        <span class="info-value">v1.0.0</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  animation: slideInLeft 0.5s ease-out;
}

.welcome-title {
  font-size: 28px;
  font-weight: 600;
  color: $text-primary;
  margin: 0 0 8px;

  .highlight {
    background: linear-gradient(135deg, $primary-color 0%, $primary-light 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.welcome-subtitle {
  color: $text-secondary;
  margin: 0;
}

.welcome-time {
  color: $text-muted;
  font-size: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 24px 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;

  .el-icon {
    color: $primary-color;
  }

  .view-all-btn {
    margin-left: auto;
  }
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 8px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: $radius-lg;
  text-decoration: none;
  transition: all $transition-normal;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--accent-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);

    .action-icon {
      background: var(--accent-color);
      color: #fff;
    }
  }
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: $radius-md;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-color);
  transition: all $transition-fast;
}

.action-title {
  font-size: 14px;
  color: $text-secondary;
  font-weight: 500;
}

.activity-card {
  animation: fadeIn 0.5s ease-out 0.2s backwards;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: $radius-md;
  transition: all $transition-fast;

  &:hover {
    background: var(--el-fill-color);
  }

  &.has-exception {
    border-left: 3px solid #ef4444;
  }
}

.activity-method {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.activity-user {
  color: $primary-color;
  font-weight: 500;
  font-size: 14px;
}

.activity-desc {
  color: $text-secondary;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: $text-muted;
}

.activity-duration {
  font-family: 'JetBrains Mono', monospace;
}

.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: $text-muted;
}

.system-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.info-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: $radius-md;
}

.info-label {
  font-size: 12px;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: $text-primary;
  font-weight: 500;
}
</style>
