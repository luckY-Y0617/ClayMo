<template>
  <div class="info-panel" :class="{ collapsed }">
    <div v-if="!collapsed" class="panel-shell">
      <div class="panel-header">
        <div class="panel-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="tab-btn"
            :class="{ active: tab.value === activeTab }"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="panel-body">
        <div class="empty-panel">
          <p>此面板已不再使用</p>
          <p class="hint">评论功能已移至右侧评论面板</p>
        </div>
      </div>
    </div>

    <button
      class="panel-handle"
      :class="{ collapsed }"
      @click="$emit('toggle')"
      :title="collapsed ? '展开信息栏' : '收起信息栏'"
    >
      <el-icon>
        <component :is="collapsed ? 'ArrowLeft' : 'ArrowRight'" />
      </el-icon>
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
  comments: {
    type: Array,
    default: () => [],
  },
  commentLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'toggle',
  'comment-submit',
  'comment-refresh',
  'comment-locate',
  'comment-reply',
  'comment-like',
  'comment-delete',
])

// InfoPanel 已不再使用，保留为空组件以防其他地方引用
const tabs = []

const activeTab = ref(null)

const activeComponent = computed(() => {
  return null
})

// 暴露方法供父组件调用（兼容性保留）
defineExpose({
  switchToTab: () => {},
})
</script>

<style scoped>
.info-panel {
  position: relative;
  display: flex;
  height: 100%;
  transition: width var(--transition-normal);
  width: 320px;
}

.info-panel.collapsed {
  width: 28px;
}

.panel-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fffaf3;
  border-left: 1px solid rgba(0, 0, 0, 0.03);
}

.panel-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  gap: 4px;
  background: #fffaf3;
}

.panel-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(58, 47, 42, 0.06);
}

.tab-btn {
  border: none;
  border-radius: 999px;
  background: transparent;
  padding: 4px 10px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}

.tab-btn:hover {
  background: rgba(0, 0, 0, 0.03);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.tab-btn.active {
  background: linear-gradient(120deg, #ffe7c8, #ffeef0);
  color: #3a2f2a;
  font-weight: 600;
}

.collapse-btn {
  flex-shrink: 0;
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel-handle {
  width: 28px;
  min-width: 28px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-left: none;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.panel-handle:hover {
  background: rgba(255, 255, 255, 1);
}

.panel-handle.collapsed {
  border-left: 1px solid var(--border-color);
}

.empty-panel {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-panel p {
  margin: 8px 0;
  font-size: 14px;
}

.empty-panel .hint {
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>

