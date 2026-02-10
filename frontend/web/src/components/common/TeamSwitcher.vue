<template>
  <div class="team-switcher" ref="switcherRef">
    <button class="switcher-trigger" :class="{ 'is-open': isOpen }" @click="toggleDropdown">
      <div class="trigger-icon">
        <svg v-if="!isTeamMode" width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" stroke-width="2" />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" />
          <path
            d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            stroke="currentColor"
            stroke-width="2"
          />
        </svg>
      </div>
      <span class="trigger-text">{{ currentLabel }}</span>
      <svg
        class="trigger-arrow"
        :class="{ 'is-rotated': isOpen }"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="switcher-dropdown">
        <div class="dropdown-header">
          <span class="header-label">切换空间</span>
        </div>

        <!-- 个人空间 -->
        <button
          class="dropdown-item"
          :class="{ 'is-active': !isTeamMode }"
          @click="handleSelectPersonal"
        >
          <div class="item-icon personal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" />
              <path
                d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
          </div>
          <div class="item-content">
            <span class="item-name">个人空间</span>
            <span class="item-desc">我的私人数据</span>
          </div>
          <Transition name="check">
            <svg
              v-if="!isTeamMode"
              class="item-check"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </Transition>
        </button>

        <!-- 团队分隔线 -->
        <div v-if="teams.length > 0" class="dropdown-divider">
          <span>我的团队</span>
        </div>

        <!-- 团队列表 -->
        <TransitionGroup name="team-list" tag="div" class="team-list">
          <button
            v-for="team in teams"
            :key="team.id || team.teamId"
            class="dropdown-item"
            :class="{ 'is-active': isTeamActive(team) }"
            @click="handleSelectTeam(team)"
          >
            <div class="item-icon team" :style="{ background: getTeamColor(team) }">
              {{ getTeamInitial(team) }}
            </div>
            <div class="item-content">
              <span class="item-name">{{ getTeamName(team) }}</span>
              <span class="item-desc">{{ getTeamRoleLabel(team) }}</span>
            </div>
            <Transition name="check">
              <svg
                v-if="isTeamActive(team)"
                class="item-check"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </Transition>
          </button>
        </TransitionGroup>

        <!-- 空状态 -->
        <div v-if="teams.length === 0 && loaded" class="empty-teams">
          <span>暂无团队</span>
        </div>

        <!-- 加载中 -->
        <div v-if="!loaded" class="loading-teams">
          <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              stroke-opacity="0.25"
            />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>加载中...</span>
        </div>
      </div>
    </Transition>

    <!-- 切换动画遮罩 -->
    <Transition name="switching">
      <div v-if="isSwitching" class="switching-overlay">
        <div class="switching-content">
          <svg class="switching-spinner" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="3"
              stroke-opacity="0.25"
            />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>切换中...</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTeamStore, TeamMemberRole, type TeamInfo } from '@/stores/team'
import { storeToRefs } from 'pinia'

const emit = defineEmits<{
  change: [context: { type: 'personal' | 'team'; teamId?: string }]
}>()

const teamStore = useTeamStore()
const { teams, loaded } = storeToRefs(teamStore)

const switcherRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const isSwitching = ref(false)

// 计算属性
const isTeamMode = computed(() => teamStore.isTeamMode)
const currentTeamId = computed(() => teamStore.currentTeamId)

const currentLabel = computed(() => {
  if (!isTeamMode.value) {
    return '个人空间'
  }
  const team = teamStore.currentTeam
  return team?.name || team?.displayName || '团队'
})

// 方法
const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const getTeamName = (team: TeamInfo) => {
  return team?.name || team?.displayName || '未命名团队'
}

const getTeamInitial = (team: TeamInfo) => {
  const name = getTeamName(team)
  return name.charAt(0).toUpperCase()
}

const getTeamColor = (team: TeamInfo) => {
  const colors = [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#f43f5e',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#14b8a6',
    '#06b6d4',
    '#3b82f6',
  ]
  const id = team?.id || team?.teamId || ''
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const getTeamRoleLabel = (team: TeamInfo) => {
  const role = team?.role
  switch (role) {
    case TeamMemberRole.Owner:
      return '所有者'
    case TeamMemberRole.Admin:
      return '管理员'
    case TeamMemberRole.Member:
      return '成员'
    default:
      return '成员'
  }
}

const isTeamActive = (team: TeamInfo) => {
  const teamId = team?.id || team?.teamId
  return currentTeamId.value === teamId
}

const handleSelectPersonal = async () => {
  if (!isTeamMode.value) {
    closeDropdown()
    return
  }

  isSwitching.value = true
  closeDropdown()

  try {
    await teamStore.switchToPersonal()
    emit('change', { type: 'personal' })
  } finally {
    setTimeout(() => {
      isSwitching.value = false
    }, 300)
  }
}

const handleSelectTeam = async (team: TeamInfo) => {
  const teamId = team?.id || team?.teamId
  if (currentTeamId.value === teamId) {
    closeDropdown()
    return
  }

  isSwitching.value = true
  closeDropdown()

  try {
    if (teamId) {
      await teamStore.switchToTeam(teamId)
      emit('change', { type: 'team', teamId })
    }
  } finally {
    setTimeout(() => {
      isSwitching.value = false
    }, 300)
  }
}

// 点击外部关闭
const handleClickOutside = (event: MouseEvent) => {
  if (switcherRef.value && !switcherRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
.team-switcher {
  position: relative;
}

.switcher-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.25);
  }

  &.is-open {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
}

.trigger-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
}

.trigger-text {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trigger-arrow {
  opacity: 0.6;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.is-rotated {
    transform: rotate(180deg);
  }
}

.switcher-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 260px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow:
    0 12px 32px rgba(15, 23, 42, 0.15),
    0 4px 12px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  z-index: 1000;
}

.dropdown-header {
  padding: 14px 16px 10px;
}

.header-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;

  &:hover {
    background: #f8fafc;

    .item-icon {
      transform: scale(1.05);
    }
  }

  &.is-active {
    background: #f1f5f9;
  }
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
  transition: transform 0.2s ease;

  &.personal {
    background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
    color: #fff;
  }

  &.team {
    color: #fff;
    font-size: 0.9rem;
    font-weight: 700;
  }
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-desc {
  font-size: 0.75rem;
  color: #94a3b8;
}

.item-check {
  color: #22c55e;
  flex-shrink: 0;
}

.dropdown-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }
}

.team-list {
  max-height: 240px;
  overflow-y: auto;
}

.empty-teams,
.loading-teams {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  font-size: 0.85rem;
  color: #94a3b8;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.switching-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.switching-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
  font-size: 0.95rem;
  font-weight: 500;
  color: #0f172a;
}

.switching-spinner {
  animation: spin 0.8s linear infinite;
  color: #0f172a;
}

// Animations
.dropdown-enter-active {
  animation: dropdown-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-leave-active {
  animation: dropdown-out 0.2s cubic-bezier(0.4, 0, 1, 1);
}

@keyframes dropdown-in {
  0% {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes dropdown-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
}

.check-enter-active {
  animation: check-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.check-leave-active {
  animation: check-out 0.15s ease-out;
}

@keyframes check-in {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes check-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.5);
  }
}

.team-list-enter-active {
  animation: team-item-in 0.3s ease-out;
}

.team-list-leave-active {
  animation: team-item-out 0.2s ease-out;
}

.team-list-move {
  transition: transform 0.3s ease;
}

@keyframes team-item-in {
  0% {
    opacity: 0;
    transform: translateX(-10px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes team-item-out {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(10px);
  }
}

.switching-enter-active {
  animation: switching-in 0.25s ease-out;
}

.switching-leave-active {
  animation: switching-out 0.3s ease-out;
}

@keyframes switching-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes switching-out {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>

