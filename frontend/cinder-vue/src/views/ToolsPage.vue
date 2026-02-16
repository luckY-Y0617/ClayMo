<template>
  <section class="tools-page">
    <!-- 顶部工具栏 -->
    <header class="page-toolbar">
      <div class="toolbar-left">
        <router-link to="/" class="back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          返回首页
        </router-link>
        <div class="toolbar-divider"></div>
        <div class="toolbar-title">
          <p class="lab-eyebrow">效率工具</p>
          <h1>工具台</h1>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="page-content">
      <!-- 分类标签 -->
      <div class="category-tabs">
        <button
          v-for="category in categories"
          :key="category.key"
          class="category-tab"
          :class="{ active: activeCategory === category.key }"
          @click="activeCategory = category.key"
        >
          <span class="category-icon">{{ category.icon }}</span>
          {{ category.name }}
        </button>
      </div>

      <!-- 工具网格 -->
      <div class="tools-grid">
        <div
          v-for="tool in filteredTools"
          :key="tool.id"
          class="tool-card"
          @click="openTool(tool)"
        >
          <div class="tool-icon">{{ tool.icon }}</div>
          <div class="tool-info">
            <h3>{{ tool.title }}</h3>
            <p>{{ tool.description }}</p>
          </div>
          <div class="tool-arrow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredTools.length === 0" class="empty-state">
        <div class="empty-icon">🔧</div>
        <h3>暂无相关工具</h3>
        <p>该分类下还没有工具，敬请期待。</p>
      </div>
    </main>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const categories = ref([
  { key: 'all', name: '全部', icon: '📦' },
  { key: 'image', name: '图像处理', icon: '🖼️' }
])

const activeCategory = ref('all')

// 只保留已实现的工具
const tools = ref([
  {
    id: 'image-cropper',
    title: '图片裁剪器',
    description: '快速裁剪、调整图片尺寸，支持多种预设比例',
    category: 'image',
    icon: '✂️',
    route: '/tools/image-cropper'
  },
  {
    id: 'image-montage',
    title: '图片拼贴画',
    description: '创建精美的图片拼贴画，支持自由布局和多种画布尺寸',
    category: 'image',
    icon: '🖼️',
    route: '/tools/image-montage'
  },
  {
    id: 'image-resizer',
    title: '图片批量调整',
    description: '批量压缩、缩放图片，支持按比例、宽度或高度调整',
    category: 'image',
    icon: '📐',
    route: '/tools/image-resizer'
  }
])

const filteredTools = computed(() => {
  if (activeCategory.value === 'all') {
    return tools.value
  }
  return tools.value.filter(tool => tool.category === activeCategory.value)
})

const openTool = (tool) => {
  if (tool.route) {
    router.push(tool.route)
  }
}
</script>

<style scoped>
.tools-page {
  min-height: 100vh;
  background: #FAFBFC;
  display: flex;
  flex-direction: column;
}

/* 顶部工具栏 */
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 48px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--surface-divider, rgba(226, 232, 240, 0.9));
  position: sticky;
  top: 0;
  z-index: 100;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--surface-divider, #d7e0ea);
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-secondary, #475569);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.18s ease;
}

.back-link:hover {
  border-color: #0f172a;
  color: #0f172a;
}

.toolbar-divider {
  width: 1px;
  height: 32px;
  background: var(--surface-divider, #e2e8f0);
}

.toolbar-title h1 {
  margin: 4px 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.lab-eyebrow {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-tertiary, #94a3b8);
}

/* 主内容区域 */
.page-content {
  flex: 1;
  padding: 32px 48px 48px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* 分类标签 */
.category-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.category-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--surface-divider, #d7e0ea);
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-secondary, #475569);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}

.category-tab:hover {
  border-color: #0f172a;
  color: #0f172a;
}

.category-tab.active {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}

.category-icon {
  font-size: 1rem;
}

/* 工具网格 */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border: 1px solid var(--surface-divider, rgba(226, 232, 240, 0.9));
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-card:hover {
  border-color: #0f172a;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}

.tool-icon {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-info h3 {
  margin: 0 0 6px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.tool-info p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary, #64748b);
  line-height: 1.5;
}

.tool-arrow {
  color: #cbd5e1;
  flex-shrink: 0;
  transition: all 0.18s ease;
}

.tool-card:hover .tool-arrow {
  color: #0f172a;
  transform: translateX(4px);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  margin: 0 0 8px;
}

.empty-state p {
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .page-toolbar {
    padding: 16px 24px;
  }
  
  .page-content {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .page-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;
  }
  
  .toolbar-left {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .toolbar-divider {
    display: none;
  }
  
  .page-content {
    padding: 20px 16px;
  }
  
  .tools-grid {
    grid-template-columns: 1fr;
  }
  
  .category-tabs {
    gap: 8px;
  }
  
  .category-tab {
    padding: 8px 14px;
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .toolbar-title h1 {
    font-size: 1.25rem;
  }
  
  .tool-card {
    padding: 16px 20px;
  }
  
  .tool-icon {
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
  }
}
</style>
