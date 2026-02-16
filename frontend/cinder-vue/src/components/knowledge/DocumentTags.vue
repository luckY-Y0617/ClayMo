<template>
  <div class="document-tags">
    <div class="tags-container">
      <!-- 显示的标签（最多5个） -->
      <div
        v-for="tag in visibleTags"
        :key="tag.id"
        class="tag-chip"
        :style="getTagStyle(tag)"
      >
        <span class="tag-name">{{ tag.name }}</span>
        <el-icon
          class="tag-close"
          @click.stop="handleRemoveTag(tag.id)"
        >
          <Close />
        </el-icon>
      </div>
      
      <!-- 更多标签折叠按钮 -->
      <div
        v-if="hasMoreTags"
        class="tag-chip more-tags"
        @click="toggleMoreTags"
      >
        <span>{{ showMoreTags ? '收起' : `+${hiddenTagsCount} 更多` }}</span>
      </div>
      
      <!-- 更多标签弹出层 -->
      <div
        v-if="showMoreTags && hasMoreTags"
        class="more-tags-popup"
        @click.stop
      >
        <div class="more-tags-list">
          <div
            v-for="tag in hiddenTags"
            :key="tag.id"
            class="tag-chip popup-tag"
            :style="getTagStyle(tag)"
            @click.stop="handleRemoveTag(tag.id)"
          >
            <span class="tag-name">{{ tag.name }}</span>
            <el-icon class="tag-close">
              <Close />
            </el-icon>
          </div>
        </div>
      </div>
      
      <!-- 内联输入模式 -->
      <div
        v-if="isEditing"
        class="inline-tag-input-wrapper"
      >
        <input
          ref="inputRef"
          v-model="inputValue"
          class="inline-tag-input"
          placeholder="输入标签名称..."
          @focus="handleInputFocus"
          @blur="handleInputBlur"
          @keydown.enter.prevent="handleEnter"
          @keydown.esc.prevent="handleEsc"
          @keydown.down.prevent="handleArrowDown"
          @keydown.up.prevent="handleArrowUp"
          @compositionstart="handleCompositionStart"
          @compositionend="handleCompositionEnd"
        />
        
        <!-- 下拉建议列表 -->
        <div
          v-if="showSuggestions"
          class="inline-tag-suggestions"
          @click.stop
        >
          <!-- 匹配到的标签 -->
          <div
            v-for="(tag, index) in suggestions"
            :key="tag.id"
            class="suggestion-item"
            :class="{ active: index === selectedIndex }"
            @mousedown.prevent="handleSelectTag(tag)"
            @mouseenter="selectedIndex = index"
          >
            <span class="suggestion-tag-name">{{ tag.name }}</span>
            <span class="suggestion-tag-count" v-if="tag.usageCount > 0">{{ tag.usageCount }}</span>
          </div>

          <!-- 创建新标签 -->
          <div
            v-if="canCreateNew"
            class="suggestion-item create-new"
            :class="{ active: selectedIndex === suggestions.length }"
            @mousedown.prevent="handleCreateNew"
            @mouseenter="selectedIndex = suggestions.length"
          >
            <span class="create-icon">+</span>
            <span>创建 "{{ inputValue.trim() }}"</span>
          </div>
        </div>
      </div>
      
      <!-- 添加标签按钮 -->
      <div
        v-else
        class="tag-chip add-tag"
        @click="handleAddTag"
      >
        <el-icon><Plus /></el-icon>
        <span>添加标签</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onUnmounted, inject } from 'vue'
import { Close, Plus } from '@element-plus/icons-vue'
import { useTagStore } from '@/stores/tag'
// Removed: useKnowledgeEditorStore - now using inject('editorSession')
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { kbApi } from '@/api/kb.api'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  documentId: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const tagStore = useTagStore()
const editorSession = inject('editorSession')
const baseStore = useKnowledgeBaseStore()

// 内联编辑状态
const isEditing = ref(false)
const inputValue = ref('')
const inputRef = ref(null)
const isFocused = ref(false)
const isComposing = ref(false)
const showSuggestions = ref(false)
const selectedIndex = ref(-1)

// 更多标签展开状态
const showMoreTags = ref(false)

// 显示标签对象列表
// 确保 modelValue 始终是 ID 数组，兼容可能的对象数组
const displayTags = computed(() => {
  if (!props.modelValue || !Array.isArray(props.modelValue)) {
    return []
  }
  
  // 将 modelValue 统一转换为 ID 数组
  const tagIds = props.modelValue.map(item => {
    // 如果已经是字符串 ID，直接返回
    if (typeof item === 'string') return item
    // 如果是对象，提取 id
    if (item && typeof item === 'object' && item.id) return item.id
    return null
  }).filter(Boolean)
  
  // 通过 ID 查找标签对象
  return tagIds
    .map(tagId => tagStore.findTagById(tagId))
    .filter(Boolean)
})

// 最多显示5个标签
const MAX_VISIBLE_TAGS = 4

// 可见标签
const visibleTags = computed(() => {
  return displayTags.value.slice(0, MAX_VISIBLE_TAGS)
})

// 隐藏的标签
const hiddenTags = computed(() => {
  return displayTags.value.slice(MAX_VISIBLE_TAGS)
})

// 是否有更多标签
const hasMoreTags = computed(() => {
  return displayTags.value.length > MAX_VISIBLE_TAGS
})

// 隐藏标签数量
const hiddenTagsCount = computed(() => {
  return hiddenTags.value.length
})

// 切换更多标签显示
const toggleMoreTags = () => {
  showMoreTags.value = !showMoreTags.value
}

// 与 TagInput 保持一致的自动配色逻辑
const TAG_COLOR_PALETTE = [
  '#FF9F7A', // 温暖橙
  '#FFCF7A', // 柔和黄
  '#7AD3FF', // 天空蓝
  '#A17AFF', // 淡紫色
  '#7AFFB0', // 薄荷绿
  '#FF7AAE', // 粉红色
]

const getAutoColor = (tag) => {
  if (!tag) return '#E5E7EB'
  if (tag.color) return tag.color

  const key = (tag.id || tag.name || '').toString()
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return TAG_COLOR_PALETTE[hash % TAG_COLOR_PALETTE.length]
}

const getTagStyle = (tag) => {
  const bg = getAutoColor(tag)
  return {
    backgroundColor: bg,
    borderColor: bg,
    color: '#ffffff',
  }
}

// 添加标签 - 进入内联编辑模式
const handleAddTag = async () => {
  isEditing.value = true
  inputValue.value = ''
  await nextTick()
  inputRef.value?.focus()
}

// 退出编辑模式
const exitEditMode = () => {
  isEditing.value = false
  inputValue.value = ''
  showSuggestions.value = false
  selectedIndex.value = -1
  showMoreTags.value = false
}

// 输入框焦点处理
const handleInputFocus = () => {
  isFocused.value = true
  updateSuggestionVisibility()
}

const handleInputBlur = () => {
  isFocused.value = false
  // 延迟关闭，允许点击下拉建议项
  setTimeout(() => {
    // 如果已经不在编辑状态（可能已经被 exitEditMode 调用），则不重复执行
    if (!isEditing.value) return
    // 如果下拉建议已关闭，则退出编辑模式
    if (!showSuggestions.value) {
      exitEditMode()
    }
  }, 200)
}

// 输入法组合状态
const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
  updateSuggestionVisibility()
}

// 键盘事件处理
const handleEnter = async () => {
  if (isComposing.value) return

  const text = inputValue.value.trim()
  if (!text) {
    exitEditMode()
    return
  }

  // 如果选中了建议列表中的标签
  if (selectedIndex.value >= 0 && selectedIndex.value < suggestions.value.length) {
    await handleSelectTag(suggestions.value[selectedIndex.value])
    return
  }

  // 如果选中了"创建新标签"选项
  if (canCreateNew.value && selectedIndex.value === suggestions.value.length) {
    await handleCreateNew()
    return
  }

  // 默认行为：创建或选择标签
  await handleAddTagByInput()
}

const handleEsc = () => {
  exitEditMode()
}

const handleArrowDown = () => {
  if (!showSuggestions.value) return
  
  const totalItems = suggestions.value.length + (canCreateNew.value ? 1 : 0)
  if (totalItems === 0) return
  
  const maxIndex = totalItems - 1
  if (selectedIndex.value < maxIndex) {
    selectedIndex.value++
  } else {
    selectedIndex.value = 0
  }
}

const handleArrowUp = () => {
  if (!showSuggestions.value) return
  
  const totalItems = suggestions.value.length + (canCreateNew.value ? 1 : 0)
  if (totalItems === 0) return
  
  const maxIndex = totalItems - 1
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  } else {
    selectedIndex.value = maxIndex
  }
}

// 移除标签
const handleRemoveTag = async (tagId) => {
  // 确保 modelValue 是 ID 数组
  const currentIds = normalizeToIds(props.modelValue)
  const newValue = currentIds.filter(id => id !== tagId)

  if (!props.documentId) {
    emit('update:modelValue', newValue)
    emit('change', newValue)
    return
  }

  try {
    await kbApi.setDocumentTags(props.documentId, newValue)
    emit('update:modelValue', newValue)
    emit('change', newValue)
    ElMessage.success('标签已移除')
  } catch (error) {
    console.error('移除标签失败:', error)
    ElMessage.error('移除标签失败')
  }
}

// 将 modelValue 标准化为 ID 数组的辅助函数
const normalizeToIds = (value) => {
  if (!value || !Array.isArray(value)) return []
  return value.map(item => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object' && item.id) return item.id
    return null
  }).filter(Boolean)
}

// 建议列表计算
const suggestions = computed(() => {
  const keyword = inputValue.value.trim().toLowerCase()

  // 没有输入时，显示按使用次数排序的标签（前5个）
  if (!keyword) {
    return (tagStore.sortedTags || []).slice(0, 5)
  }

  const allTags = tagStore.tags || []
  const currentIds = normalizeToIds(props.modelValue)

  return allTags
    .filter(tag => {
      if (!tag || !tag.id) return false

      const name = (tag.name ?? '').toString().toLowerCase()
      const slug = (tag.slug ?? '').toString().toLowerCase()
      const alreadySelected = currentIds.includes(tag.id)

      return (name.includes(keyword) || slug.includes(keyword)) && !alreadySelected
    })
    .slice(0, 8)
})

// 是否可以创建新标签
const canCreateNew = computed(() => {
  const name = inputValue.value.trim()
  if (!name) return false
  const allTags = tagStore.tags || []
  const existSame = allTags.some(t => t && t.name === name)
  return !existSame
})

// 控制下拉显示逻辑
const updateSuggestionVisibility = () => {
  if (!isFocused.value) {
    showSuggestions.value = false
    return
  }

  if (inputValue.value.trim()) {
    showSuggestions.value =
      (suggestions.value && suggestions.value.length > 0) || canCreateNew.value
  } else {
    const sorted = tagStore.sortedTags || []
    showSuggestions.value = sorted.length > 0
  }

  if (showSuggestions.value) {
    selectedIndex.value = -1
  }
}

// 监听输入变化
watch(inputValue, () => {
  if (isComposing.value) return
  updateSuggestionVisibility()
})

// 根据输入添加标签
const handleAddTagByInput = async () => {
  const tagName = inputValue.value.trim()
  if (!tagName) {
    exitEditMode()
    return
  }

  let tag = tagStore.findTagByName?.(tagName)

  if (!tag) {
    const kbId = baseStore.currentBase?.id
    if (!kbId) {
      ElMessage.error('当前知识库未初始化，无法创建标签')
      return
    }

    try {
      const color = getAutoColor({ name: tagName })
      tag = await kbApi.tag.create({
        knowledgeBaseId: kbId,
        name: tagName,
        color,
        icon: null,
      })
      tagStore.addTag(tag)
    } catch (error) {
      console.error('创建标签失败:', error)
      ElMessage.error('创建标签失败')
      return
    }
  }

  await addTagToValue(tag)
}

// 添加标签到文档
const addTagToValue = async (tag) => {
  if (!tag || !tag.id) return

  // 确保 currentIds 是 ID 数组
  const currentIds = normalizeToIds(props.modelValue)

  if (!currentIds.includes(tag.id)) {
    const newIds = [...currentIds, tag.id]
    
    if (props.documentId) {
      try {
        await kbApi.tag.setDocumentTags(props.documentId, newIds)
        emit('update:modelValue', newIds)
        emit('change', newIds)
      } catch (error) {
        console.error('添加标签失败:', error)
        ElMessage.error('添加标签失败')
        return
      }
    } else {
      emit('update:modelValue', newIds)
      emit('change', newIds)
    }
  }

  inputValue.value = ''
  exitEditMode()
}

// 选择建议标签
const handleSelectTag = async (tag) => {
  await addTagToValue(tag)
}

// 创建新标签
const handleCreateNew = async () => {
  await handleAddTagByInput()
}

// 加载标签列表（与 Editor/TagInput 保持一致）
const loadTags = async () => {
  try {
    const kbId = baseStore.currentBase?.id
    if (!kbId) return

    const res = await kbApi.tag.list(kbId, {
      filter: null,
      sorting: null,
      skipCount: 0,
      maxResultCount: 999,
    })
    const items = res.items || res.list || []
    tagStore.setTags(items)
  } catch (error) {
    console.error('加载标签失败:', error)
  }
}

// 点击外部关闭弹出层
const handleClickOutside = (event) => {
  const target = event.target
  const wrapper = document.querySelector('.document-tags')
  const popup = document.querySelector('.more-tags-popup')
  const suggestions = document.querySelector('.inline-tag-suggestions')
  
  if (wrapper && !wrapper.contains(target)) {
    if (showMoreTags.value) {
      showMoreTags.value = false
    }
    if (showSuggestions.value && !suggestions?.contains(target)) {
      showSuggestions.value = false
    }
  }
}

onMounted(() => {
  if (tagStore.tags.length === 0) {
    loadTags()
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>


<style scoped>
.document-tags {
  width: 100%;
  position: relative;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  flex: 1;
  min-width: 0;
  position: relative;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  color: #fff;
  cursor: pointer;
  user-select: none;
  border: none;
  background: #e5e7eb;
  transition: opacity var(--transition-fast) var(--ease-standard),
              transform var(--transition-fast) var(--ease-standard),
              box-shadow var(--transition-fast) var(--ease-standard),
              background-color var(--transition-fast) var(--ease-standard);
}

.tag-chip:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tag-chip:active {
  transform: translateY(0);
}

.tag-name {
  font-weight: 500;
}

.tag-close {
  width: 14px;
  height: 14px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity var(--transition-fast) var(--ease-standard),
              transform var(--transition-fast) var(--ease-standard);
}

.tag-close:hover {
  opacity: 1;
  transform: scale(1.2);
}

.tag-chip.add-tag {
  background: rgba(255, 255, 255, 0.6);
  color: var(--text-secondary);
  border: 1px dashed rgba(0, 0, 0, 0.15);
}

.tag-chip.add-tag:hover {
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-primary);
  border-color: rgba(0, 0, 0, 0.25);
}

.tag-chip.add-tag .el-icon {
  width: 14px;
  height: 14px;
}

/* 更多标签按钮 */
.tag-chip.more-tags {
  background: rgba(255, 255, 255, 0.6);
  color: var(--text-secondary);
  border: 1px dashed rgba(0, 0, 0, 0.15);
  font-weight: 500;
}

.tag-chip.more-tags:hover {
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-primary);
  border-color: rgba(0, 0, 0, 0.25);
}

/* 更多标签弹出层 */
.more-tags-popup {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 200px;
  max-width: 320px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: 8px;
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.more-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip.popup-tag {
  margin: 0;
}

/* 内联输入框样式 - 符合项目风格 */
.inline-tag-input-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.inline-tag-input {
  min-width: 140px;
  padding: 4px 10px;
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 400;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.6);
  outline: none;
  transition: all var(--transition-fast) var(--ease-standard);
  font-family: inherit;
}

.inline-tag-input:focus {
  border-color: var(--yuque-primary);
  background: rgba(255, 255, 255, 0.95);
  border-style: solid;
  box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.1);
}

.inline-tag-input::placeholder {
  color: var(--text-tertiary);
  font-weight: 400;
}

/* 下拉建议列表 - 符合项目风格 */
.inline-tag-suggestions {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  max-width: 360px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 1000;
  padding: 4px 0;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color var(--transition-fast) var(--ease-standard);
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 400;
}

.suggestion-item:hover,
.suggestion-item.active {
  background: var(--bg-primary);
}

.suggestion-item.create-new {
  color: var(--yuque-primary);
  border-top: 1px solid var(--border-color);
  font-weight: 500;
  padding-top: 10px;
  margin-top: 4px;
}

.suggestion-item.create-new .create-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  font-size: 16px;
  line-height: 1;
  font-weight: 600;
}

.suggestion-tag-name {
  flex: 1;
  font-weight: 400;
}

.suggestion-tag-count {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 8px;
  font-weight: 400;
}
</style>

