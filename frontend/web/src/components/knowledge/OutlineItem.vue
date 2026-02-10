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

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import { ElIcon } from 'element-plus'

interface Heading {
  id: string
  level: number
  text: string
  pos: number
  parentId?: string | null
}

interface Props {
  heading: Heading
  allHeadings: Heading[]
  expandedKeys?: Set<string>
  activeId?: string | null
  searchKeyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  expandedKeys: () => new Set(),
  activeId: null,
  searchKeyword: '',
})

const emit = defineEmits<{
  toggle: [id: string]
  click: [heading: Heading]
}>()

// 判断是否有子标题
const hasChildren = computed(() => {
  if (!props.allHeadings.length) return false
  if (props.heading.level === 3) return false
  
  const currentIndex = props.allHeadings.findIndex(h => h.id === props.heading.id)
  if (currentIndex === -1) return false
  
  const currentLevel = props.heading.level
  for (let i = currentIndex + 1; i < props.allHeadings.length; i++) {
    const nextLevel = props.allHeadings[i].level
    if (nextLevel <= currentLevel) {
      return false
    }
    if (nextLevel === 3) {
      return true
    }
  }
  return false
})

// 获取子标题列表
const children = computed(() => {
  if (!hasChildren.value || !props.allHeadings.length) return []
  
  const currentIndex = props.allHeadings.findIndex(h => h.id === props.heading.id)
  if (currentIndex === -1) return []
  
  const currentLevel = props.heading.level
  const childHeadings: Heading[] = []
  
  for (let i = currentIndex + 1; i < props.allHeadings.length; i++) {
    const nextHeading = props.allHeadings[i]
    if (nextHeading.level <= currentLevel) {
      break
    }
    if (nextHeading.level === 3) {
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
  transition: all 0.15s ease;
  border-radius: 4px;
  margin: 1px 0;
  position: relative;
}

.outline-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 0;
  background: #1a1a1a;
  border-radius: 1px;
  transition: height 0.15s ease;
}

.outline-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.outline-item.active {
  background: rgba(0, 0, 0, 0.04);
}

.outline-item.active::before {
  height: 14px;
}

.outline-item.matched:not(.active) .item-text {
  color: #1a1a1a;
  font-weight: 500;
}

.item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 12px;
  min-height: 28px;
}

.item-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #666;
  transition: color 0.15s ease;
}

.outline-item:hover .item-text {
  color: #404040;
}

.outline-item.active .item-text {
  color: #1a1a1a;
  font-weight: 600;
}

.expand-icon {
  font-size: 11px;
  color: #BFBFBF;
  transition: transform 0.15s ease, color 0.15s ease;
  margin-left: 4px;
  flex-shrink: 0;
}

.outline-item:hover .expand-icon {
  color: #8C8C8C;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.children {
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid #E8E8E8;
}

/* 不同级别的标题样式 */
.outline-item.level-1 .item-text {
  font-weight: 500;
  font-size: 13px;
  color: #404040;
}

.outline-item.level-2 .item-text {
  font-weight: 400;
  font-size: 13px;
  color: #595959;
}

.outline-item.level-3 .item-text {
  font-weight: 400;
  font-size: 12px;
  color: #8C8C8C;
}
</style>

