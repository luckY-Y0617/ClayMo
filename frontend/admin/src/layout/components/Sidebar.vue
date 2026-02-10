<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

// Get menu routes
const menuRoutes = computed(() => {
  const routes = router.options.routes.filter(
    (r) => r.path !== '/login' && r.path !== '/:pathMatch(.*)*' && r.component
  )

  return routes.filter((r) => filterRoute(r))
})

// Filter routes by permission
const filterRoute = (routeItem: RouteRecordRaw): boolean => {
  if (!routeItem) return false
  if (routeItem.meta?.hidden) return false
  if (routeItem.meta?.permission && !userStore.hasPermission(routeItem.meta.permission)) return false
  return true
}

// Filter children routes
const filterChildren = (children: RouteRecordRaw[]): RouteRecordRaw[] => {
  return children.filter((child) => filterRoute(child))
}

// Active menu - 直接使用完整路径确保正确匹配
const activeMenu = computed(() => route.path)

// Handle menu select
const handleSelect = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="sidebar">
    <!-- Logo -->
    <div class="sidebar-logo" :class="{ collapsed: appStore.sidebarCollapsed }">
      <div class="logo-icon">
        <svg viewBox="0 0 100 100" class="logo-svg">
          <defs>
            <linearGradient id="sidebarLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color: #60a5fa" />
              <stop offset="100%" style="stop-color: #3b82f6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="none" stroke="url(#sidebarLogoGradient)" stroke-width="4" />
          <path
            d="M35 50 L45 60 L65 40"
            fill="none"
            stroke="url(#sidebarLogoGradient)"
            stroke-width="5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <transition name="fade">
        <span v-if="!appStore.sidebarCollapsed" class="logo-text">Cinder Admin</span>
      </transition>
    </div>

    <!-- Menu -->
    <el-scrollbar class="sidebar-menu">
      <el-menu
        :default-active="activeMenu"
        :collapse="appStore.sidebarCollapsed"
        :collapse-transition="false"
        background-color="transparent"
        text-color="#94a3b8"
        active-text-color="#3b82f6"
        @select="handleSelect"
      >
        <template v-for="menuItem in menuRoutes" :key="menuItem.path">
          <!-- Single menu item -->
          <el-menu-item
            v-if="!menuItem.children || menuItem.children.length === 0 || (menuItem.children.length === 1 && !menuItem.children[0].children)"
            :index="menuItem.children?.[0]?.path ? `${menuItem.path}/${menuItem.children[0].path}`.replace('//', '/') : menuItem.path"
          >
            <el-icon v-if="menuItem.children?.[0]?.meta?.icon || menuItem.meta?.icon">
              <component :is="menuItem.children?.[0]?.meta?.icon || menuItem.meta?.icon" />
            </el-icon>
            <template #title>{{ menuItem.children?.[0]?.meta?.title || menuItem.meta?.title }}</template>
          </el-menu-item>

          <!-- Sub menu -->
          <el-sub-menu v-else :index="menuItem.path">
            <template #title>
              <el-icon v-if="menuItem.meta?.icon">
                <component :is="menuItem.meta.icon" />
              </el-icon>
              <span>{{ menuItem.meta?.title }}</span>
            </template>

            <el-menu-item
              v-for="child in filterChildren(menuItem.children || [])"
              :key="child.path"
              :index="`${menuItem.path}/${child.path}`.replace('//', '/')"
            >
              <el-icon v-if="child.meta?.icon">
                <component :is="child.meta.icon" />
              </el-icon>
              <template #title>{{ child.meta?.title }}</template>
            </el-menu-item>
          </el-sub-menu>
        </template>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<style lang="scss" scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid $border-color;
  transition: all $transition-normal;

  &.collapsed {
    padding: 0 16px;
    justify-content: center;
  }
}

.logo-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.logo-svg {
  width: 100%;
  height: 100%;
}

.logo-text {
  margin-left: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  padding: 12px 0;

  :deep(.el-menu) {
    border-right: none;
  }

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    height: 48px;
    line-height: 48px;
    margin: 4px 8px;
    border-radius: 8px;
    transition: all $transition-fast;

    &:hover {
      background: $bg-hover !important;
    }
  }

  :deep(.el-menu-item.is-active) {
    background: rgba(59, 130, 246, 0.15) !important;
    color: $primary-color !important;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      background: $primary-color;
      border-radius: 0 3px 3px 0;
    }
  }

  :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: $primary-color !important;
  }

  :deep(.el-menu--collapse) {
    .el-menu-item,
    .el-sub-menu__title {
      padding: 0 !important;
      justify-content: center;

      .el-icon {
        margin-right: 0;
      }
    }
  }

  :deep(.el-sub-menu__icon-arrow) {
    color: $text-muted;
  }
}
</style>

