<template>
  <div
    class="outline-item"
    :class="{
      [`level-${heading.level}`]: true,
      active: heading.id === activeId,
      matched: isMatched,
    }"
    :style="{ paddingLeft: `${(heading.level - 2) * 16 + 8}px` }"
    @click="handleClick"
  >
    <div class="item-content">
      <span class="item-text" :title="heading.text">{{ heading.text || '无标题' }}</span>
      <el-icon
        v-if="hasChildren"
        class="expand-icon"
        :class="{ expanded: isExpanded }"
        @click.stop="handleToggle"
      >
        <ArrowRight />
      </el-icon>
    </div>
    
    <!-- 子标题（递归渲染） -->
    <div v-if="hasChildren && isExpanded" class="children">
      <OutlineItem
        v-for="child in children"
        :key="child.id"
        :heading="child"
        :all-headings="allHeadings"
        :expanded-keys="expandedKeys"
        :active-id="activeId"
        :search-keyword="searchKeyword"
        @toggle="$emit('toggle', $event)"
        @click="$emit('click', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  heading: {
    type: Object,
    required: true,
  },
  allHeadings: {
    type: Array,
    required: true,
  },
  expandedKeys: {
    type: Set,
    default: () => new Set(),
  },
  activeId: {
    type: String,
    default: null,
  },
  searchKeyword: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['toggle', 'click'])

// 判断是否有子标题（H2 可能有 H3 子标题，H3 没有子标题）
const hasChildren = computed(() => {
  if (!props.allHeadings.length) return false
  
  // H3 没有子标题（因为只显示 H2 和 H3）
  if (props.heading.level === 3) return false
  
  const currentIndex = props.allHeadings.findIndex(h => h.id === props.heading.id)
  if (currentIndex === -1) return false
  
  const currentLevel = props.heading.level
  // H2 查找下一个 H3 子标题
  for (let i = currentIndex + 1; i < props.allHeadings.length; i++) {
    const nextLevel = props.allHeadings[i].level
    if (nextLevel <= currentLevel) {
      // 找到了同级或更高级的标题，说明没有子标题
      return false
    }
    if (nextLevel === 3) {
      // H2 找到了 H3 子标题
      return true
    }
  }
  return false
})

// 获取子标题列表（H2 的子标题是 H3）
const children = computed(() => {
  if (!hasChildren.value || !props.allHeadings.length) return []
  
  const currentIndex = props.allHeadings.findIndex(h => h.id === props.heading.id)
  if (currentIndex === -1) return []
  
  const currentLevel = props.heading.level
  const childHeadings = []
  
  for (let i = currentIndex + 1; i < props.allHeadings.length; i++) {
    const nextHeading = props.allHeadings[i]
    if (nextHeading.level <= currentLevel) {
      // 遇到同级或更高级的标题，停止
      break
    }
    if (nextHeading.level === 3) {
      // H2 的直接子标题是 H3
      childHeadings.push(nextHeading)
    }
  }
  
  return childHeadings
})

// 是否展开
const isExpanded = computed(() => {
  return props.expandedKeys.has(props.heading.id)
})

const normalizedKeyword = computed(() => props.searchKeyword.trim().toLowerCase())

const isMatched = computed(() => {
  if (!normalizedKeyword.value) return false
  return (props.heading.text || '').toLowerCase().includes(normalizedKeyword.value)
})

// 处理点击
const handleClick = () => {
  emit('click', props.heading)
}

// 处理展开/折叠
const handleToggle = () => {
  emit('toggle', props.heading.id)
}
</script>

<style scoped>
.outline-item {
  cursor: pointer;
  user-select: none;
  transition: background-color var(--transition-fast);
  border-radius: var(--radius-sm);
  margin: 2px 0;
}

.outline-item:hover {
  background: var(--bg-primary);
}

.outline-item.active {
  background: rgba(22, 93, 255, 0.1);
  color: var(--yuque-primary);
}

.outline-item.matched:not(.active) .item-text {
  color: var(--yuque-primary);
}

.item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  min-height: 28px;
}

.item-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.outline-item.active .item-text {
  color: var(--yuque-primary);
  font-weight: 500;
}

.expand-icon {
  font-size: 12px;
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
  margin-left: 4px;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.children {
  margin-left: 0;
}

/* 不同级别的标题样式（只显示 H2 和 H3） */
.outline-item.level-2 .item-text {
  font-weight: 600;
  font-size: 13px;
}

.outline-item.level-3 .item-text {
  font-weight: 400;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>

