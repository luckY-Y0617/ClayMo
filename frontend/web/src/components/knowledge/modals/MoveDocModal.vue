<template>
  <BaseModal
    :model-value="modelValue"
    container-class="move-doc-modal"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- 头部 -->
    <template #header>
      <h3 class="modal-title">移动文档</h3>
      <button class="modal-close" @click="handleClose">
        <el-icon :size="16"><Close /></el-icon>
      </button>
    </template>

    <!-- 内容 -->
    <template #body>
      <div class="move-content">
        <!-- 当前文档信息 -->
        <div class="current-doc">
          <span class="current-label">当前文档：</span>
          <span class="current-title">{{ docTitle }}</span>
        </div>

        <!-- 目标位置选择 -->
        <div class="target-section">
          <label class="section-label">移动到</label>

          <!-- 知识库选择 -->
          <div class="kb-select">
            <button
              type="button"
              class="select-button"
              :class="{ 'is-open': kbDropdownOpen }"
              @click="toggleKbDropdown"
            >
              <span class="select-text">{{ selectedKbName || '选择目标知识库' }}</span>
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
            <Transition name="dropdown-fade">
              <div v-if="kbDropdownOpen" class="dropdown-menu">
                <button
                  v-for="kb in knowledgeBases"
                  :key="kb.id"
                  type="button"
                  class="dropdown-item"
                  :class="{ active: selectedKbId === kb.id }"
                  @click="selectKb(kb)"
                >
                  <span class="kb-icon">{{ kb.icon || '📚' }}</span>
                  <span class="kb-name">{{ kb.name }}</span>
                </button>
              </div>
            </Transition>
          </div>

          <!-- 父文档选择（树形） -->
          <div v-if="selectedKbId" class="parent-select">
            <div class="tree-container">
              <button
                type="button"
                class="tree-item root-item"
                :class="{ active: !selectedParentId }"
                @click="selectParent(null)"
              >
                <span class="tree-icon">📁</span>
                <span class="tree-text">根目录</span>
              </button>
              <div v-if="loading" class="tree-loading">
                <span class="loading-spinner"></span>
                <span>加载中...</span>
              </div>
              <template v-else>
                <MoveTreeNode
                  v-for="node in documentTree"
                  :key="node.id"
                  :node="node"
                  :selected-id="selectedParentId"
                  :disabled-id="docId"
                  :depth="0"
                  @select="selectParent"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 底部 -->
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!canSubmit || submitting"
        @click="handleSubmit"
      >
        <span v-if="submitting" class="btn-loading">
          <el-icon class="is-loading" :size="14"><Loading /></el-icon>
        </span>
        <span v-else>确认移动</span>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Close, Loading } from '@element-plus/icons-vue'
import BaseModal from './BaseModal.vue'
import MoveTreeNode from './MoveTreeNode.vue'

interface KnowledgeBase {
  id: string
  name: string
  icon?: string
}

interface DocumentNode {
  id: string
  title: string
  children?: DocumentNode[]
}

interface Props {
  modelValue: boolean
  docId: string
  docTitle: string
  currentKbId: string
  currentParentId?: string
  knowledgeBases: KnowledgeBase[]
  submitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  docId: '',
  docTitle: '',
  currentKbId: '',
  currentParentId: '',
  knowledgeBases: () => [],
  submitting: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: { targetKbId: string; targetParentId: string | null }]
  loadTree: [kbId: string]
}>()

// State
const selectedKbId = ref('')
const selectedParentId = ref<string | null>(null)
const kbDropdownOpen = ref(false)
const loading = ref(false)
const documentTree = ref<DocumentNode[]>([])

// Computed
const selectedKbName = computed(() => {
  const kb = props.knowledgeBases.find((k) => k.id === selectedKbId.value)
  return kb?.name || ''
})

const canSubmit = computed(() => {
  if (!selectedKbId.value) return false
  // 如果在同一个知识库且父文档未改变，不允许提交
  if (
    selectedKbId.value === props.currentKbId &&
    selectedParentId.value === (props.currentParentId || null)
  ) {
    return false
  }
  return true
})

// Methods
const toggleKbDropdown = () => {
  kbDropdownOpen.value = !kbDropdownOpen.value
}

const selectKb = async (kb: KnowledgeBase) => {
  selectedKbId.value = kb.id
  selectedParentId.value = null
  kbDropdownOpen.value = false

  // 加载文档树
  loading.value = true
  emit('loadTree', kb.id)
}

const selectParent = (id: string | null) => {
  // 不能选择自己或自己的子文档
  if (id === props.docId) return
  selectedParentId.value = id
}

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleSubmit = () => {
  if (!canSubmit.value) return
  emit('submit', {
    targetKbId: selectedKbId.value,
    targetParentId: selectedParentId.value,
  })
}

const resetState = () => {
  selectedKbId.value = props.currentKbId
  selectedParentId.value = props.currentParentId || null
  kbDropdownOpen.value = false
  loading.value = false
  documentTree.value = []
}

// 外部调用：设置文档树
const setDocumentTree = (tree: DocumentNode[]) => {
  documentTree.value = tree
  loading.value = false
}

// 点击外部关闭下拉
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.kb-select')) {
    kbDropdownOpen.value = false
  }
}

// Watch
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetState()
      document.addEventListener('click', handleClickOutside)
      // 如果有当前知识库，加载其文档树
      if (props.currentKbId) {
        loading.value = true
        emit('loadTree', props.currentKbId)
      }
    } else {
      document.removeEventListener('click', handleClickOutside)
    }
  }
)

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Expose
defineExpose({
  setDocumentTree,
})
</script>

<style scoped>
/* 移动内容 */
.move-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.current-doc {
  padding: 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-label {
  font-size: 14px;
  color: #6b7280;
}

.current-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 目标选择区 */
.target-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

/* 知识库选择器 */
.kb-select {
  position: relative;
}

.select-button {
  width: 100%;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
}

.select-button:hover {
  border-color: #9ca3af;
}

.select-button.is-open {
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}

.select-arrow {
  color: #9ca3af;
  transition: transform 0.2s ease;
}

.select-button.is-open .select-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.dropdown-item {
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-item.active {
  background: #4f46e5;
  color: #fff;
}

.kb-icon {
  font-size: 16px;
}

/* 父文档树 */
.parent-select {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.tree-container {
  padding: 8px;
}

.tree-item {
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.tree-item:hover {
  background: #e5e7eb;
}

.tree-item.active {
  background: #4f46e5;
  color: #fff;
}

.tree-icon {
  font-size: 14px;
}

.tree-loading {
  padding: 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #E0E0E0;
  border-top-color: #999;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
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

