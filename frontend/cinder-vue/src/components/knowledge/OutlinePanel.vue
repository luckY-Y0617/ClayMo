<template>
  <div class="outline-panel">
    <div v-if="props.showHeader" class="outline-header">
      <h3>文档大纲</h3>
      <div class="header-actions">
        <el-button
          text
          size="small"
          @click="expandAll"
          title="全部展开"
        >
          <el-icon><ArrowDown /></el-icon>
        </el-button>
        <el-button
          text
          size="small"
          @click="collapseAll"
          title="全部折叠"
        >
          <el-icon><ArrowUp /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="outline-toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索标题..."
        size="small"
        clearable
        class="outline-search"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-button-group class="level-filter" size="small">
        <el-button
          :type="headingFilter === 'all' ? 'primary' : 'default'"
          @click="setHeadingFilter('all')"
        >
          全部
        </el-button>
        <el-button
          :type="headingFilter === 'h12' ? 'primary' : 'default'"
          @click="setHeadingFilter('h12')"
          title="仅显示 H1-H2"
        >
          H1-H2
        </el-button>
      </el-button-group>
    </div>

    <div class="outline-content">
      <div v-if="headings.length === 0" class="empty-outline">
        <p>暂无标题</p>
        <span class="hint">使用 # 或工具栏插入标题</span>
      </div>

      <div v-else class="outline-tree">
        <div
          v-if="filteredHeadings.length === 0"
          class="empty-outline filtered"
        >
          <p>未找到匹配的标题</p>
          <span class="hint">尝试调整搜索或级别筛选</span>
        </div>

        <OutlineItem
          v-for="heading in topLevelHeadings"
          :key="heading.id"
          :heading="heading"
          :all-headings="filteredHeadings"
          :expanded-keys="expandedKeys"
          :active-id="activeHeadingId"
          :search-keyword="searchKeyword"
          @toggle="handleToggle"
          @click="handleHeadingClick"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue'
import { ArrowDown, ArrowUp, Search } from '@element-plus/icons-vue'
// Removed: useKnowledgeEditorStore - now using inject('editorSession')
import OutlineItem from './OutlineItem.vue'

const editorSession = inject('editorSession')
const props = defineProps({
  showHeader: {
    type: Boolean,
    default: true,
  },
})

// 标题列表
const headings = ref([])
const expandedKeys = ref(new Set())
const activeHeadingId = ref(null)
const searchKeyword = ref('')
const headingFilter = ref('all') // 'all' | 'h12'

const headingMap = computed(() => {
  const map = new Map()
  headings.value.forEach((heading) => {
    map.set(heading.id, heading)
  })
  return map
})

const visibleHeadingIds = computed(() => {
  if (!headings.value.length) return new Set()

  let candidates = headings.value

  if (headingFilter.value === 'h12') {
    candidates = candidates.filter(h => h.level <= 2)
  }

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    candidates = candidates.filter(h =>
      (h.text || '').toLowerCase().includes(keyword)
    )
  }

  const visibleIds = new Set(candidates.map(h => h.id))

  // 确保包含所有祖先节点，保证层级结构完整
  candidates.forEach((heading) => {
    let parentId = heading.parentId
    while (parentId) {
      if (!visibleIds.has(parentId)) {
        visibleIds.add(parentId)
      }
      parentId = headingMap.value.get(parentId)?.parentId
    }
  })

  return visibleIds
})

const filteredHeadings = computed(() => {
  if (!visibleHeadingIds.value.size) return []
  return headings.value.filter(h => visibleHeadingIds.value.has(h.id))
})

// 获取顶级标题（用于渲染树根）
const topLevelHeadings = computed(() => {
  return filteredHeadings.value.filter(h => !h.parentId)
})

// 提取文档标题
const extractHeadings = () => {
  if (!editorSession.editor.value) {
    headings.value = []
    return
  }

  const editor = editorSession.editor.value
  const newHeadings = []
  const levelStack = []

  // 遍历文档节点，提取标题
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name.startsWith('heading')) {
      const level = node.attrs.level || 1
      const text = node.textContent
      const id = `heading-${pos}`

      while (levelStack.length && levelStack[levelStack.length - 1].level >= level) {
        levelStack.pop()
      }

      const parent = levelStack.length ? levelStack[levelStack.length - 1].id : null

      const heading = {
        id,
        level,
        text,
        pos, // 位置，用于跳转
        parentId: parent,
      }
      newHeadings.push(heading)
      levelStack.push({ id, level })
    }
  })

  headings.value = newHeadings
  updateActiveHeading()
}

// 更新当前激活的标题（跟随滚动）
const updateActiveHeading = () => {
  if (!editorSession.editor.value || headings.value.length === 0) {
    activeHeadingId.value = null
    return
  }

  const editor = editorSession.editor.value
  const { selection } = editor.state
  const currentPos = selection.$anchor.pos

  // 找到当前光标位置对应的标题
  let activeId = null
  for (let i = headings.value.length - 1; i >= 0; i--) {
    if (headings.value[i].pos <= currentPos) {
      activeId = headings.value[i].id
      break
    }
  }

  activeHeadingId.value = activeId
}

// 展开/折叠
const handleToggle = (id) => {
  if (expandedKeys.value.has(id)) {
    expandedKeys.value.delete(id)
  } else {
    expandedKeys.value.add(id)
  }
}

// 点击标题跳转
const handleHeadingClick = (heading) => {
  if (!editorSession.editor.value) return

  const editor = editorSession.editor.value
  const { pos } = heading

  // 跳转到标题位置
  editor.commands.setTextSelection(pos)
  editor.commands.scrollIntoView()

  // 更新激活状态
  activeHeadingId.value = heading.id
}

// 全部展开
const expandAll = () => {
  headings.value.forEach(h => expandedKeys.value.add(h.id))
}

// 全部折叠
const collapseAll = () => {
  expandedKeys.value.clear()
}

const setHeadingFilter = (mode) => {
  headingFilter.value = mode
  if (mode === 'h12') {
    expandAll()
  }
}

// 监听编辑器内容变化
let updateTimer = null
const scheduleUpdate = () => {
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  updateTimer = setTimeout(() => {
    extractHeadings()
  }, 300)
}

// 监听编辑器更新
watch(() => editorSession.editor, (editor) => {
  if (editor) {
    // 监听内容变化
    editor.on('update', scheduleUpdate)
    editor.on('selectionUpdate', updateActiveHeading)
    
    // 初始提取
    extractHeadings()
  }
}, { immediate: true })

// 监听滚动（用于高亮当前标题）
let scrollTimer = null
const handleScroll = () => {
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }
  scrollTimer = setTimeout(() => {
    updateActiveHeading()
  }, 100)
}

onMounted(() => {
  // 监听编辑器容器滚动
  const editorContent = document.querySelector('.editor-content')
  if (editorContent) {
    editorContent.addEventListener('scroll', handleScroll)
  }
})

onBeforeUnmount(() => {
  if (updateTimer) clearTimeout(updateTimer)
  if (scrollTimer) clearTimeout(scrollTimer)
  
  const editorContent = document.querySelector('.editor-content')
  if (editorContent) {
    editorContent.removeEventListener('scroll', handleScroll)
  }
})

watch(searchKeyword, (value) => {
  if (value) {
    expandAll()
  }
})
</script>

<style scoped>
.outline-panel {
  width: 100%;
  min-width: 0;
  background: #fffaf3;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-left: none;
}

.outline-header {
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.outline-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.outline-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px 12px;
  min-height: 0;
}

.empty-outline {
  padding: var(--space-8);
  text-align: center;
  color: var(--text-secondary);
}

.empty-outline.filtered {
  padding: var(--space-6) var(--space-4);
}

.empty-outline p {
  margin: 0 0 var(--space-2);
  font-size: 14px;
}

.empty-outline .hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.outline-tree {
  padding: var(--space-2) 0;
}

.outline-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  background: #fffaf3;
}

.outline-search :deep(.el-input__wrapper) {
  border-radius: 999px;
}

.level-filter .el-button {
  min-width: 64px;
}
</style>

