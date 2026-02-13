<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'

const appStore = useAppStore()

const sidebarWidth = computed(() => (appStore.sidebarCollapsed ? '64px' : '260px'))
</script>

<template>
  <div class="layout-container">
    <aside class="layout-sidebar" :style="{ width: sidebarWidth }">
      <Sidebar />
    </aside>

    <div class="layout-main" :style="{ marginLeft: sidebarWidth }">
      <Header />

      <!-- Content -->
      <main class="layout-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout-container {
  min-height: 100vh;
  background: $bg-primary;
}

.layout-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  background: $bg-secondary;
  border-right: 1px solid $border-color;
  z-index: 1000;
  transition: width $transition-normal;
  overflow: hidden;
}

.layout-main {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin-left $transition-normal;
}

.layout-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  animation: fadeIn 0.3s ease-out;
}
</style>

