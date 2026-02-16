<template>
  <div class="tag-input-wrapper">
    <div class="tag-list">
      <!-- 已选标签 -->
      <el-tag
        v-for="tag in selectedTags"
        :key="tag.id"
        :style="getTagStyle(tag)"
        closable
        @close="handleRemoveTag(tag.id)"
        class="tag-item"
      >
        {{ tag.name }}
      </el-tag>

      <!-- 输入框 -->
      <el-input
        v-model="inputValue"
        ref="inputRef"
        class="tag-input"
        :placeholder="placeholder"
        size="small"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown.enter.prevent="handleEnter"
        @keydown.down.prevent="handleArrowDown"
        @keydown.up.prevent="handleArrowUp"
        @keydown.esc.prevent="handleEsc"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
      />
    </div>

    <!-- 自动补全下拉列表 -->
    <div
      v-if="showSuggestions"
      class="tag-suggestions"
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
        <span class="tag-name">{{ tag.name }}</span>
        <span class="tag-count" v-if="tag.usageCount > 0">{{ tag.usageCount }}</span>
      </div>

      <!-- 创建新标签 -->
      <div
        v-if="canCreateNew"
        class="suggestion-item create-new"
        @mousedown.prevent="handleCreateNew"
      >
        <el-icon><Plus /></el-icon>
        <span>创建 "{{ inputValue.trim() }}"</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useTagStore } from '@/stores/tag'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { kbApi } from '@/api/kb.api'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    // 允许父组件传 id 或 Tag 对象，内部统一转成 id
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: '输入标签名称，按回车添加',
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const tagStore = useTagStore()
const baseStore = useKnowledgeBaseStore()

// =================== 通用工具 ===================

// 把 modelValue 里的元素统一转成 id（兼容 string 或 { id }）
const toId = (x) => {
  if (!x) return null
  if (typeof x === 'string') return x
  if (typeof x === 'object' && x.id) return x.id
  return null
}

// 统一的“当前标签 id 列表”视图：永远是 string[]
const currentIds = computed(() => {
  return props.modelValue
    .map(toId)
    .filter(Boolean)
})

// 为没有自定义颜色的标签生成稳定的背景色
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

// =================== 输入相关状态 ===================

const inputValue = ref('')
const inputRef = ref(null)
const isFocused = ref(false)
const isComposing = ref(false)

// 下拉相关状态
const showSuggestions = ref(false)
const selectedIndex = ref(-1)

// 已选中的标签对象（根据 currentIds 映射）
const selectedTags = computed(() => {
  return currentIds.value
    .map(id => tagStore.findTagById?.(id))
    .filter(Boolean)
})

// 根据输入内容 & 所有标签计算建议列表（安全 toLowerCase）
const suggestions = computed(() => {
  const keyword = inputValue.value.trim().toLowerCase()

  // 没有输入时，显示按使用次数排序的标签（前5个）
  if (!keyword) {
    return (tagStore.sortedTags || []).slice(0, 5)
  }

  const allTags = tagStore.tags || []

  return allTags
    .filter(tag => {
      if (!tag || !tag.id) return false

      const name = (tag.name ?? '').toString().toLowerCase()
      const slug = (tag.slug ?? '').toString().toLowerCase()
      const alreadySelected = currentIds.value.includes(tag.id)

      return (name.includes(keyword) || slug.includes(keyword)) && !alreadySelected
    })
    .slice(0, 8)
})

// 是否可以创建新标签（输入不空 & 没有同名标签）
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

// =================== 交互逻辑 ===================

const handleFocus = () => {
  isFocused.value = true
  updateSuggestionVisibility()
}

const handleBlur = () => {
  isFocused.value = false
  setTimeout(() => {
    showSuggestions.value = false
    selectedIndex.value = -1
  }, 150)
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
  updateSuggestionVisibility()
}

const handleEnter = async () => {
  if (isComposing.value) return

  const text = inputValue.value.trim()
  if (!text) return

  if (
    selectedIndex.value >= 0 &&
    selectedIndex.value < suggestions.value.length
  ) {
    await handleSelectTag(suggestions.value[selectedIndex.value])
    return
  }

  await handleAddTagByInput()
}

const handleEsc = () => {
  showSuggestions.value = false
  selectedIndex.value = -1
}

const handleArrowDown = () => {
  if (!showSuggestions.value || suggestions.value.length === 0) return
  if (selectedIndex.value < suggestions.value.length - 1) {
    selectedIndex.value++
  } else {
    selectedIndex.value = 0
  }
}

const handleArrowUp = () => {
  if (!showSuggestions.value || suggestions.value.length === 0) return
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  } else {
    selectedIndex.value = suggestions.value.length - 1
  }
}

// =================== 标签添加/删除核心 ===================

// 根据当前输入添加标签（可能走“找不到先创建”的分支）
const handleAddTagByInput = async () => {
  const tagName = inputValue.value.trim()
  if (!tagName) return

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

// ✅ 核心：始终基于 currentIds，emit 纯 id 数组
const addTagToValue = async (tag) => {
  if (!tag || !tag.id) return

  const ids = currentIds.value

  if (!ids.includes(tag.id)) {
    const newIds = [...ids, tag.id]
    emit('update:modelValue', newIds)
    emit('change', newIds)
  }

  inputValue.value = ''
  updateSuggestionVisibility()
}

// 点击建议标签
const handleSelectTag = async (tag) => {
  await addTagToValue(tag)
}

// 创建新标签按钮
const handleCreateNew = async () => {
  await handleAddTagByInput()
}

// 删除已选标签：同样基于 currentIds 来算，再 emit 纯 id 数组
const handleRemoveTag = (tagId) => {
  const ids = currentIds.value.filter(id => id !== tagId)
  emit('update:modelValue', ids)
  emit('change', ids)
}

// =================== 初始化标签列表 ===================

const loadTags = async () => {
  const kbId = baseStore.currentBase?.id
  if (!kbId) return

  try {
    const result = await kbApi.tag.list(kbId, {
      filter: null,
      sorting: null,
      skipCount: 0,
      maxResultCount: 999,
    })
    const items = result.items || result.list || []
    tagStore.setTags(items)
    updateSuggestionVisibility()
  } catch (error) {
    console.error('加载标签失败:', error)
  }
}

if (baseStore.currentBase?.id) {
  loadTags()
}
</script>

<style scoped>
.tag-input-wrapper {
  position: relative;
  width: 100%;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  min-height: 40px;
}

.tag-item {
  margin: 0;
  color: #fff;
  border: none;
}

.tag-input {
  flex: 1;
  min-width: 120px;
  border: none;
  background: transparent;
}

.tag-input :deep(.el-input__wrapper) {
  box-shadow: none;
  background: transparent;
}

.tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  max-height: 220px;
  overflow-y: auto;
  z-index: 1000;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.suggestion-item:hover,
.suggestion-item.active {
  background: var(--bg-primary);
}

.suggestion-item.create-new {
  color: var(--yuque-primary);
  border-top: 1px solid var(--border-color);
}

.tag-name {
  flex: 1;
  font-size: 14px;
}

.tag-count {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 8px;
}
</style>
