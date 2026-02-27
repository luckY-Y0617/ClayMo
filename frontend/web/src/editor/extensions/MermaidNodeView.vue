<template>
  <node-view-wrapper class="mermaid-node-view">
    <div class="mermaid-container" :class="{ 'is-editing': isEditing, 'has-error': hasError }">
      <!-- 编辑模式 -->
      <div v-if="isEditing" class="mermaid-editor">
        <div class="editor-header">
          <div class="diagram-type-select">
            <label>图表类型:</label>
            <select v-model="localDiagramType" @change="handleDiagramTypeChange">
              <option value="graph">流程图 (graph)</option>
              <option value="flowchart">流程图 (flowchart)</option>
              <option value="sequenceDiagram">时序图</option>
              <option value="classDiagram">类图</option>
              <option value="stateDiagram">状态图</option>
              <option value="entityRelationshipDiagram">ER图</option>
              <option value="gantt">甘特图</option>
              <option value="pie">饼图</option>
              <option value="mindmap">思维导图</option>
            </select>
          </div>
          <div class="editor-actions">
            <button class="btn-preview" @click="handlePreview" title="预览">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              预览
            </button>
            <button class="btn-cancel" @click="handleCancel" title="取消">
              取消
            </button>
          </div>
        </div>
        <div class="editor-content">
          <textarea
            ref="textareaRef"
            v-model="localCode"
            class="code-input"
            placeholder="输入 Mermaid 代码..."
            spellcheck="false"
          ></textarea>
        </div>
        <div class="editor-help">
          <span class="help-text">使用 <code>graph TD</code>, <code>sequenceDiagram</code> 等定义图表类型</span>
        </div>
      </div>

      <!-- 预览模式 -->
      <div v-else class="mermaid-preview" @dblclick="startEditing">
        <div class="preview-header">
          <span class="diagram-label">{{ diagramTypeLabel }}</span>
          <button class="btn-edit" @click.stop="startEditing" title="编辑">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
        <div ref="mermaidRef" class="mermaid-render">
          <!-- Mermaid 渲染容器 -->
        </div>
        <div v-if="hasError" class="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>图表渲染失败，请检查代码语法</span>
        </div>
        <div v-else-if="isRendering" class="rendering-message">
          渲染中...
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, defineProps } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import mermaid from 'mermaid'

const props = defineProps({
  ...nodeViewProps,
})

// 状态
const localCode = ref('')
const localDiagramType = ref('graph')
const isEditing = ref(false)
const hasError = ref(false)
const isRendering = ref(false)
const mermaidRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 图表类型映射
const diagramTypes: Record<string, string> = {
  graph: '流程图',
  flowchart: '流程图',
  sequenceDiagram: '时序图',
  classDiagram: '类图',
  stateDiagram: '状态图',
  entityRelationshipDiagram: 'ER图',
  gantt: '甘特图',
  pie: '饼图',
  mindmap: '思维导图',
}

const diagramTypeLabel = computed(() => {
  return diagramTypes[props.node.attrs.diagramType] || '图表'
})

// 初始化 Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
})

// 生成唯一的图表 ID
const generateChartId = () => `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// 渲染 Mermaid 图表
const renderMermaid = async () => {
  if (!mermaidRef.value) return

  isRendering.value = true
  hasError.value = false

  try {
    const code = localCode.value.trim()
    if (!code) {
      mermaidRef.value.innerHTML = '<div class="empty-chart">请输入 Mermaid 代码</div>'
      isRendering.value = false
      return
    }

    // 清理之前的渲染
    mermaidRef.value.innerHTML = ''

    // 获取图表类型
    let diagramType = localDiagramType.value

    // 尝试自动检测图表类型
    if (code.startsWith('sequenceDiagram')) {
      diagramType = 'sequenceDiagram'
    } else if (code.startsWith('classDiagram')) {
      diagramType = 'classDiagram'
    } else if (code.startsWith('stateDiagram')) {
      diagramType = 'stateDiagram'
    } else if (code.startsWith('entityRelationshipDiagram') || code.startsWith('erDiagram')) {
      diagramType = 'entityRelationshipDiagram'
    } else if (code.startsWith('gantt')) {
      diagramType = 'gantt'
    } else if (code.startsWith('pie')) {
      diagramType = 'pie'
    } else if (code.startsWith('mindmap')) {
      diagramType = 'mindmap'
    } else if (code.startsWith('graph') || code.startsWith('flowchart')) {
      diagramType = code.startsWith('flowchart') ? 'flowchart' : 'graph'
    }

    const chartId = generateChartId()

    const { svg } = await mermaid.render(chartId, code)
    mermaidRef.value.innerHTML = svg
  } catch (error) {
    console.error('Mermaid render error:', error)
    hasError.value = true
    if (mermaidRef.value) {
      mermaidRef.value.innerHTML = ''
    }
  } finally {
    isRendering.value = false
  }
}

// 开始编辑
const startEditing = () => {
  isEditing.value = true
  localCode.value = props.node.attrs.code || ''
  localDiagramType.value = props.node.attrs.diagramType || 'graph'
  hasError.value = false

  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  })
}

// 预览
const handlePreview = () => {
  // 保存更改
  props.updateAttributes({
    code: localCode.value,
    diagramType: localDiagramType.value,
    isEditing: false,
  })
  isEditing.value = false

  // 渲染图表
  nextTick(() => {
    renderMermaid()
  })
}

// 取消编辑
const handleCancel = () => {
  isEditing.value = false
  localCode.value = props.node.attrs.code || ''
  localDiagramType.value = props.node.attrs.diagramType || 'graph'
}

// 图表类型变更
const handleDiagramTypeChange = () => {
  const typeTemplates: Record<string, string> = {
    graph: `graph TD
A[开始] --> B{判断?}
B -->|是| C[执行操作]
B -->|否| D[执行其他操作]
C --> E[结束]
D --> E`,
    flowchart: `flowchart TD
A[开始] --> B{判断?}
B -->|是| C[执行操作]
B -->|否| D[执行其他操作]
C --> E[结束]
D --> E`,
    sequenceDiagram: `sequenceDiagram
 participant 用户
 participant 系统
 用户->>系统: 请求操作
 系统-->>用户: 返回结果`,
    classDiagram: `classDiagram
 class Animal {
   +name: string
   +eat()
   +sleep()
 }
 class Dog {
   +bark()
 }
 Animal <|-- Dog`,
    stateDiagram: `stateDiagram-v2
 [*] --> 状态1
 状态1 --> 状态2
 状态2 --> [*]`,
    entityRelationshipDiagram: `erDiagram
 用户 ||--o{ 订单 : "下单"
 订单 ||--|{ 商品 : "包含"`,
    gantt: `gantt
 title 项目进度
 dateFormat YYYY-MM-DD
 section 阶段1
 任务1: 2024-01-01, 7d
 任务2: 7d`,
    pie: `pie title 分布比例
 "类别A" : 40
 "类别B" : 35
 "类别C" : 25`,
    mindmap: `mindmap
  root((中心主题))
    子主题1
      分支1
      分支2
    子主题2
      分支3`,
  }

  localCode.value = typeTemplates[localDiagramType.value] || ''
}

// 监听外部代码变化（如撤销/重做）
watch(
  () => props.node.attrs.code,
  (newCode) => {
    if (!isEditing.value && newCode !== localCode.value) {
      localCode.value = newCode || ''
      renderMermaid()
    }
  }
)

watch(
  () => props.node.attrs.diagramType,
  (newType) => {
    if (!isEditing.value && newType !== localDiagramType.value) {
      localDiagramType.value = newType || 'graph'
    }
  }
)

// 初始化
onMounted(() => {
  localCode.value = props.node.attrs.code || ''
  localDiagramType.value = props.node.attrs.diagramType || 'graph'
  isEditing.value = props.node.attrs.isEditing || false

  if (!isEditing.value) {
    renderMermaid()
  }
})
</script>

<style scoped>
.mermaid-node-view {
  display: block;
  margin: 1rem 0;
}

.mermaid-container {
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mermaid-container:hover {
  border-color: rgba(0, 0, 0, 0.1);
}

.mermaid-container.is-editing {
  border-color: #3b82f6;
}

/* 编辑模式 */
.mermaid-editor {
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  gap: 12px;
}

.diagram-type-select {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diagram-type-select label {
  font-size: 13px;
  color: #666;
}

.diagram-type-select select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
}

.diagram-type-select select:focus {
  outline: none;
  border-color: #3b82f6;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.btn-preview,
.btn-cancel {
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-preview {
  background: #3b82f6;
  color: #fff;
  border: none;
}

.btn-preview:hover {
  background: #2563eb;
}

.btn-cancel {
  background: #fff;
  color: #666;
  border: 1px solid #ddd;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.editor-content {
  padding: 0;
}

.code-input {
  width: 100%;
  min-height: 200px;
  padding: 14px;
  border: none;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  background: #1e1e1e;
  color: #d4d4d4;
  resize: vertical;
  box-sizing: border-box;
}

.code-input:focus {
  outline: none;
}

.code-input::placeholder {
  color: #666;
}

.editor-help {
  padding: 8px 14px;
  background: #f5f5f5;
  border-top: 1px solid #e5e5e5;
}

.help-text {
  font-size: 12px;
  color: #888;
}

.help-text code {
  background: #e5e5e5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
}

/* 预览模式 */
.mermaid-preview {
  position: relative;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mermaid-preview:hover {
  border-color: #ccc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.diagram-label {
  font-size: 12px;
  color: #888;
  background: #f5f5f5;
  padding: 3px 8px;
  border-radius: 4px;
}

.btn-edit {
  padding: 4px 8px;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.btn-edit:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.mermaid-render {
  display: flex;
  justify-content: center;
  overflow-x: auto;
  padding: 8px 0;
}

.mermaid-render :deep(svg) {
  max-width: 100%;
  height: auto;
}

.mermaid-render :deep(.empty-chart) {
  color: #999;
  font-size: 14px;
  padding: 40px;
  text-align: center;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 13px;
  margin-top: 12px;
}

.rendering-message {
  padding: 20px;
  text-align: center;
  color: #888;
  font-size: 13px;
}

/* 错误状态 */
.mermaid-container.has-error .mermaid-preview {
  border-color: #fecaca;
}
</style>
