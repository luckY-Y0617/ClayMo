<template>
  <BaseModal
    :model-value="modelValue"
    container-class="create-doc-modal"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- 头部 -->
    <template #header>
      <h3 class="modal-title">新建{{ form.type === 1 ? '文件夹' : '文档' }}</h3>
      <button class="modal-close" @click="handleClose">
        <el-icon :size="16"><Close /></el-icon>
      </button>
    </template>

    <!-- 内容 -->
    <template #body>
      <form class="modal-form" @submit.prevent="handleSubmit">
        <!-- 文档标题 -->
        <div class="form-item">
          <label class="form-label required">文档标题</label>
          <div class="input-wrapper">
            <input
              v-model="form.title"
              type="text"
              class="custom-input"
              :class="{ 'has-error': titleError }"
              placeholder="输入文档标题"
              maxlength="80"
              @blur="validateTitle"
              @input="titleError = ''"
            />
            <span class="input-count">{{ form.title.length }} / 80</span>
          </div>
          <p v-if="titleError" class="error-message">{{ titleError }}</p>
        </div>

        <!-- 文档类型 -->
        <div class="form-item">
          <label class="form-label">类型</label>
          <div class="type-selector">
            <button
              type="button"
              class="type-btn"
              :class="{ active: form.type === 0 }"
              @click="form.type = 0"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 2h6l4 4v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M9 2v4h4" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span>文档</span>
            </button>
            <button
              type="button"
              class="type-btn"
              :class="{ active: form.type === 1 }"
              @click="form.type = 1"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4a1 1 0 0 1 1-1h3l1 1h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span>文件夹</span>
            </button>
          </div>
        </div>

        <!-- 父文档 -->
        <div class="form-item">
          <label class="form-label">父文档</label>
          <div class="custom-select-wrapper">
            <button
              ref="parentSelectRef"
              type="button"
              class="custom-select"
              :class="{ 'is-open': parentDropdownOpen }"
              @click="toggleParentDropdown"
            >
              <span class="select-text">
                {{ getParentName(form.parentId) || '选择父文档（可选）' }}
              </span>
              <svg
                v-if="form.parentId"
                class="select-clear"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                @click.stop="clearParent"
              >
                <path
                  d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
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
                  v-if="parentDropdownOpen"
                  ref="parentDropdownRef"
                  class="custom-dropdown fixed-dropdown"
                  :style="parentDropdownStyle"
                >
                  <button
                    type="button"
                    class="dropdown-option"
                    :class="{ active: !form.parentId }"
                    @click="selectParent(null)"
                  >
                    无父文档
                  </button>
                  <button
                    v-for="option in flattenParentOptions"
                    :key="option.value"
                    type="button"
                    class="dropdown-option"
                    :class="{ active: form.parentId === option.value }"
                    :style="{ paddingLeft: `${12 + option.level * 16}px` }"
                    @click="selectParent(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </Transition>
            </Teleport>
          </div>
        </div>
      </form>
    </template>

    <!-- 底部 -->
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
      <button type="button" class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
        <span v-if="submitting" class="btn-loading">
          <el-icon class="is-loading" :size="14"><Loading /></el-icon>
        </span>
        <span v-else>创建并打开</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch, onUnmounted, nextTick, type CSSProperties } from 'vue'
import { Close, Loading } from '@element-plus/icons-vue'
import BaseModal from './BaseModal.vue'

interface ParentOption {
  label: string
  value: string
  children?: ParentOption[]
}

interface FlattenedOption {
  label: string
  value: string
  level: number
}

interface Props {
  modelValue: boolean
  parentOptions?: ParentOption[]
  defaultBaseId?: string
  defaultParentId?: string
    defaultType?: number
  submitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  parentOptions: () => [],
  defaultBaseId: '',
  defaultParentId: '',
    defaultType: 0,
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: { baseId: string; title: string; parentId: string; type: number }]
}>()

// Form State
const form = reactive({
    baseId: '',
    title: '',
    parentId: '',
    type: 0, // 0 = Normal, 1 = Folder
  })

const titleError = ref('')

// Dropdown State
const parentDropdownOpen = ref(false)
const parentSelectRef = ref<HTMLElement | null>(null)
const parentDropdownRef = ref<HTMLElement | null>(null)
const parentDropdownStyle = ref<CSSProperties>({})

// Helpers
const closeAllDropdowns = () => {
  parentDropdownOpen.value = false
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
  if (!parentDropdownOpen.value) return
  await nextTick()

  if (parentDropdownOpen.value) {
    parentDropdownStyle.value = calculateDropdownPosition(
      parentSelectRef.value,
      parentDropdownRef.value
    )
  }
}

// Options / Lookup
const flattenParentOptions = computed((): FlattenedOption[] => {
  const flatten = (options: ParentOption[], level = 0): FlattenedOption[] => {
    const result: FlattenedOption[] = []
    for (const option of options || []) {
      result.push({ label: option.label, value: option.value, level })
      if (option.children?.length) {
        result.push(...flatten(option.children, level + 1))
      }
    }
    return result
  }
  return flatten(props.parentOptions)
})

const getParentName = (id: string | null): string => {
  if (!id) return ''
  const dfs = (options: ParentOption[]): string => {
    for (const option of options || []) {
      if (option.value === id) return option.label
      if (option.children?.length) {
        const found = dfs(option.children)
        if (found) return found
      }
    }
    return ''
  }
  return dfs(props.parentOptions)
}

// Dropdown Actions
const toggleParentDropdown = async () => {
  if (parentDropdownOpen.value) {
    parentDropdownOpen.value = false
    return
  }
  closeAllDropdowns()
  parentDropdownOpen.value = true
  await updateDropdownPositions()
}

const selectParent = (id: string | null) => {
  form.parentId = id ? String(id) : ''
  parentDropdownOpen.value = false
}

const clearParent = () => {
  form.parentId = ''
}

// Validation / Submit
const validateTitle = (): boolean => {
  if (!form.title.trim()) {
    titleError.value = '请输入标题'
    return false
  }
  titleError.value = ''
  return true
}

const resetForm = () => {
  form.baseId = props.defaultBaseId || ''
  form.title = ''
  form.parentId = props.defaultParentId || ''
    form.type = props.defaultType || 0
  titleError.value = ''
  closeAllDropdowns()
}

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSubmit = () => {
  if (!validateTitle()) return
  emit('submit', { ...form })
}

// Global Listeners
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

// Watches
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

watch(
  () => props.defaultBaseId,
  (val) => {
    if (props.modelValue && val) {
      form.baseId = val
    }
  },
  { immediate: true }
)

watch(parentDropdownOpen, () => {
  updateDropdownPositions()
})

onUnmounted(() => {
  removeGlobalListeners()
})
</script>

<style scoped>
/* CreateDocModal 特有样式 */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.input-wrapper {
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

.input-count {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #999;
  pointer-events: none;
}

.error-message {
  font-size: 12px;
  color: #f53f3f;
  margin: 0;
}

/* 类型选择器 */
.type-selector {
  display: flex;
  gap: 8px;
}

.type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid #E0E0E0;
  border-radius: 0;
  background: #F7F7F7;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-btn:hover {
  background: #FFFFFF;
  border-color: #999;
}

.type-btn.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #FFFFFF;
}

.type-btn svg {
  flex-shrink: 0;
}

/* 自定义选择器 */
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

.select-clear {
  color: #999;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.select-clear:hover {
  color: #1a1a1a;
}

/* 下拉菜单 */
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

/* 按钮 */
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

/* 过渡动画 */
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

