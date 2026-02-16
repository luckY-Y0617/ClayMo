<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container kb-modal-container" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">移动文档</h3>
            <button class="modal-close" @click="handleClose">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <p>请选择目标父文档（留空表示移动到根目录）：</p>
            <div class="custom-select-wrapper" style="margin-top:8px;">
              <button ref="selectRef" type="button" class="custom-select" :class="{ 'is-open': dropdownOpen }" @click="toggleDropdown">
                <span class="select-text">{{ getSelectedName || '请选择父文档' }}</span>
                <svg v-if="localTargetId" class="select-clear" width="14" height="14" viewBox="0 0 14 14" fill="none" @click.stop="clearSelection">
                  <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <svg class="select-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>

              <Teleport to="body">
                <Transition name="dropdown-fade">
                  <div v-if="dropdownOpen" ref="dropdownRef" class="custom-dropdown fixed-dropdown" :style="dropdownStyle">
                    <button type="button" class="dropdown-option" :class="{ active: !localTargetId }" @click="selectParent('')">根目录</button>
                    <template v-for="opt in flattenedOptionsWithLevel" :key="opt.id">
                      <button type="button" class="dropdown-option" :class="{ active: localTargetId === opt.id }" :style="{ paddingLeft: `${12 + opt.level * 16}px` }" @click="selectParent(opt.id)">{{ opt.title }}</button>
                    </template>
                  </div>
                </Transition>
              </Teleport>
            </div>
          </div>

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
              <span v-else>移动</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  documents: {
    type: Array,
    default: () => [],
  },
  sourceId: {
    type: [String, null],
    default: null,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])

const localTargetId = ref('')

// 计算排除 source 及其子孙后的选项
// produce flattened options with level for indentation
const flattenedOptionsWithLevel = computed(() => {
  const res = []
  const excludeIds = new Set()

  const findSource = (nodes, id) => {
    if (!Array.isArray(nodes)) return null
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children) {
        const found = findSource(n.children, id)
        if (found) return found
      }
    }
    return null
  }

  const collectDescendants = (n) => {
    excludeIds.add(n.id)
    if (n.children && n.children.length) {
      n.children.forEach(collectDescendants)
    }
  }

  if (props.sourceId) {
    const src = findSource(props.documents || [], props.sourceId)
    if (src) collectDescendants(src)
  }

  const walk = (nodes, depth = 0) => {
    if (!Array.isArray(nodes)) return
    for (const n of nodes) {
      if (excludeIds.has(n.id)) continue
      res.push({
        id: n.id,
        title: n.title,
        level: depth,
      })
      if (n.children && n.children.length) {
        walk(n.children, depth + 1)
      }
    }
  }

  walk(props.documents || [])
  return res
})

// (no redundant flattened options kept; use flattenedOptionsWithLevel for rendering)

// dropdown state for custom select
const selectRef = ref(null)
const dropdownRef = ref(null)
const dropdownOpen = ref(false)
const dropdownStyle = ref({})

const getSelectedName = computed(() => {
  if (!localTargetId.value) return ''
  const found = flattenedOptionsWithLevel.value.find((o) => o.id === localTargetId.value)
  return found ? found.title : ''
})

const calculateDropdownPosition = (selectEl, dropdownEl) => {
  if (!selectEl || !dropdownEl) return {}
  const rect = selectEl.getBoundingClientRect()
  const width = rect.width
  let left = rect.left
  let top = rect.bottom + 6
  if (left + width > window.innerWidth - 20) {
    left = window.innerWidth - width - 20
  }
  if (top + dropdownEl.getBoundingClientRect().height > window.innerHeight - 20) {
    top = rect.top - dropdownEl.getBoundingClientRect().height - 6
  }
  return { top: `${top}px`, left: `${left}px`, width: `${width}px` }
}

const updateDropdownPositions = async () => {
  await nextTick()
  if (!dropdownOpen.value) return
  dropdownStyle.value = calculateDropdownPosition(selectRef.value, dropdownRef.value)
}

const addDropdownListeners = () => {
  window.addEventListener('resize', updateDropdownPositions)
  window.addEventListener('scroll', updateDropdownPositions, true)
  // use capture so we detect outside clicks before other handlers
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('keydown', handleKeydown)
}

const removeDropdownListeners = () => {
  window.removeEventListener('resize', updateDropdownPositions)
  window.removeEventListener('scroll', updateDropdownPositions, true)
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('keydown', handleKeydown)
}

const toggleDropdown = async () => {
  dropdownOpen.value = !dropdownOpen.value
  if (dropdownOpen.value) {
    await updateDropdownPositions()
    addDropdownListeners()
  } else {
    removeDropdownListeners()
  }
}

const selectParent = (id) => {
  localTargetId.value = id ? String(id) : ''
  dropdownOpen.value = false
  removeDropdownListeners()
}

const clearSelection = () => { localTargetId.value = '' }

const handleClickOutside = (e) => {
  if (!dropdownOpen.value) return
  try {
    const path = e.composedPath ? e.composedPath() : (e.path || [])
    // if click happened inside dropdown or select button, ignore
    if (selectRef.value && path.includes(selectRef.value)) return
    if (dropdownRef.value && path.includes(dropdownRef.value)) return
    // otherwise close
    dropdownOpen.value = false
    removeDropdownListeners()
  } catch (err) {
    // fallback to closest checks
    if (!(e.target && e.target.closest && (e.target.closest('.fixed-dropdown') || e.target.closest('.custom-select')))) {
      dropdownOpen.value = false
      removeDropdownListeners()
    }
  }
}

onUnmounted(() => {
  removeDropdownListeners()
})

const handleKeydown = (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    if (dropdownOpen.value) {
      dropdownOpen.value = false
      removeDropdownListeners()
    }
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const handleSubmit = () => {
  emit('submit', { parentId: localTargetId.value || null })
}

watch(() => props.modelValue, (v) => {
  if (!v) {
    localTargetId.value = ''
    // ensure dropdown closed and listeners removed when modal closes
    dropdownOpen.value = false
    removeDropdownListeners()
  }
})
</script>

<style scoped>
/* Modal Styles */
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

.modal-body {
  padding: 28px;
  background: #FFFFFF;
  overflow-y: auto;
  overflow-x: visible;
  flex: 1;
}

.modal-footer {
  padding: 20px 28px 24px;
  background: #FFFFFF;
  border-top: 1px solid #E8E8E8;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Button Styles */
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

/* Custom Select/Dropdown Styles */
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

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Animations */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 800px) {
  .modal-container {
    width: 100%;
    border-radius: 10px;
  }
}
</style>



