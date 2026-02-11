<template>
  <BaseModal
    :model-value="modelValue"
    container-class="create-base-modal"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- 头部 -->
    <template #header>
      <h3 class="modal-title">新建知识库</h3>
      <button class="modal-close" @click="handleClose">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 4L4 12M4 4l8 8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </template>

    <!-- 内容 -->
    <template #body>
      <form class="modal-form" @submit.prevent="handleSubmit">
        <!-- 知识库名称 -->
        <div class="form-item">
          <label class="form-label required">知识库名称</label>
          <div class="input-wrapper">
            <input
              v-model="form.name"
              type="text"
              class="custom-input"
              :class="{ 'has-error': nameError }"
              placeholder="输入知识库名称"
              maxlength="50"
              @blur="validateName"
              @input="nameError = ''"
            />
            <span class="input-count">{{ form.name.length }} / 50</span>
          </div>
          <p v-if="nameError" class="error-message">{{ nameError }}</p>
        </div>

        <!-- 描述 -->
        <div class="form-item">
          <label class="form-label">描述</label>
          <div class="textarea-wrapper">
            <textarea
              v-model="form.description"
              class="custom-textarea"
              placeholder="简要描述知识库内容（可选）"
              maxlength="200"
              rows="3"
            ></textarea>
            <span class="textarea-count">{{ form.description.length }} / 200</span>
          </div>
        </div>

        <!-- 可见性 -->
        <div class="form-item">
          <label class="form-label">可见性</label>
          <div class="visibility-options">
            <button
              type="button"
              class="visibility-option"
              :class="{ active: form.visibility === 0 }"
              @click="selectVisibility(0)"
            >
              <span class="visibility-icon">🔒</span>
              <div class="visibility-text">
                <span class="visibility-label">私有</span>
                <span class="visibility-desc">仅自己可见</span>
              </div>
            </button>
            <button
              v-if="hasTeams"
              type="button"
              class="visibility-option"
              :class="{ active: form.visibility === 1 }"
              @click="selectVisibility(1)"
            >
              <span class="visibility-icon">👥</span>
              <div class="visibility-text">
                <span class="visibility-label">团队可见</span>
                <span class="visibility-desc">团队成员可见</span>
              </div>
            </button>
          </div>
          
          <!-- 团队选择下拉框 -->
          <div v-if="form.visibility === 1 && hasTeams" class="team-select-wrapper">
            <div class="custom-select-wrapper">
              <button
                ref="teamSelectRef"
                type="button"
                class="custom-select"
                :class="{ 'is-open': teamDropdownOpen }"
                @click="toggleTeamDropdown"
              >
                <span class="select-text">
                  {{ getTeamName(form.teamId) || '选择团队' }}
                </span>
                <svg class="select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <Teleport to="body">
                <Transition name="dropdown-fade">
                  <div
                    v-if="teamDropdownOpen"
                    ref="teamDropdownRef"
                    class="custom-dropdown fixed-dropdown"
                    :style="teamDropdownStyle"
                  >
                    <button
                      v-for="team in availableTeams"
                      :key="team.id"
                      type="button"
                      class="dropdown-option"
                      :class="{ active: form.teamId === team.id }"
                      @click="selectTeam(team.id)"
                    >
                      {{ team.name || team.displayName }}
                    </button>
                  </div>
                </Transition>
              </Teleport>
            </div>
          </div>
        </div>

        <!-- 图标选择 -->
        <div class="form-item">
          <label class="form-label">图标</label>
          <div class="icon-picker">
            <button
              v-for="icon in iconOptions"
              :key="icon.key"
              type="button"
              class="icon-option"
              :class="{ active: form.icon === icon.key }"
              :title="icon.label"
              @click="form.icon = icon.key"
            >
              <span class="icon-emoji">{{ icon.emoji }}</span>
            </button>
          </div>
        </div>
      </form>
    </template>

    <!-- 底部 -->
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
      <button type="button" class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
        <span v-if="submitting" class="btn-loading">
          <svg class="spinner" width="14" height="14" viewBox="0 0 14 14">
            <circle
              cx="7"
              cy="7"
              r="6"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
              stroke-dasharray="31.416"
              stroke-dashoffset="31.416"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="31.416;0;31.416"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </span>
        <span v-else>创建</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed, nextTick, onUnmounted, type CSSProperties } from 'vue'
import BaseModal from './BaseModal.vue'
import { useTeamStore } from '@/stores/team'

// ========================================
// 数据定义
// ========================================

// 图标选项
const iconOptions = [
  { key: 'icon_default', emoji: '📚', label: '默认' },
  { key: 'icon_book', emoji: '📖', label: '书籍' },
  { key: 'icon_code', emoji: '💻', label: '代码' },
  { key: 'icon_idea', emoji: '💡', label: '想法' },
  { key: 'icon_star', emoji: '⭐', label: '收藏' },
  { key: 'icon_folder', emoji: '📁', label: '文件夹' },
  { key: 'icon_note', emoji: '📝', label: '笔记' },
  { key: 'icon_rocket', emoji: '🚀', label: '项目' },
]

interface Props {
  modelValue: boolean
  submitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: { name: string; description: string; icon: string; visibility: number; teamId?: string }]
}>()

// ========================================
// 团队相关
// ========================================

const teamStore = useTeamStore()

// 计算属性：是否有团队
const hasTeams = computed(() => {
  return teamStore.teams && teamStore.teams.length > 0
})

// 计算属性：可用的团队列表
const availableTeams = computed(() => {
  return teamStore.teams || []
})

// 获取团队名称
const getTeamName = (teamId: string | null): string => {
  if (!teamId) return ''
  const team = availableTeams.value.find(t => t.id === teamId || t.teamId === teamId)
  return team?.name || team?.displayName || ''
}

// ========================================
// 表单状态
// ========================================

const form = reactive({
  name: '',
  description: '',
  icon: 'icon_default',
  visibility: 0,
  teamId: '',
})

const nameError = ref('')

// ========================================
// 下拉框状态
// ========================================

const teamDropdownOpen = ref(false)
const teamSelectRef = ref<HTMLElement | null>(null)
const teamDropdownRef = ref<HTMLElement | null>(null)
const teamDropdownStyle = ref<CSSProperties>({})

// ========================================
// 下拉框辅助函数
// ========================================

const closeAllDropdowns = () => {
  teamDropdownOpen.value = false
}

const calculateDropdownPosition = (
  selectEl: HTMLElement | null,
  dropdownEl: HTMLElement | null
): CSSProperties => {
  if (!selectEl || !dropdownEl) return {}

  const rect = selectEl.getBoundingClientRect()
  const dropdownRect = dropdownEl.getBoundingClientRect()

  let top = rect.bottom + 6
  let left = rect.left
  const width = rect.width

  if (left + width > window.innerWidth - 20) {
    left = window.innerWidth - width - 20
  }

  if (top + dropdownRect.height > window.innerHeight - 20) {
    top = rect.top - dropdownRect.height - 6
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
  }
}

const updateDropdownPositions = async () => {
  if (!teamDropdownOpen.value) return
  await nextTick()

  if (teamDropdownOpen.value) {
    teamDropdownStyle.value = calculateDropdownPosition(
      teamSelectRef.value,
      teamDropdownRef.value
    )
  }
}

// ========================================
// 下拉框操作
// ========================================

const toggleTeamDropdown = async () => {
  if (teamDropdownOpen.value) {
    teamDropdownOpen.value = false
    return
  }
  closeAllDropdowns()
  teamDropdownOpen.value = true
  await updateDropdownPositions()
}

const selectTeam = (teamId: string) => {
  form.teamId = teamId
  teamDropdownOpen.value = false
}

// ========================================
// 可见性选择
// ========================================

const selectVisibility = (visibility: number) => {
  form.visibility = visibility
  if (visibility === 1 && hasTeams.value && availableTeams.value.length > 0) {
    // 如果选择团队可见，且还没有选择团队，默认选择第一个团队
    if (!form.teamId) {
      form.teamId = availableTeams.value[0].id || availableTeams.value[0].teamId || ''
    }
  } else if (visibility === 0) {
    // 如果选择私有，清空团队ID
    form.teamId = ''
  }
}

// ========================================
// 表单验证和提交
// ========================================

const validateName = (): boolean => {
  if (!form.name.trim()) {
    nameError.value = '请输入知识库名称'
    return false
  }
  nameError.value = ''
  return true
}

const resetForm = () => {
  form.name = ''
  form.description = ''
  form.icon = 'icon_default'
  form.visibility = 0
  form.teamId = ''
  nameError.value = ''
  closeAllDropdowns()
}

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSubmit = () => {
  if (!validateName()) return
  
  const payload: any = {
    name: form.name,
    description: form.description,
    icon: form.icon,
    visibility: form.visibility,
  }
  
  // 如果是团队可见，添加teamId
  if (form.visibility === 1 && form.teamId) {
    payload.teamId = form.teamId
  }
  
  emit('submit', payload)
}

// ========================================
// 全局监听器
// ========================================

const handleClickOutside = (e: MouseEvent) => {
  if (!props.modelValue) return
  const target = e.target as HTMLElement
  if (!target.closest('.fixed-dropdown') && !target.closest('.custom-select')) {
    closeAllDropdowns()
  }
}

const addGlobalListeners = () => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', updateDropdownPositions)
  window.addEventListener('scroll', updateDropdownPositions, true)
}

const removeGlobalListeners = () => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', updateDropdownPositions)
  window.removeEventListener('scroll', updateDropdownPositions, true)
}

// ========================================
// 监听器
// ========================================

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetForm()
      addGlobalListeners()
      updateDropdownPositions()
    } else {
      removeGlobalListeners()
      closeAllDropdowns()
    }
  }
)

watch(teamDropdownOpen, () => {
  updateDropdownPositions()
})

onUnmounted(() => {
  removeGlobalListeners()
})
</script>

<style scoped>
/* ========================================
   表单样式
   ======================================== */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.form-label.required::before {
  content: '* ';
  color: #f53f3f;
}

/* ========================================
   输入框样式
   ======================================== */
.input-wrapper,
.textarea-wrapper {
  position: relative;
}

.custom-input {
  width: 100%;
  padding: 10px 14px;
  padding-right: 60px;
  border-radius: 0;
  border: 1px solid #E0E0E0;
  background: #F7F7F7;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.custom-input:hover {
  border-color: #CCCCCC;
  background: #FFFFFF;
}

.custom-input:focus {
  border-color: #999;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  background: #FFFFFF;
}

.custom-input.has-error {
  border-color: #f53f3f;
}

.input-count,
.textarea-count {
  position: absolute;
  right: 12px;
  font-size: 12px;
  color: #999;
  pointer-events: none;
}

.input-count {
  top: 50%;
  transform: translateY(-50%);
}

.textarea-count {
  bottom: 10px;
}

.error-message {
  font-size: 12px;
  color: #f53f3f;
  margin: 0;
}

/* ========================================
   文本域样式
   ======================================== */
.custom-textarea {
  width: 100%;
  padding: 10px 14px;
  padding-bottom: 28px;
  border-radius: 0;
  border: 1px solid #E0E0E0;
  background: #F7F7F7;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
  outline: none;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
}

.custom-textarea:hover {
  border-color: #CCCCCC;
  background: #FFFFFF;
}

.custom-textarea:focus {
  border-color: #999;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  background: #FFFFFF;
}

/* ========================================
   可见性选项样式
   ======================================== */
.visibility-options {
  display: flex;
  gap: 12px;
}

.visibility-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #E0E0E0;
  background: #F7F7F7;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.visibility-option:hover {
  background: #FFFFFF;
  border-color: #CCCCCC;
}

.visibility-option.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.visibility-option.active .visibility-label,
.visibility-option.active .visibility-desc {
  color: #FFFFFF;
}

.visibility-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.visibility-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.visibility-label {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.visibility-desc {
  font-size: 12px;
  color: #999;
}

/* ========================================
   团队选择样式
   ======================================== */
.team-select-wrapper {
  margin-top: 12px;
}

.custom-select-wrapper {
  position: relative;
  z-index: 1;
}

.custom-select {
  width: 100%;
  padding: 10px 14px;
  background: #F7F7F7;
  border: 1px solid #E0E0E0;
  border-radius: 0;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  transition: all 0.2s ease;
  outline: none;
}

.custom-select:hover {
  border-color: #CCCCCC;
  background: #FFFFFF;
}

.custom-select.is-open {
  border-color: #999;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
  background: #FFFFFF;
}

.select-text {
  flex: 1;
  text-align: left;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-arrow {
  color: #999;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.custom-select.is-open .select-arrow {
  transform: rotate(180deg);
}

/* ========================================
   下拉菜单样式
   ======================================== */
.custom-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 4px;
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
}

.fixed-dropdown {
  position: fixed;
  z-index: 3000;
  min-width: 200px;
}

.dropdown-option {
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 0;
  text-align: left;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-option:hover {
  background: #F5F5F5;
}

.dropdown-option.active {
  background: #1a1a1a;
  color: #FFFFFF;
  font-weight: 500;
}

/* ========================================
   图标选择器样式
   ======================================== */
.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 44px;
  height: 44px;
  border: 1px solid #E0E0E0;
  background: #F7F7F7;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-option:hover {
  background: #FFFFFF;
  border-color: #999;
}

.icon-option.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.icon-emoji {
  font-size: 20px;
}

/* ========================================
   按钮样式
   ======================================== */
.btn {
  border-radius: 0;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #E0E0E0;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ========================================
   下拉菜单过渡动画
   ======================================== */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

