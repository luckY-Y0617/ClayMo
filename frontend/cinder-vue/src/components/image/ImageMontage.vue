<template>
  <section class="montage-lab">
    <div class="montage-stage">
      <div class="stage-preview">
        <div class="stage-toolbar">
          <div class="stage-meta">
            <p>画布</p>
            <strong>{{ canvasWidth }} × {{ canvasHeight }}</strong>
          </div>
          <div class="stage-actions">
            <button class="btn btn-ghost" type="button" @click="selectImages">
              添加图片
            </button>
            <button class="btn btn-ghost" type="button" @click="clearImages">
              清空
            </button>
            <button class="btn btn-primary" type="button" @click="exportImage">
              导出 PNG
            </button>
          </div>
        </div>
        <div 
          class="canvas-shell" 
          ref="canvasContainer"
          :style="canvasShellStyle"
        >
          <!-- 显示容器：固定高度，宽度自适应 -->
          <div 
            class="canvas-viewport" 
            :style="canvasViewportStyle"
          >
            <!-- 画布容器：使用实际画布尺寸，通过 scale 缩放 -->
            <div 
              class="canvas-wrapper" 
              :style="canvasWrapperStyle"
              @mousedown="handleCanvasAreaMouseDown" 
              @click="handleCanvasAreaClick"
            >
              <!-- 背景 Canvas -->
              <canvas 
                ref="canvas" 
                class="canvas-bg"
                :width="canvasWidth" 
                :height="canvasHeight"
              ></canvas>

              <!-- 图片元素 -->
              <div 
                v-for="(item, index) in canvasItems" 
                :key="index"
                :class="[
                  'canvas-item',
                  {
                    selected: selectedCanvasItemIndex === index,
                    'is-resizing': isResizing && dragItemIndex === index,
                    'is-dragging': isDragging && dragItemIndex === index
                  }
                ]"
                :style="getItemStyle(item)"
                @mousedown="startItemDrag(index, $event)"
                @click="handleCanvasItemClick(index, $event)"
              >
                <img :src="item.image.url" :alt="item.image.name" />

                <div v-if="selectedCanvasItemIndex === index" class="resize-handles">
                  <div 
                    class="resize-handle resize-handle-nw" 
                    :class="{ 'is-active': isHandleActive(index, 'nw') }"
                    @mousedown.stop="startResize(index, 'nw', $event)"
                  ></div>
                  <div 
                    class="resize-handle resize-handle-ne" 
                    :class="{ 'is-active': isHandleActive(index, 'ne') }"
                    @mousedown.stop="startResize(index, 'ne', $event)"
                  ></div>
                  <div 
                    class="resize-handle resize-handle-sw" 
                    :class="{ 'is-active': isHandleActive(index, 'sw') }"
                    @mousedown.stop="startResize(index, 'sw', $event)"
                  ></div>
                  <div 
                    class="resize-handle resize-handle-se" 
                    :class="{ 'is-active': isHandleActive(index, 'se') }"
                    @mousedown.stop="startResize(index, 'se', $event)"
                  ></div>
                </div>

                <div class="item-controls">
                  <button @click.stop="removeCanvasItem(index)" class="control-btn remove">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="stage-panel" draggable="false">
        <div class="panel-card">
          <div class="panel-card__head">
            <h3>图片列表</h3>
            <span>{{ images.length }} 张</span>
          </div>
          <div class="panel-card__body">
            <div class="image-stack">
              <div 
                v-for="(image, index) in images" 
                :key="index"
                class="image-token"
                :class="{ 
                  'selected': selectedImageIndex === index,
                  'on-canvas': isImageOnCanvas(image)
                }"
                @click="selectImage(index)"
              >
                <div class="token-thumb">
                  <img :src="image.url" :alt="image.name" draggable="false" />
                </div>
                <div class="token-meta">
                  <p :title="image.name">{{ truncateFileName(image.name) }}</p>
                  <span>{{ image.width }} × {{ image.height }}</span>
                </div>
                <button class="token-remove" type="button" @click.stop="removeImage(index)">
                  ✕
                </button>
              </div>
              <button class="image-token image-token--ghost" type="button" @click="selectImages">
                <div class="token-thumb ghost">
                  <span>+</span>
                </div>
                <div class="token-meta">
                  <p>添加图片</p>
                  <span>支持批量</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card__head">
            <h3>属性调整</h3>
          </div>
          <div class="panel-card__body">
            <div class="property-block canvas-size-block">
              <label>画布尺寸</label>
              <el-select 
                v-model="selectedCanvasSize" 
                @change="updateCanvasSize" 
                class="canvas-size-select"
                placeholder="选择画布尺寸"
              >
                <el-option label="自定义" value="custom" />
                <el-option label="1560 × 1440" value="1560x1440" />
                <el-option label="1920 × 1080 (全高清)" value="1920x1080" />
                <el-option label="1080 × 1080 (正方形)" value="1080x1080" />
                <el-option label="1200 × 800" value="1200x800" />
                <el-option label="1024 × 768" value="1024x768" />
                <el-option label="800 × 600" value="800x600" />
              </el-select>
              <transition name="slide-fade">
                <div v-if="selectedCanvasSize === 'custom'" class="custom-size">
                  <div class="custom-input-wrapper">
                    <input 
                      type="number" 
                      v-model.number="customWidth" 
                      @input="updateCustomSize"
                      placeholder="宽度" 
                      min="100"
                      max="4000"
                      class="custom-input"
                    />
                    <span class="custom-separator">×</span>
                    <input 
                      type="number" 
                      v-model.number="customHeight" 
                      @input="updateCustomSize"
                      placeholder="高度" 
                      min="100"
                      max="4000"
                      class="custom-input"
                    />
                  </div>
                </div>
              </transition>
            </div>

            <transition name="fade" mode="out-in">
              <div v-if="selectedCanvasItemIndex === -1" key="no-selection" class="no-selection">
                <div class="no-selection-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M9 9h6v6H9z" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <p>未选中任何图片</p>
              </div>

              <div v-else key="properties" class="property-stack">
                <div class="property-block">
                  <label>尺寸 (画布像素)</label>
                  <div class="field-grid">
                    <div class="field">
                      <span>宽</span>
                      <input 
                        type="number" 
                        :value="selectedItemActualSize.width.toFixed(1)" 
                        @input="updateItemActualSize('width', $event)"
                        step="0.1"
                      />
                    </div>
                    <div class="field">
                      <span>高</span>
                      <input 
                        type="number" 
                        :value="selectedItemActualSize.height.toFixed(1)" 
                        @input="updateItemActualSize('height', $event)"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>

                <div class="property-block">
                  <label>旋转 & 透明度</label>
                  <div class="field-grid">
                    <div class="field slider">
                      <input 
                        type="range" 
                        min="0" 
                        max="360" 
                        v-model.number="selectedItem.rotation" 
                        @input="updateSelectedItem"
                      />
                      <span>{{ Math.round(selectedItem.rotation) }}°</span>
                    </div>
                    <div class="field slider">
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        v-model.number="selectedItem.opacity" 
                        @input="updateSelectedItem"
                      />
                      <span>{{ Math.round(selectedItem.opacity * 100) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" multiple @change="handleFileSelect" style="display: none">
  </section>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useMontageViewport } from '@/composables/useMontageViewport.js'
  import { useMontageState } from '@/composables/useMontageState.js'
  import { useMontageInteractions } from '@/composables/useMontageInteractions.js'
  import { useMontageExport } from '@/composables/useMontageExport.js'
  
  // refs
  const fileInput = ref(null)
  const canvas = ref(null)
  const canvasContainer = ref(null)

  // 画布尺寸 refs（传入 state & viewport）
  const canvasWidth = ref(1560)
  const canvasHeight = ref(1440)
  
  // 视口：容器高度、canvasAreaStyle、canvasScale
  const viewport = useMontageViewport({
    canvasContainer,
    canvasWidth,
    canvasHeight
  })
  
  // state：图片库 + items + 选择态 + clamp + 尺寸更新
  const state = useMontageState({
    canvasWidth,
    canvasHeight
  })
  
  // interactions：拖拽/缩放/点击误触/删除键 + 全局监听
  const interactions = useMontageInteractions(state, { canvasScale: viewport.canvasScale })
  
  // export
  const { exportImage } = useMontageExport(state)
  
  // 文件选择
  const selectImages = () => fileInput.value?.click()
  
  const handleFileSelect = (event) => {
    const files = event?.target?.files
    if (files) state.addImages(Array.from(files))
    if (event?.target) event.target.value = ''
  }
  
  /**
   * 下面这些是为了 template 直接用（对齐你原先变量名）
   */
  // 响应式数据
  const images = state.images
  const canvasItems = state.canvasItems
  const selectedImageIndex = state.selectedImageIndex
  const selectedCanvasItemIndex = state.selectedCanvasItemIndex
  
  // 画布尺寸相关
  const selectedCanvasSize = state.selectedCanvasSize
  const customWidth = state.customWidth
  const customHeight = state.customHeight
  
  // viewport 样式
  const canvasShellStyle = viewport.canvasShellStyle
  const canvasScale = viewport.canvasScale
  
  // 显示容器样式：显示区域的大小
  const canvasViewportStyle = computed(() => {
    const scale = canvasScale.value.y // 使用 y 轴缩放（高度固定）
    const displayWidth = canvasWidth.value * scale
    const displayHeight = canvasHeight.value * scale
    
    return {
      width: `${displayWidth}px`,
      height: `${displayHeight}px`,
    }
  })
  
  // 画布包装器样式：实际画布尺寸 + scale 变换
  const canvasWrapperStyle = computed(() => {
    const scale = canvasScale.value.y // 使用统一的 scale
    
    return {
      width: `${canvasWidth.value}px`,
      height: `${canvasHeight.value}px`,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }
  })
  
  // computed
  const selectedItem = state.selectedItem
  const selectedItemActualSize = state.selectedItemActualSize
  
  // methods：图片库
  const removeImage = state.removeImage
  const clearImages = state.clearImages
  const truncateFileName = state.truncateFileName
  const selectImage = state.selectImage
  const isImageOnCanvas = state.isImageOnCanvas
  
  // methods：canvas items
  const getItemStyle = state.getItemStyle
  const removeCanvasItem = state.removeCanvasItem
  const updateSelectedItem = state.updateSelectedItem
  const updateItemActualSize = state.updateItemActualSize
  
  // methods：画布尺寸
  const updateCanvasSize = () => {
    state.updateCanvasSize()
    // 同步本地 refs（可选：你也可以直接在 state 内部用传入的 canvasWidth/canvasHeight）
    canvasWidth.value = state.canvasWidth.value
    canvasHeight.value = state.canvasHeight.value
  }
  const updateCustomSize = () => {
    state.updateCustomSize()
    canvasWidth.value = state.canvasWidth.value
    canvasHeight.value = state.canvasHeight.value
  }
  
  // interactions 对齐旧命名
  const isDragging = interactions.isDragging
  const isResizing = interactions.isResizing
  const dragItemIndex = interactions.dragItemIndex
  const isHandleActive = interactions.isHandleActive
  const handleCanvasAreaMouseDown = interactions.handleCanvasAreaMouseDown
  const handleCanvasAreaClick = interactions.handleCanvasAreaClick
  const handleCanvasItemClick = interactions.handleCanvasItemClick
  const startItemDrag = interactions.startItemDrag
  const startResize = interactions.startResize
  </script>
  

<style scoped>
.montage-lab {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 32px;
  height: calc(100vh - 200px);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 0.9rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.btn svg {
  width: 18px;
  height: 18px;
}

.btn-primary {
  background: var(--primary-500, #3b82f6);
  color: #fff;
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.2);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 32px rgba(59, 130, 246, 0.25);
}

.btn-ghost {
  background: rgba(15, 23, 42, 0.04);
  color: var(--text-primary, #0f172a);
}

.btn-ghost:hover {
  background: rgba(15, 23, 42, 0.08);
}

.montage-stage {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr);
  gap: 0;
  border: 1px solid var(--surface-divider, #e2e8f0);
  border-radius: 28px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
  background: #fff;
  overflow: hidden;
  height: 100%;
}

.stage-preview,
.stage-panel {
  background: #fff;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.stage-preview {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  max-height: 100vh;
  overflow: hidden;
}

.stage-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.stage-meta p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-tertiary, #94a3b8);
}

.stage-meta strong {
  font-size: 1.25rem;
  color: var(--text-primary, #0f172a);
}

.stage-actions {
  display: flex;
  gap: 10px;
}

/* 容器外壳：居中显示 */
.canvas-shell {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 24px;
  min-height: 0;
  /* 移除 overflow: hidden 避免切掉边框 */
  padding: 16px;
  background: var(--surface-subtle, #f8fafc);
}

/* 显示视口：显示区域的边界框 */
.canvas-viewport {
  position: relative;
  overflow: hidden;
  border: 2px solid #cbd5f5; /* 明显的深色边界线 */
  background: white;
  border-radius: 4px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  /* 使用 content-box 确保边框在外部，不占用画布空间 */
  box-sizing: content-box;
}

/* 画布包装器：实际画布尺寸，通过 scale 缩放 */
.canvas-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  will-change: transform;
}

/* 背景 Canvas */
.canvas-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
  background: white;
}

.canvas-item {
  position: absolute;
  cursor: move;
  border: 2px solid transparent;
  box-sizing: border-box; /* 确保选中边框不超出限制 */
  transition: border-color 0.2s ease, box-shadow 0.25s ease, transform 0.18s ease;
  top: 0;
  left: 0;
  will-change: transform, width, height;
}

.canvas-item.selected {
  border-color: var(--primary-500, #3b82f6);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.18);
}

.canvas-item.selected::after {
  content: '';
  position: absolute;
  inset: -8px;
  border: 1px dashed rgba(59, 130, 246, 0.45);
  border-radius: 14px;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.98);
  transition: opacity 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
}

.canvas-item.selected.is-dragging::after,
.canvas-item.selected.is-resizing::after {
  opacity: 1;
  transform: scale(1.01);
  border-color: rgba(59, 130, 246, 0.75);
}

.canvas-item.is-dragging,
.canvas-item.is-resizing {
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.35);
}

.canvas-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  border-radius: 8px;
}

.resize-handles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #93c5fd, #2563eb);
  border: 4px solid white;
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.45);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
  pointer-events: auto;
  z-index: 10;
}

/* 增加触摸/点击的热区 */
.resize-handle::after {
  content: '';
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  pointer-events: auto;
}

.resize-handle::before {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 1.5px solid rgba(96, 165, 250, 0.3);
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.resize-handle:hover {
  transform: scale(1.15);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.55);
  background: linear-gradient(135deg, #bfdbfe, #3b82f6);
}

.resize-handle.is-active {
  transform: scale(1.25);
  background: linear-gradient(135deg, #dbeafe, #1d4ed8);
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.65);
}

.resize-handle.is-active::before {
  opacity: 1;
  transform: scale(1);
}

.resize-handle-nw {
  top: -14px;
  left: -14px;
  cursor: nw-resize;
}

.resize-handle-ne {
  top: -14px;
  right: -14px;
  cursor: ne-resize;
}

.resize-handle-sw {
  bottom: -14px;
  left: -14px;
  cursor: sw-resize;
}

.resize-handle-se {
  bottom: -14px;
  right: -14px;
  cursor: se-resize;
}

.item-controls {
  position: absolute;
  top: -32px;
  right: 0;
}

.control-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(15, 23, 42, 0.75);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.control-btn:hover {
  opacity: 0.85;
}

.stage-panel {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-left: none;
  min-height: 0;
  max-height: 100vh;
  overflow-y: auto;
  background: var(--surface-subtle, #f8fafc);
  user-select: none;
  -webkit-user-drag: none;
  -moz-user-select: none;
  -ms-user-select: none;
  position: relative;
}

.stage-panel > .panel-card:first-child {
  flex: 0 0 auto;
  min-height: 0;
  max-height: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stage-panel > .panel-card:first-child .panel-card__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stage-panel > .panel-card:nth-child(2) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.stage-panel > .panel-card:nth-child(2) .panel-card__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.stage-panel > .panel-card:nth-child(2) .panel-card__body::-webkit-scrollbar {
  width: 6px;
}

.stage-panel > .panel-card:nth-child(2) .panel-card__body::-webkit-scrollbar-track {
  background: transparent;
}

.stage-panel > .panel-card:nth-child(2) .panel-card__body::-webkit-scrollbar-thumb {
  background: var(--surface-divider, #e2e8f0);
  border-radius: 3px;
}

.stage-panel > .panel-card:nth-child(2) .panel-card__body::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary, #94a3b8);
}

.stage-panel * {
  -webkit-user-drag: none;
  user-select: text;
}

.stage-panel img {
  -webkit-user-drag: none;
  pointer-events: none;
}

.stage-panel input,
.stage-panel select,
.stage-panel textarea,
.stage-panel button {
  user-select: auto;
  -webkit-user-select: auto;
  pointer-events: auto;
}

.panel-card {
  border: 1px solid var(--surface-divider, #e2e8f0);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fff;
}

.panel-card__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.panel-card__head h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary, #0f172a);
}

.panel-card__head span {
  font-size: 0.85rem;
  color: var(--text-tertiary, #94a3b8);
}

.panel-card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.canvas-size-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.canvas-size-block label {
  font-weight: 500;
  color: var(--text-primary, #0f172a);
  font-size: 0.9rem;
}

.canvas-size-select {
  width: 100%;
}

:deep(.canvas-size-select .el-input__wrapper) {
  border: 2px solid #94a3b8;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: none;
  padding: 0 14px;
  min-height: 44px;
  transition: border-color 0.2s ease;
}

:deep(.canvas-size-select .el-input__wrapper:hover) {
  border-color: #64748b;
  box-shadow: none;
}

:deep(.canvas-size-select.is-focus .el-input__wrapper) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:deep(.canvas-size-select .el-input__inner) {
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 500;
  height: 44px;
  line-height: 44px;
}

:deep(.canvas-size-select .el-select__placeholder) {
  color: #94a3b8;
  font-size: 0.9rem;
}

.custom-size {
  margin-top: 10px;
  padding: 12px;
  background: linear-gradient(135deg, #f8faff 0%, #f1f5f9 100%);
  border-radius: 10px;
  border: 1px solid var(--primary-100, #dbeafe);
}

.custom-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.custom-input {
  flex: 1;
  padding: 11px 14px;
  border-radius: 8px;
  border: 1px solid var(--surface-divider, #e2e8f0);
  background: #ffffff;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary, #0f172a);
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

.custom-input:hover {
  border: 1px solid var(--primary-400, #60a5fa);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.custom-input:focus {
  outline: none;
  border: 1px solid var(--primary-500, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 2px 4px rgba(59, 130, 246, 0.15);
}

.custom-input::placeholder {
  color: var(--text-tertiary, #94a3b8);
  font-weight: 400;
}

.custom-separator {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--primary-500, #3b82f6);
  flex-shrink: 0;
  padding: 0 4px;
}

/* 过渡动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.image-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.image-token {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--surface-divider, #e2e8f0);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  position: relative;
}

.image-token.selected {
  border-color: var(--primary-500, #3b82f6);
  background: rgba(59, 130, 246, 0.08);
}

.image-token.on-canvas:not(.selected) {
  border-color: #10b981;
}

.image-token--ghost {
  justify-content: flex-start;
  background: transparent;
}

.token-thumb {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  overflow: hidden;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.token-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.token-thumb.ghost span {
  font-size: 32px;
  color: var(--text-tertiary, #94a3b8);
}

.token-meta p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary, #0f172a);
}

.token-meta span {
  font-size: 0.75rem;
  color: var(--text-tertiary, #94a3b8);
}

.token-remove {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--text-tertiary, #94a3b8);
  cursor: pointer;
  font-size: 14px;
}

.token-remove:hover {
  color: var(--text-primary, #0f172a);
}

.property-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.property-block {
  margin-bottom: 0;
}

.property-block label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary, #475569);
  margin-bottom: 8px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px;
}

.field span {
  font-size: 0.75rem;
  color: var(--text-tertiary, #94a3b8);
}

.field input[type="number"] {
  border: 1px solid transparent;
  background: transparent;
  font-size: 0.95rem;
  text-align: center;
  padding: 4px 6px;
  height: 28px;
}

.field input[type="number"]:focus {
  outline: none;
  border-color: var(--primary-500, #3b82f6);
  border-radius: 8px;
  background: #fff;
}

.field.slider {
  flex-direction: row;
  align-items: center;
  gap: 12px;
  background: transparent;
  padding: 0;
}

.field.slider input[type="range"] {
  flex: 1;
}

.field.slider span {
  min-width: 48px;
  text-align: right;
  font-size: 0.9rem;
  color: var(--text-secondary, #475569);
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  color: var(--text-tertiary, #94a3b8);
}

.no-selection-icon {
  width: 56px;
  height: 56px;
  color: var(--surface-divider, #e2e8f0);
}

.no-selection-icon svg {
  width: 100%;
  height: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1200px) {
  .montage-stage {
    grid-template-columns: 1fr;
  }

  .stage-panel {
    padding: 20px;
    border-left: none;
    border-top: none;
    background: var(--surface-subtle, #f8fafc);
  }
}

@media (max-width: 768px) {
  .montage-lab {
    padding: 20px 16px;
    border-radius: 24px;
  }

  .stage-preview,
  .stage-panel {
    padding: 20px;
  }

  .stage-actions {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .canvas-shell {
    padding: 12px;
    min-height: 420px;
  }
}
</style>