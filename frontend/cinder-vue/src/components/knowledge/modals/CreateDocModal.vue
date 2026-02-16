<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container kb-modal-container" @click.stop>
          <!-- 头部 -->
          <div class="modal-header">
            <h3 class="modal-title">新建文档</h3>
            <button class="modal-close" @click="handleClose">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body">
            <form @submit.prevent="handleSubmit" class="modal-form">
              <!-- 文档标题 -->
              <div class="form-item">
                <label class="form-label required">文档标题</label>
                <div class="input-wrapper">
                  <input v-model="form.title" type="text" class="custom-input" :class="{ 'has-error': titleError }"
                    placeholder="输入文档标题" maxlength="80" @blur="validateTitle" @input="titleError = ''" />
                  <span class="input-count">{{ form.title.length }} / 80</span>
                </div>
                <p v-if="titleError" class="error-message">{{ titleError }}</p>
              </div>

              <!-- 父文档 -->
              <div class="form-item">
                <label class="form-label">父文档</label>
                <div class="custom-select-wrapper">
                  <button ref="parentSelectRef" type="button" class="custom-select"
                    :class="{ 'is-open': parentDropdownOpen }" @click="toggleParentDropdown">
                    <span class="select-text">
                      {{ getParentName(form.parentId) || '选择父文档（可选）' }}
                    </span>
                    <svg v-if="form.parentId" class="select-clear" width="14" height="14" viewBox="0 0 14 14"
                      fill="none" @click.stop="clearParent">
                      <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" stroke-width="1.5"
                        stroke-linecap="round" />
                    </svg>
                    <svg class="select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                        stroke-linejoin="round" />
                    </svg>
                  </button>
                  <Teleport to="body">
                    <Transition name="dropdown-fade">
                      <div v-if="parentDropdownOpen" ref="parentDropdownRef" class="custom-dropdown fixed-dropdown"
                        :style="parentDropdownStyle">
                        <button type="button" class="dropdown-option" :class="{ active: !form.parentId }"
                          @click="selectParent(null)">
                          无父文档
                        </button>
                        <template v-for="option in flattenParentOptions" :key="option.value">
                          <button type="button" class="dropdown-option"
                            :class="{ active: form.parentId === option.value }"
                            :style="{ paddingLeft: `${12 + option.level * 16}px` }" @click="selectParent(option.value)">
                            {{ option.label }}
                          </button>
                        </template>
                      </div>
                    </Transition>
                  </Teleport>
                </div>
              </div>

              <!-- 文档模板 -->
              <div class="form-item">
                <label class="form-label">文档模板</label>
                <div class="custom-select-wrapper">
                  <button ref="templateSelectRef" type="button" class="custom-select"
                    :class="{ 'is-open': templateDropdownOpen }" @click="toggleTemplateDropdown">
                    <span class="select-text">
                      {{ getTemplateName(form.templateId) || '选择模板（可选）' }}
                    </span>
                    <svg v-if="form.templateId" class="select-clear" width="14" height="14" viewBox="0 0 14 14"
                      fill="none" @click.stop="clearTemplate">
                      <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" stroke-width="1.5"
                        stroke-linecap="round" />
                    </svg>
                    <svg class="select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                        stroke-linejoin="round" />
                    </svg>
                  </button>
                  <Teleport to="body">
                    <Transition name="dropdown-fade">
                      <div v-if="templateDropdownOpen" ref="templateDropdownRef" class="custom-dropdown fixed-dropdown"
                        :style="templateDropdownStyle">
                        <button type="button" class="dropdown-option" :class="{ active: !form.templateId }"
                          @click="selectTemplate(null)">
                          不使用模板
                        </button>
                        <button v-for="tpl in templates" :key="tpl.id" type="button"
                          class="dropdown-option template-option" :class="{ active: form.templateId === tpl.id }"
                          @click="selectTemplate(tpl.id)">
                          <div class="template-option-content">
                            <span class="template-name">{{ tpl.name }}</span>
                            <small v-if="tpl.description" class="template-desc">{{ tpl.description }}</small>
                          </div>
                        </button>
                      </div>
                    </Transition>
                  </Teleport>
                </div>
              </div>
            </form>
          </div>

          <!-- 底部 -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
            <button type="button" class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
              <span v-if="submitting" class="btn-loading">
                <svg class="spinner" width="14" height="14" viewBox="0 0 14 14">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2" fill="none"
                    stroke-dasharray="31.416" stroke-dashoffset="31.416">
                    <animate attributeName="stroke-dashoffset" values="31.416;0;31.416" dur="1s"
                      repeatCount="indefinite" />
                  </circle>
                </svg>
              </span>
              <span v-else>创建并打开</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref, computed, watch, onUnmounted, nextTick } from 'vue'

/* ----------------------------- Props / Emits ----------------------------- */

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  bases: { type: Array, default: () => [] },
  parentOptions: { type: Array, default: () => [] },
  templates: { type: Array, default: () => [] },
  defaultBaseId: { type: String, default: '' },
  defaultParentId: { type: String, default: '' },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit'])

/* ----------------------------- Form State ----------------------------- */

const form = reactive({
  // baseId 由外部传入决定，仅透传
  baseId: '',
  title: '',
  parentId: '',
  templateId: '',
})

const titleError = ref('')

/* ----------------------------- Dropdown State ----------------------------- */

const parentDropdownOpen = ref(false)
const templateDropdownOpen = ref(false)

const parentSelectRef = ref(null)
const templateSelectRef = ref(null)
const parentDropdownRef = ref(null)
const templateDropdownRef = ref(null)

const parentDropdownStyle = ref({})
const templateDropdownStyle = ref({})

const anyDropdownOpen = computed(
  () => parentDropdownOpen.value || templateDropdownOpen.value
)

/* ----------------------------- Helpers ----------------------------- */

const closeAllDropdowns = () => {
  parentDropdownOpen.value = false
  templateDropdownOpen.value = false
}

const calculateDropdownPosition = (selectEl, dropdownEl) => {
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
  if (!anyDropdownOpen.value) return
  await nextTick()

  if (parentDropdownOpen.value) {
    parentDropdownStyle.value = calculateDropdownPosition(
      parentSelectRef.value,
      parentDropdownRef.value
    )
  }

  if (templateDropdownOpen.value) {
    templateDropdownStyle.value = calculateDropdownPosition(
      templateSelectRef.value,
      templateDropdownRef.value
    )
  }
}

/* ----------------------------- Options / Lookup ----------------------------- */

const flattenParentOptions = computed(() => {
  const flatten = (options, level = 0) => {
    const result = []
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

const getParentName = (id) => {
  if (!id) return ''
  const dfs = (options) => {
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

const getTemplateName = (id) => props.templates.find(t => t.id === id)?.name || ''

/* ----------------------------- Dropdown Actions ----------------------------- */

const toggleDropdown = async (targetOpenRef) => {
  if (targetOpenRef.value) {
    targetOpenRef.value = false
    return
  }
  closeAllDropdowns()
  targetOpenRef.value = true
  await updateDropdownPositions()
}

const toggleParentDropdown = () => toggleDropdown(parentDropdownOpen)
const toggleTemplateDropdown = () => toggleDropdown(templateDropdownOpen)

const selectParent = (id) => {
  // 统一为 string，避免 null/undefined 在模板比较中造成歧义
  form.parentId = id ? String(id) : ''
  parentDropdownOpen.value = false
}

const selectTemplate = (id) => {
  form.templateId = id ? String(id) : ''
  templateDropdownOpen.value = false
}

const clearParent = () => { form.parentId = '' }
const clearTemplate = () => { form.templateId = '' }

/* ----------------------------- Validation / Submit ----------------------------- */

const validateTitle = () => {
  if (!form.title.trim()) {
    titleError.value = '请输入标题'
    return false
  }
  titleError.value = ''
  return true
}

const resetForm = () => {
  // baseId 优先使用 defaultBaseId；否则兜底 bases 的第一个
  form.baseId = props.defaultBaseId || props.bases?.[0]?.id || ''
  form.title = ''
  form.parentId = props.defaultParentId || ''
  form.templateId = ''
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

/* ----------------------------- Global Listeners ----------------------------- */

const handleClickOutside = (e) => {
  if (!props.modelValue) return
  // 点击在下拉或按钮上不关闭；其他地方关闭
  if (!e.target.closest('.fixed-dropdown') && !e.target.closest('.custom-select')) {
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

/* ----------------------------- Watches ----------------------------- */

// 开关弹窗：重置表单 + 绑定/解绑全局监听
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetForm()
      addGlobalListeners()
      // 打开时立即校正一次（避免首次打开时 style 还没对齐）
      updateDropdownPositions()
    } else {
      removeGlobalListeners()
      closeAllDropdowns()
    }
  }
)

// 关键：defaultBaseId 改变时（例如切库），如果弹窗是打开的，要同步到 form.baseId
watch(
  () => props.defaultBaseId,
  (val) => {
    if (props.modelValue && val) {
      form.baseId = val
    }
  },
  { immediate: true }
)

// 下拉开关变化时更新定位
watch([parentDropdownOpen, templateDropdownOpen], () => {
  updateDropdownPositions()
})

onUnmounted(() => {
  removeGlobalListeners()
})
</script>


<style scoped>
/* 遮罩层 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

/* 对话框容器 */
.modal-container {
  width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  background: #FFFFFF;
  border-radius: 0;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #E8E8E8;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

/* 头部 */
.modal-header {
  padding: 24px 28px;
  background: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.01em;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #F5F5F5;
  color: #1a1a1a;
}

/* 内容区 */
.modal-body {
  padding: 28px;
  background: #FFFFFF;
  overflow-y: auto;
  overflow-x: visible;
  flex: 1;
}

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
  color: var(--text-secondary);
  font-weight: 500;
}

.form-label.required::before {
  content: '* ';
  color: #f53f3f;
}

/* 输入框 */
.input-wrapper {
  position: relative;
}

.custom-input {
  width: 100%;
  padding: 10px 14px;
  background: #F7F7F7;
  border: 1px solid #E0E0E0;
  border-radius: 0;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
  outline: none;
}

.custom-input::placeholder {
  color: #999;
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
  color: var(--text-tertiary);
  pointer-events: none;
}

.error-message {
  font-size: 12px;
  color: #f53f3f;
  margin: 0;
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
  color: var(--text-primary);
  overflow: visible;
}

.select-arrow {
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
  flex-shrink: 0;
}

.custom-select.is-open .select-arrow {
  transform: rotate(180deg);
}

.select-clear {
  color: var(--text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  transition: color var(--transition-fast);
}

.select-clear:hover {
  color: var(--text-primary);
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

.template-option-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.template-name {
  font-size: 14px;
  color: var(--text-primary);
}

.template-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 底部 */
.modal-footer {
  padding: 20px 28px 24px;
  background: #FFFFFF;
  border-top: 1px solid #E8E8E8;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
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
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
