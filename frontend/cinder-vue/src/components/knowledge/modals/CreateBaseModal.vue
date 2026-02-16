<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container kb-modal-container" @click.stop>
          <!-- Header -->
          <div class="modal-header">
            <div>
              <p class="modal-eyebrow">新的知识空间</p>
              <h3 class="modal-title">创建知识库</h3>
            </div>
            <button class="modal-close" @click="handleClose">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <form @submit.prevent="handleSubmit" class="modal-form">
              
              <!-- 名称 -->
              <div class="form-item">
                <label class="form-label required">知识库名称</label>
                <div class="input-wrapper">
                  <input
                    v-model="form.name"
                    type="text"
                    class="custom-input"
                    :class="{ 'has-error': nameError }"
                    placeholder="例如：语雀体验拆解"
                    maxlength="40"
                    @blur="validateName"
                    @input="nameError = ''"
                  />
                  <span class="input-count">{{ form.name.length }} / 40</span>
                </div>
                <p v-if="nameError" class="error-message">{{ nameError }}</p>
              </div>

              <!-- 简介 -->
              <div class="form-item">
                <label class="form-label">简介</label>
                <textarea
                  v-model="form.description"
                  class="custom-textarea"
                  placeholder="一句话描述这个知识库的用途"
                  maxlength="120"
                  rows="3"
                ></textarea>
                <span class="textarea-count">{{ form.description.length }} / 120</span>
              </div>

              <!-- 创建类型 -->
              <div class="form-item">
                <label class="form-label">创建类型</label>
                <div class="create-type-group">
                  <button
                    type="button"
                    class="create-type-btn"
                    :class="{ active: form.createType === 'personal' }"
                    :disabled="forceTeamMode"
                    @click="setCreateType('personal')"
                  >
                    <span class="type-label">个人</span>
                    <span class="type-desc">创建个人知识库</span>
                  </button>
                  <button
                    type="button"
                    class="create-type-btn"
                    :class="{ active: form.createType === 'team' }"
                    @click="setCreateType('team')"
                  >
                    <span class="type-label">团队</span>
                    <span class="type-desc">创建团队知识库</span>
                  </button>
                </div>
              </div>

              <!-- 所属团队 - 仅在团队创建时显示 -->
              <div class="form-item" v-if="form.createType === 'team'">
                <label class="form-label required">所属团队</label>
                <div v-if="forceTeamMode" class="readonly-team">
                  {{ selectedTeamLabel || '当前团队' }}
                </div>
                <div v-else class="dropdown-wrapper" ref="teamDropdownRef">
                  <div
                    class="dropdown-display custom-input"
                    :class="{ 'has-error': teamError, open: teamDropdownOpen }"
                    role="button"
                    tabindex="0"
                    @click="toggleTeamDropdown"
                    @keydown.enter.prevent="toggleTeamDropdown"
                  >
                    <span :class="{ placeholder: !selectedTeamLabel }">
                      {{ selectedTeamLabel || '请选择团队' }}
                    </span>
                    <svg class="arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>

                  <div v-if="teamDropdownOpen" class="dropdown-options">
                    <div
                      class="dropdown-option"
                      :class="{ active: !form.teamId }"
                      @click="handleTeamSelect('')"
                    >
                      请选择团队
                    </div>
                    <div
                      v-for="team in teamOptions"
                      :key="team.id"
                      class="dropdown-option"
                      :class="{ selected: form.teamId === team.id }"
                      @click="handleTeamSelect(team.id)"
                    >
                      {{ team.name || team.id }}
                    </div>
                    <div v-if="teamOptions.length === 0 && !teamLoading" class="dropdown-option empty">
                      暂无团队
                    </div>
                    <div v-if="teamLoading" class="dropdown-option empty">正在加载...</div>
                  </div>
                </div>
                <p v-if="teamLoading" class="hint-text">团队列表加载中...</p>
                <p v-if="teamError" class="error-message">{{ teamError }}</p>
              </div>

              <!-- 可见范围 -->
              <div class="form-item">
                <label class="form-label">可见范围</label>
                <div class="visibility-mini-group">
                  <button
                    v-for="opt in filteredVisibilityOptions"
                    :key="opt.value"
                    type="button"
                    class="visibility-mini-card"
                    :class="{ active: form.visibility === opt.value }"
                    @click="form.visibility = opt.value"
                  >
                    <div class="vis-title">{{ opt.label }}</div>
                    <div class="vis-sub">{{ opt.sub }}</div>
                  </button>
                </div>
              </div>

              <!-- 成员文档权限 -->
              <div class="form-item switch-row">
                <div>
                  <label class="form-label">成员权限</label>
                  <p class="hint-text">开启后团队成员可直接创建文档</p>
                </div>
                <label class="switch">
                  <input type="checkbox" v-model="form.allowMembersCreateDoc" />
                  <span class="slider"></span>
                </label>
              </div>

              <!-- 图标 -->
              <div class="form-item">
                <label class="form-label">封面图标</label>
                <div class="icon-grid">
                  <button
                    v-for="iconOption in KB_ICON_OPTIONS"
                    :key="iconOption.key"
                    type="button"
                    class="icon-chip"
                    :class="{ active: form.icon === iconOption.key }"
                    @click="form.icon = iconOption.key"
                    :title="iconOption.label"
                  >
                    <img
                      v-if="getIconSrc(iconOption.key)"
                      :src="getIconSrc(iconOption.key)"
                      :alt="iconOption.label"
                      class="icon-image"
                      @error="handleImageError($event, iconOption.key)"
                    />
                    <span
                      v-else
                      class="icon-placeholder"
                    >{{ getIconEmoji(iconOption.key) }}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn btn-secondary" type="button" @click="handleClose">取消</button>
            <button
              class="btn btn-primary"
              type="button"
              :disabled="submitting"
              @click="handleSubmit"
            >
              <span v-if="submitting" class="btn-loading">
                <svg class="spinner" width="14" height="14" viewBox="0 0 14 14">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                    <animate attributeName="stroke-dashoffset" values="31.416;0;31.416" dur="1s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              </span>
              <span v-else>创建知识库</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { KB_ICON_OPTIONS, DEFAULT_ICON_KEY } from '@/constants/kbIcons'
import { useTeamStore } from '@/stores/team'
import useKbIcons from '@/composables/useKbIcons'

const props = defineProps({
  modelValue: Boolean,
  submitting: Boolean,
})

const emit = defineEmits(['update:modelValue', 'submit'])
const teamStore = useTeamStore()

const form = reactive({
  name: '',
  description: '',
  icon: DEFAULT_ICON_KEY,
  createType: 'personal', // 'personal' | 'team'
  visibility: 'Private', // Private = 0, Team = 1, Public = 2
  allowMembersCreateDoc: true,
  teamId: '',
})

const visibilityOptions = [
  { value: 'Private', label: '私密',  sub: '仅自己 & 邀请成员' },
  { value: 'Team',    label: '团队',  sub: '空间成员可见' },
  { value: 'Public',  label: '公开',  sub: '任何人可访问' },
]

// 根据创建类型过滤可见范围选项
const filteredVisibilityOptions = computed(() => {
  if (form.createType === 'personal') {
    // 个人创建：只显示私密和公开
    return visibilityOptions.filter(opt => opt.value !== 'Team')
  }
  // 团队创建：显示所有选项
  return visibilityOptions
})

const nameError = ref('')
const teamError = ref('')

const teamDropdownOpen = ref(false)
const teamDropdownRef = ref(null)

const forceTeamMode = computed(() => teamStore.currentTeamId !== null)
const teamOptions = computed(() => teamStore.teams || [])
const teamLoading = computed(() => !teamStore.loaded)

const selectedTeamLabel = computed(() => {
  const found = teamOptions.value.find(t => t.id === form.teamId)
  return found ? (found.name || found.displayName || found.id) : ''
})

const validateName = () => {
  if (!form.name.trim()) {
    nameError.value = '请输入知识库名称'
    return false
  }
  nameError.value = ''
  return true
}

const validateTeam = () => {
  // 团队创建时才需要验证团队
  if (form.createType === 'team' && !form.teamId) {
    teamError.value = '请选择团队'
    return false
  }
  teamError.value = ''
  return true
}

const setCreateType = (type) => {
  if (forceTeamMode.value && type === 'personal') return
  form.createType = type
  if (type === 'personal') {
    form.teamId = ''
    if (form.visibility === 'Team') {
      form.visibility = 'Private'
    }
  } else if (!form.teamId && teamOptions.value.length === 1) {
      form.teamId = teamOptions.value[0].id
  }
}

const toggleTeamDropdown = () => {
  teamDropdownOpen.value = !teamDropdownOpen.value
}

const handleTeamSelect = (id) => {
  form.teamId = id
  teamDropdownOpen.value = false
  teamError.value = ''
}

const handleClickOutside = (event) => {
  if (teamDropdownRef.value && !teamDropdownRef.value.contains(event.target)) {
    teamDropdownOpen.value = false
  }
}

const resetForm = () => {
  form.name = ''
  form.description = ''
  form.icon = DEFAULT_ICON_KEY
  form.visibility = 'Private'
  form.allowMembersCreateDoc = true
  nameError.value = ''
  teamError.value = ''

  if (forceTeamMode.value) {
    form.createType = 'team'
    form.teamId = teamStore.currentTeamId || ''
    if (!form.teamId && teamOptions.value.length === 1) {
      form.teamId = teamOptions.value[0].id
    }
  } else {
    form.createType = 'personal'
    form.teamId = ''
  }
}

watch(() => props.modelValue, (visible) => {
  if (visible) {
    resetForm()
    document.addEventListener('click', handleClickOutside)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})

watch(forceTeamMode, (isTeam) => {
  if (isTeam) {
    form.createType = 'team'
    form.teamId = teamStore.currentTeamId || ''
    if (!form.teamId && teamOptions.value.length === 1) {
      form.teamId = teamOptions.value[0].id
    }
  } else {
    form.createType = 'personal'
    form.teamId = ''
    if (form.visibility === 'Team') {
      form.visibility = 'Private'
    }
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleClose = () => {
  if (!props.submitting) emit('update:modelValue', false)
}

// 使用可复用的图标逻辑
const { getIconSrc, getIconEmoji, handleImageError, iconErrorMap } = useKbIcons()

// getIconEmoji 来自 useKbIcons

const handleSubmit = () => {
  if (!validateName() || !validateTeam()) return
  
  // 确保 icon 字段有值，如果不在白名单中则使用默认值
  const validKeys = new Set(KB_ICON_OPTIONS.map(i => i.key))
  const finalIcon = validKeys.has(form.icon) ? form.icon : DEFAULT_ICON_KEY
  
  emit('submit', { 
    ...form,
    icon: finalIcon
  })
}
</script>

<style scoped>

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.modal-container {
  width: 520px;
  max-width: 92vw;
  background: #FFFFFF;
  border-radius: 0;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #E8E8E8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 16px 24px;
  background: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.modal-eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: #999;
  text-transform: uppercase;
}

.modal-title {
  margin: 2px 0 0;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.01em;
}

.modal-close {
  width: 32px;
  height: 32px;
  background: transparent;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  border: none;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #F5F5F5;
  color: #1a1a1a;
}

.modal-body {
  padding: 16px 20px;
  background: #FFFFFF;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-label.required::before {
  content: '* ';
  color: #f53f3f;
}

.input-wrapper {
  position: relative;
}

.custom-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 0;
  border: 1px solid #E0E0E0;
  background: #F7F7F7;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
  outline: none;
}

.custom-input:hover {
  border-color: #CCCCCC;
  background: #FFFFFF;
}

.custom-input:focus {
  border-color: #999;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  outline: none;
  background: #FFFFFF;
}

.custom-input.has-error {
  border-color: #f53f3f;
}

.input-count {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-tertiary);
}

.custom-textarea {
  width: 100%;
  padding: 8px 12px;
  border-radius: 0;
  border: 1px solid #E0E0E0;
  background: #F7F7F7;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  transition: all 0.2s ease;
  outline: none;
  color: #1a1a1a;
  font-family: inherit;
  min-height: 60px;
}

.custom-textarea:hover {
  border-color: #CCCCCC;
  background: #FFFFFF;
}

.custom-textarea:focus {
  border-color: #999;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  outline: none;
  background: #FFFFFF;
}


.textarea-count {
  align-self: flex-end;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ---------------- 团队下拉 ---------------- */

.dropdown-wrapper {
  position: relative;
}

.readonly-team {
  padding: 10px 12px;
  background: #F7F7F7;
  border: 1px solid #E0E0E0;
  color: #1a1a1a;
  font-size: 14px;
}

.dropdown-display {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dropdown-display .placeholder {
  color: var(--text-tertiary);
}

.dropdown-display .arrow-icon {
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
}

.dropdown-display.open .arrow-icon {
  transform: rotate(180deg);
}

.dropdown-options {
  position: absolute;
  z-index: 10;
  width: 100%;
  margin-top: 4px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  max-height: 220px;
  overflow: auto;
}

.dropdown-option {
  padding: 10px 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease;
  color: #1a1a1a;
  font-size: 14px;
}

.dropdown-option:hover {
  background: #F5F5F5;
}

.dropdown-option.selected {
  background: #1a1a1a;
  color: #FFFFFF;
  font-weight: 500;
}

.dropdown-option.empty {
  color: var(--text-tertiary);
  cursor: default;
}

/* ---------------- 可见范围（精简小卡片样式） ---------------- */

.visibility-mini-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.visibility-mini-card {
  padding: 12px 14px;
  border-radius: 0;
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 52px;
}

.visibility-mini-card:hover {
  border-color: #999;
  background: #FAFAFA;
}

.visibility-mini-card.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #FFFFFF;
}

.visibility-mini-card.active .vis-sub {
  color: #CCCCCC;
}

/* 创建类型选择 */
.create-type-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.create-type-btn {
  padding: 12px 14px;
  border-radius: 0;
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 52px;
}

.create-type-btn:hover {
  border-color: #999;
  background: #FAFAFA;
}

.create-type-btn.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #FFFFFF;
}

.create-type-btn.active .type-desc {
  color: #CCCCCC;
}

.type-label {
  font-size: 15px;
  font-weight: 600;
}

.type-desc {
  font-size: 12px;
  color: #777;
}

.vis-title {
  font-size: 15px;
  font-weight: 600;
}

.vis-sub {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.85;
}

/* ---------------- 成员权限开关 ---------------- */

.switch-row {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.hint-text {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #E0E0E0;
  transition: 0.2s;
  border-radius: 0;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.switch input:checked + .slider {
  background: #1a1a1a;
}

.switch input:checked + .slider:before {
  transform: translateX(22px);
}


/* ---------------- 图标选择 ---------------- */

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.icon-chip {
  border: 1px solid #E0E0E0;
  background: #FFFFFF;
  border-radius: 0;
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  min-width: 0;
}

.icon-chip:hover {
  border-color: #999;
  background: #FAFAFA;
}

.icon-chip.active {
  border-color: #1a1a1a;
  background: #1a1a1a;
  border-width: 2px;
}

.icon-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  max-width: 24px;
  max-height: 24px;
}

.icon-placeholder {
  font-size: 20px;
  line-height: 1;
  display: block;
}

/* ---------------- Footer ---------------- */

.modal-footer {
  padding: 12px 24px 16px;
  background: #FFFFFF;
  border-top: 1px solid #E8E8E8;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  border-radius: 0;
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #E0E0E0;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  outline: none;
}

.btn-secondary {
  background: #FFFFFF;
  color: #1a1a1a;
}

.btn-secondary:hover {
  background: #F5F5F5;
  border-color: #CCCCCC;
}

.btn-primary {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #FFFFFF;
}

.btn-primary:hover:not(:disabled) {
  background: #333;
  border-color: #333;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-loading {
  display: inline-flex;
  align-items: center;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ---------------- Fade ---------------- */

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
