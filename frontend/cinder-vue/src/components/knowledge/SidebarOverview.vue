<template>
  <aside class="kb-sidebar">
    <div class="sidebar-header">
      <div class="header-top">
        <router-link to="/" class="back-home-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </router-link>
        <h2 class="sidebar-title">知识空间</h2>
        <button 
          v-if="hasCreatePermission"
          class="create-base-btn" 
          @click="$emit('create-base')"
        >
          新建
        </button>
      </div>
      
      <!-- 团队切换器 -->
      <div class="team-switcher" v-if="teamStore.loaded">
        <div 
          class="team-switcher-trigger"
          :class="{ open: teamDropdownOpen }"
          @click.stop="toggleTeamDropdown"
        >
          <span class="team-label">
            <span class="team-icon">{{ currentContextIcon }}</span>
            <span class="team-name">{{ currentContextName }}</span>
          </span>
          <svg 
            class="dropdown-arrow" 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            fill="none"
            :style="{ transform: teamDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }"
          >
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        
        <Transition name="dropdown-fade">
          <div v-if="teamDropdownOpen" class="team-dropdown" ref="teamDropdownRef">
            <button
              class="team-option"
              :class="{ active: !teamStore.isTeamMode }"
              @click.stop.prevent="selectPersonal"
            >
              <span class="option-icon">👤</span>
              <span class="option-label">个人</span>
              <span v-if="!teamStore.isTeamMode" class="option-check">✓</span>
            </button>
            <div class="team-divider" v-if="teamStore.teams.length > 0"></div>
            <button
              v-for="team in teamStore.teams"
              :key="team.id || team.teamId || Math.random()"
              class="team-option"
              :class="{ active: teamStore.currentTeamId === (team.id || team.teamId) }"
              @click.stop.prevent="(e) => selectTeam(team.id || team.teamId, e)"
            >
              <span class="option-icon">👥</span>
              <span class="option-label">{{ team.name || team.displayName || '未命名团队' }}</span>
              <span v-if="teamStore.currentTeamId === (team.id || team.teamId)" class="option-check">✓</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>



    <div class="base-list">
      <button
        v-for="base in filteredBases"
        :key="base.id"
        class="base-item"
        :class="{ active: base.id === selectedId }"
        @click="$emit('select', base.id)"
      >
        <div class="base-icon">
          <img
            v-if="getIconSrc(base.icon)"
            :src="getIconSrc(base.icon)"
            :alt="base.icon"
            @error="handleIconError($event, base.icon)"
            class="icon-img"
          />
          <span class="icon-emoji" :style="{ display: getIconSrc(base.icon) ? 'none' : 'inline-block' }">{{ getIconEmoji(base.icon) }}</span>
        </div>
        <div class="base-info">
          <div class="base-name">{{ base.name }}</div>
          <div class="base-meta">
            {{ formatNumber(base.stats?.docs ?? 0) }} 文档
          </div>
        </div>
      </button>

      <div v-if="!filteredBases.length" class="empty-state">
        <p class="empty-text">暂无匹配知识库</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { usePermission } from '@/composables/usePermission'
import { KB_PERMISSIONS } from '@/permission/permission.constants'
import { useTeamStore } from '@/stores/team'
import { KB_ICON_OPTIONS, DEFAULT_ICON_KEY } from '@/constants/kbIcons'
import useKbIcons from '@/composables/useKbIcons'

const { has } = usePermission()
const teamStore = useTeamStore()

// 团队切换器
const teamDropdownOpen = ref(false)
const teamDropdownRef = ref(null)

// 当前上下文显示
const currentContextName = computed(() => {
  if (!teamStore.isTeamMode) {
    return '个人'
  }
  const currentTeam = teamStore.currentTeam
  if (!currentTeam) {
    // 如果找不到团队，尝试直接从 teams 中查找
    const foundTeam = teamStore.teams.find((team) => (team.id || team.teamId) === teamStore.currentTeamId)
    if (foundTeam) {
      return foundTeam.name || foundTeam.displayName || '团队'
    }
    return '团队'
  }
  return currentTeam.name || currentTeam.displayName || '团队'
})

const currentContextIcon = computed(() => {
  return teamStore.isTeamMode ? '👥' : '👤'
})

// 切换下拉菜单
const toggleTeamDropdown = () => {
  teamDropdownOpen.value = !teamDropdownOpen.value
}

// 选择个人模式
const selectPersonal = (event) => {
  // 阻止事件冒泡和默认行为
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }
  handleTeamSelect(null)
}

// 选择团队模式
const selectTeam = (teamId, event) => {
  // 阻止事件冒泡和默认行为
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }
  
  // 如果 teamId 是 undefined，直接返回
  if (teamId === undefined) {
    return
  }
  
  handleTeamSelect(teamId)
}

// 选择团队（统一处理个人模式和团队模式）
const handleTeamSelect = (teamId) => {
  // 关闭下拉菜单
  teamDropdownOpen.value = false
  
  // 规范化 teamId：null、undefined、空字符串都视为个人模式（null）
  const normalizedTeamId = (teamId === null || teamId === undefined || teamId === '') ? null : teamId
  
  // 获取当前 teamId
  const currentTeamId = teamStore.currentTeamId
  
  // 如果值相同，不需要切换
  if (normalizedTeamId === currentTeamId) {
    return
  }
  
  // 执行切换
  teamStore.setCurrentTeam(normalizedTeamId)
  // 切换团队后，会触发 KnowledgeOverviewPage 中的 watch，自动重新加载知识库列表
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  // 检查点击是否在团队切换器区域内
  const teamSwitcher = event.target.closest('.team-switcher')
  // 如果点击在下拉菜单的选项上，不关闭（由选项的点击事件处理）
  const teamOption = event.target.closest('.team-option')
  if (!teamSwitcher && teamDropdownOpen.value && !teamOption) {
    teamDropdownOpen.value = false
  }
}

// 监听点击外部
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 使用可复用的图标逻辑，保持 Sidebar 与 Modal 行为一致
const { getIconSrc, getIconEmoji, handleImageError: handleIconError, iconErrorMap } = useKbIcons()

const props = defineProps({
  bases: {
    type: Array,
    default: () => [],
  },
  selectedId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select', 'create-base'])

const filteredBases = computed(() => props.bases)

const formatNumber = (value) => {
  const num = Number(value) || 0
  return num.toLocaleString()
}

// 权限检查：是否有创建知识库的权限（叠加团队上下文）
const hasCreatePermission = computed(() => {
  if (!has(KB_PERMISSIONS.BASE_CREATE)) return false
  if (!teamStore.loaded) return false
  if (!teamStore.currentTeamId) return true // 个人模式

  const currentTeam = teamStore.teams.find((t) => t.id === teamStore.currentTeamId)
  if (!currentTeam) return false
  const role = currentTeam.role
  if (role === 'Owner' || role === 'Admin') return true
  if (role === 'Member' && currentTeam.allowMemberCreateKb) return true
  return false
})
</script>

<style scoped>
/* 侧边栏容器 */
.kb-sidebar {
  width: 280px;
  flex-shrink: 0;
  background: #FAFBFC;
  border-right: 1px solid #E8E8E8;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
}

/* 侧边栏头部 */
.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid #E8E8E8;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-home-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: #666;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-sizing: border-box;
}

.back-home-btn:hover {
  color: #1a1a1a;
  border-color: #1a1a1a;
  background: #F5F6F7;
  transform: translateX(-2px);
}

.back-home-btn svg {
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
  letter-spacing: -0.01em;
}

.create-base-btn {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #FFFFFF;
  background: #1a1a1a;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.create-base-btn:hover {
  background: #000000;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 团队切换器 */
.team-switcher {
  position: relative;
}

.team-switcher-trigger {
  width: 100%;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.team-switcher-trigger:hover {
  border-color: #CCCCCC;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.team-switcher-trigger.open {
  border-color: #1a1a1a;
  box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.05);
}

.team-label {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.team-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.team-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  flex-shrink: 0;
  color: #999;
  transition: transform 0.2s ease;
}

.team-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
  padding: 6px;
}

.team-option {
  width: 100%;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  box-sizing: border-box;
}

.team-option:hover {
  background: #F5F6F7;
}

.team-option.active {
  background: #F0F0F0;
}

.option-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.option-label {
  flex: 1;
  font-size: 14px;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-check {
  font-size: 14px;
  color: #1a1a1a;
  flex-shrink: 0;
  font-weight: 600;
}

.team-divider {
  height: 1px;
  background: #E8E8E8;
  margin: 6px 0;
}

/* 下拉动画 */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 知识库列表 */
.base-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.base-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.base-item:hover {
  border-color: #CCCCCC;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.base-item.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.base-item.active .base-name {
  color: #FFFFFF;
}

.base-item.active .base-meta {
  color: rgba(255, 255, 255, 0.7);
}

.base-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #F5F6F7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.base-item:hover .base-icon {
  transform: scale(1.05);
}

.base-icon .icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.base-icon .icon-emoji {
  display: inline-block;
  font-size: 20px;
  line-height: 1;
}

.base-item.active .base-icon {
  background: rgba(255, 255, 255, 0.15);
}

.base-info {
  flex: 1;
  min-width: 0;
}

.base-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.base-meta {
  font-size: 12px;
  color: #999;
  line-height: 1.3;
}

/* 空状态 */
.empty-state {
  padding: 48px 20px;
  text-align: center;
}

.empty-text {
  font-size: 14px;
  color: #999;
  margin: 0;
  line-height: 1.6;
}

/* 滚动条样式 */
.base-list::-webkit-scrollbar {
  width: 6px;
}

.base-list::-webkit-scrollbar-track {
  background: transparent;
}

.base-list::-webkit-scrollbar-thumb {
  background: #CCCCCC;
  border-radius: 3px;
}

.base-list::-webkit-scrollbar-thumb:hover {
  background: #999999;
}
</style>


