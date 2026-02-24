<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Check, Grid, User, Setting, ArrowRight, CircleCheck, Loading } from '@element-plus/icons-vue'

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return String(num)
}

const props = defineProps<{
  viewMode: 'docs' | 'manage'
  manageTab: 'overview' | 'members' | 'settings'
  currentBaseId: string | null
  bases: Array<{
    id: string
    name: string
    icon?: string
    description?: string
    stats?: { docs: number }
  }>
  canManageMembers: boolean
  canEditKb: boolean
  canCreateKb: boolean
  pageLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:viewMode', value: 'docs' | 'manage'): void
  (e: 'update:manageTab', value: 'overview' | 'members' | 'settings'): void
  (e: 'create-base'): void
  (e: 'select-base', baseId: string): void
}>()

// 安全获取图标 - 返回有效的 emoji
const getIconEmoji = (icon?: string): string => {
  if (!icon || icon === 'con_default' || icon === 'default' || icon === 'icon_default') return '📁'
  // 检查是否是有效的 emoji
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})$/u
  if (emojiRegex.test(icon)) return icon
  // 如果不是 emoji，返回默认图标
  return '📁'
}

const currentBaseName = computed(() => {
  return props.bases.find(b => b.id === props.currentBaseId)?.name || ''
})

const switchMode = (mode: 'docs' | 'manage') => {
  emit('update:viewMode', mode)
  if (mode === 'manage') {
    emit('update:manageTab', 'overview')
  }
}

const handleSelectBase = (baseId: string) => {
  // 如果当前在管理模式，切换回文档模式
  if (props.viewMode === 'manage') {
    emit('update:viewMode', 'docs')
  }
  // 发出切换知识库事件
  emit('select-base', baseId)
}
</script>

<template>
  <aside class="ks-sidebar">
    <!-- 文档模式：知识库列表 -->
    <div v-if="viewMode === 'docs'" class="ks-sidebar__list">
      <div class="ks-sidebar__header">
        <span class="ks-sidebar__title">知识库</span>
        <button 
          v-if="canCreateKb" 
          class="ks-sidebar__add-btn" 
          @click="emit('create-base')" 
          title="创建知识库"
        >
          <el-icon :size="14"><Plus /></el-icon>
        </button>
      </div>

      <div class="ks-sidebar__items">
        <!-- 加载状态 -->
        <div v-if="props.pageLoading" class="ks-sidebar__loading">
          <div class="ks-sidebar__skeleton" v-for="i in 3" :key="i">
            <div class="ks-sidebar__skeleton-icon"></div>
            <div class="ks-sidebar__skeleton-text">
              <div class="ks-sidebar__skeleton-title"></div>
              <div class="ks-sidebar__skeleton-desc"></div>
            </div>
          </div>
        </div>

        <!-- 知识库列表 -->
        <template v-else>
          <div
            v-for="base in bases"
            :key="base.id"
            class="ks-sidebar__item"
            :class="{ 'is-active': base.id === currentBaseId }"
            @click="handleSelectBase(base.id)"
          >
            <!-- 图标区域 -->
            <div class="ks-sidebar__item-icon">
              {{ getIconEmoji(base.icon) }}
            </div>
            
            <!-- 文字区域 -->
            <div class="ks-sidebar__item-content">
              <div class="ks-sidebar__item-name">{{ base.name }}</div>
              <div class="ks-sidebar__item-meta">{{ formatNumber(base.stats?.docs ?? 0) }} 篇文档</div>
            </div>
            
            <!-- 选中标识 -->
            <div v-if="base.id === currentBaseId" class="ks-sidebar__item-check">
              <el-icon :size="14"><Check /></el-icon>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="!bases.length" class="ks-sidebar__empty">
            <span class="ks-sidebar__empty-icon">📚</span>
            <span class="ks-sidebar__empty-text">暂无知识库</span>
            <button
              v-if="canCreateKb"
              class="ks-sidebar__empty-btn"
              @click="emit('create-base')"
            >
              + 创建知识库
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- 管理模式：管理导航 -->
    <div v-else class="ks-sidebar__manage">
      <div class="ks-sidebar__kb-name">{{ currentBaseName }}</div>
      
      <nav class="ks-sidebar__nav">
        <button
          class="ks-sidebar__nav-item"
          :class="{ 'is-active': manageTab === 'overview' }"
          @click="emit('update:manageTab', 'overview')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <span>概览</span>
        </button>
        
        <button
          v-if="canManageMembers"
          class="ks-sidebar__nav-item"
          :class="{ 'is-active': manageTab === 'members' }"
          @click="emit('update:manageTab', 'members')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>成员管理</span>
        </button>
        
        <button
          v-if="canEditKb"
          class="ks-sidebar__nav-item"
          :class="{ 'is-active': manageTab === 'settings' }"
          @click="emit('update:manageTab', 'settings')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>设置</span>
        </button>
      </nav>

      <div class="ks-sidebar__divider"></div>

      <button class="ks-sidebar__back-btn" @click="switchMode('docs')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>返回文档</span>
      </button>
    </div>
  </aside>
</template>

<style>
/* 全局样式，防止被覆盖 */
.ks-sidebar {
  width: 260px;
  min-width: 260px;
  height: 100%;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 列表模式 */
.ks-sidebar__list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ks-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
}

.ks-sidebar__title {
  font-size: 11px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ks-sidebar__add-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #6c757d;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ks-sidebar__add-btn:hover {
  background: #e9ecef;
  color: #343a40;
}

.ks-sidebar__items {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 16px;
}

/* 加载骨架屏 */
.ks-sidebar__loading {
  padding: 0 4px;
}

.ks-sidebar__skeleton {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 4px;
}

.ks-sidebar__skeleton-icon {
  width: 36px;
  height: 36px;
  background: #e9ecef;
  border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

.ks-sidebar__skeleton-text {
  flex: 1;
}

.ks-sidebar__skeleton-title {
  height: 14px;
  width: 60%;
  background: #e9ecef;
  border-radius: 4px;
  margin-bottom: 6px;
  animation: pulse 1.5s ease-in-out infinite;
}

.ks-sidebar__skeleton-desc {
  height: 10px;
  width: 40%;
  background: #e9ecef;
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 列表项 */
.ks-sidebar__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.ks-sidebar__item:hover {
  background: #e9ecef;
}

.ks-sidebar__item.is-active {
  background: #e7f5ff;
}

.ks-sidebar__item.is-active .ks-sidebar__item-name {
  color: #0d6efd;
  font-weight: 500;
}

/* 图标 */
.ks-sidebar__item-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f3f5;
  border-radius: 8px;
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1;
}

.ks-sidebar__item.is-active .ks-sidebar__item-icon {
  background: #d0ebff;
}

/* 文字内容 */
.ks-sidebar__item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ks-sidebar__item-name {
  font-size: 14px;
  color: #212529;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ks-sidebar__item-meta {
  font-size: 12px;
  color: #868e96;
}

/* 选中标识 */
.ks-sidebar__item-check {
  color: #0d6efd;
  flex-shrink: 0;
}

/* 空状态 */
.ks-sidebar__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  text-align: center;
}

.ks-sidebar__empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.ks-sidebar__empty-text {
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 16px;
}

.ks-sidebar__empty-btn {
  padding: 8px 16px;
  background: #0d6efd;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.ks-sidebar__empty-btn:hover {
  background: #0b5ed7;
}

/* 管理模式 */
.ks-sidebar__manage {
  padding: 16px;
}

.ks-sidebar__kb-name {
  font-size: 14px;
  font-weight: 600;
  color: #212529;
  padding: 0 8px;
  margin-bottom: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ks-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ks-sidebar__nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: #495057;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
}

.ks-sidebar__nav-item:hover {
  background: #e9ecef;
}

.ks-sidebar__nav-item.is-active {
  background: #e7f5ff;
  color: #0d6efd;
  font-weight: 500;
}

.ks-sidebar__divider {
  height: 1px;
  background: #dee2e6;
  margin: 16px 0;
}

.ks-sidebar__back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: #6c757d;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ks-sidebar__back-btn:hover {
  background: #e9ecef;
  color: #495057;
}
</style>
