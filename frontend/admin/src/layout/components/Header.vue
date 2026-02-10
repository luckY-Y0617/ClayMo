<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { SwitchButton, ArrowDown, User } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const appStore = useAppStore()
const userStore = useUserStore()

// Breadcrumb
const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta?.title)
  return matched.map((item) => ({
    title: item.meta?.title || '',
    path: item.path,
  }))
})

// Handle logout
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await userStore.logout()
  } catch {
    // User cancelled
  }
}
</script>

<template>
  <header class="layout-header">
    <div class="header-left">
      <!-- Toggle Sidebar -->
      <el-button
        class="toggle-btn"
        :icon="appStore.sidebarCollapsed ? 'Expand' : 'Fold'"
        text
        @click="appStore.toggleSidebar"
      />

      <!-- Breadcrumb -->
      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
          {{ item.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="header-right">
      <!-- User Dropdown -->
      <el-dropdown trigger="click" @command="handleLogout">
        <div class="user-info">
          <el-avatar :size="32" class="user-avatar">
            {{ userStore.currentUser?.userName?.charAt(0)?.toUpperCase() || 'U' }}
          </el-avatar>
          <span class="user-name">{{ userStore.currentUser?.userName || '用户' }}</span>
          <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>
              <el-icon><User /></el-icon>
              <span>{{ userStore.currentUser?.email || '未设置邮箱' }}</span>
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.layout-header {
  height: $header-height;
  background: $bg-secondary;
  border-bottom: 1px solid $border-color;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-btn {
  font-size: 18px;
  color: $text-secondary;

  &:hover {
    color: $text-primary;
  }
}

.breadcrumb {
  :deep(.el-breadcrumb__item) {
    .el-breadcrumb__inner {
      color: $text-secondary;
      font-weight: 400;

      &:hover {
        color: $text-primary;
      }
    }

    &:last-child {
      .el-breadcrumb__inner {
        color: $text-primary;
        font-weight: 500;
      }
    }
  }

  :deep(.el-breadcrumb__separator) {
    color: $text-muted;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all $transition-fast;

  &:hover {
    background: $bg-hover;
  }
}

.user-avatar {
  background: linear-gradient(135deg, $primary-color 0%, $primary-dark 100%);
  color: #fff;
  font-weight: 600;
}

.user-name {
  color: $text-primary;
  font-size: 14px;
}

.dropdown-icon {
  color: $text-muted;
  font-size: 12px;
}
</style>

