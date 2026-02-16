<template>
  <div class="resizer-lab">
    <!-- 空状态：简洁的工具界面 -->
    <section v-if="imageList.length === 0" class="resizer-stage">
      <div class="stage-toolbar">
        <div class="toolbar-group">
          <button class="chip chip-filled" type="button" @click="selectImage">
            + 添加图片
          </button>
          </div>
        <div class="toolbar-progress">
          <p>已选择 0 张</p>
          <span>等待添加图片</span>
        </div>
        <div class="toolbar-actions">
          <button class="chip chip-filled" type="button" disabled>
            批量处理
          </button>
          <button class="chip chip-filled" type="button" disabled>
            批量下载
          </button>
        </div>
      </div>

      <div class="stage-body">
        <aside class="stage-panel">
          <div class="panel-header">
            <p class="lab-eyebrow">批量设置</p>
            <span>0 张</span>
          </div>

          <div class="control-group">
            <label class="control-label">缩放模式</label>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" name="emptyResizeMode" value="percentage" v-model="resizeMode" />
                <span>按比例</span>
              </label>
              <label class="radio-item">
                <input type="radio" name="emptyResizeMode" value="width" v-model="resizeMode" />
                <span>按宽度</span>
              </label>
              <label class="radio-item">
                <input type="radio" name="emptyResizeMode" value="height" v-model="resizeMode" />
                <span>按高度</span>
              </label>
            </div>
          </div>

          <div class="control-group" v-if="resizeMode === 'percentage'">
            <label class="control-label">
              缩放比例
              <span class="unit">(%)</span>
            </label>
            <input
              type="number"
              v-model.number="scalePercentage"
              :min="1"
              :max="500"
              class="size-input"
              placeholder="请输入比例"
            />
          </div>
          <div class="control-group" v-else>
            <label class="control-label">
              目标 {{ resizeMode === 'width' ? '宽度' : '高度' }}
              <span class="unit">(px)</span>
            </label>
            <input
              type="number"
              v-model.number="targetSize"
              :min="1"
              class="size-input"
              placeholder="请输入尺寸"
            />
          </div>

          <div class="control-group">
            <label class="control-label">图片质量</label>
            <div class="quality-control">
              <input
                type="range"
                v-model.number="quality"
                min="0.1"
                max="1"
                step="0.1"
                class="quality-slider"
              />
              <span class="quality-value">{{ Math.round(quality * 100) }}%</span>
            </div>
          </div>

          <div class="control-group">
            <label class="control-label">输出设置</label>
            <div class="folder-selector">
              <button
                @click="selectOutputFolder"
                class="btn-folder-select"
                :class="{ selected: selectedFolderHandle }"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>{{ selectedFolderName || '选择输出文件夹' }}</span>
                <button
                  v-if="selectedFolderHandle"
                  @click.stop="clearFolderSelection"
                  class="btn-clear-folder"
                  title="清除选择"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" />
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" />
                  </svg>
                </button>
              </button>
              <p v-if="!isFileSystemSupported" class="folder-hint">
                <small>浏览器不支持文件夹选择，将使用默认下载</small>
              </p>
            </div>
          </div>
        </aside>

        <div class="stage-content">
          <header class="content-head">
            <div>
              <p class="lab-eyebrow">图片列表</p>
              <h3>等待添加</h3>
        </div>
      </header>

        <div
          class="empty-dropzone"
          :class="{ 'is-drag-over': isDragOver }"
          @click="selectImage"
          @keydown.enter.prevent="selectImage"
          @keydown.space.prevent="selectImage"
          @dragover.prevent="handleDragOver"
          @dragenter.prevent="handleDragEnter"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
          tabindex="0"
          role="button"
        >
            <div class="dropzone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
          </div>
            <h4>点击或拖拽图片到此处</h4>
            <p>支持 JPG、PNG、GIF、WebP 格式，可批量选择</p>
            <button class="upload-btn" type="button" @click.stop="selectImage">
              选择图片
            </button>
        </div>
        </div>
      </div>

      <input ref="fileInput" type="file" accept="image/*" multiple @change="handleFileSelect" style="display: none" />
    </section>

    <section v-else class="resizer-stage resizer-stage--batch">
      <div class="stage-toolbar">
        <div class="toolbar-group">
          <button class="chip chip-outline" type="button" @click="resetAll">
            重新选择
          </button>
          <button class="chip chip-outline" type="button" @click="addMoreImages">
            添加图片
          </button>
        </div>
        <div class="toolbar-progress">
          <p>已选择 {{ imageList.length }} 张</p>
          <span>{{ processedCount }} 已处理</span>
        </div>
        <div class="toolbar-actions">
          <button class="chip chip-filled" type="button" @click="batchProcess" :disabled="processing">
            {{ processing ? `处理中... (${processedCount}/${imageList.length})` : '批量处理' }}
          </button>
          <button class="chip chip-filled" type="button" @click="batchDownload" :disabled="!allProcessed || downloading">
            {{ downloading ? '下载中...' : '批量下载' }}
          </button>
        </div>
      </div>

      <div class="stage-body">
        <aside class="stage-panel">
          <div class="panel-header">
            <p class="lab-eyebrow">批量设置</p>
            <span>{{ imageList.length }} 张</span>
          </div>

          <div class="control-group">
            <label class="control-label">缩放模式</label>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" name="batchResizeMode" value="percentage" v-model="resizeMode" />
                <span>按比例</span>
              </label>
              <label class="radio-item">
                <input type="radio" name="batchResizeMode" value="width" v-model="resizeMode" />
                <span>按宽度</span>
              </label>
              <label class="radio-item">
                <input type="radio" name="batchResizeMode" value="height" v-model="resizeMode" />
                <span>按高度</span>
              </label>
            </div>
          </div>

          <div class="control-group" v-if="resizeMode === 'percentage'">
            <label class="control-label">
              缩放比例
              <span class="unit">(%)</span>
            </label>
            <input
              type="number"
              v-model.number="scalePercentage"
              :min="1"
              :max="500"
              class="size-input"
              placeholder="请输入比例"
            />
          </div>
          <div class="control-group" v-else>
            <label class="control-label">
              目标 {{ resizeMode === 'width' ? '宽度' : '高度' }}
              <span class="unit">(px)</span>
            </label>
            <input
              type="number"
              v-model.number="targetSize"
              :min="1"
              class="size-input"
              placeholder="请输入尺寸"
            />
          </div>

          <div class="control-group">
            <label class="control-label">图片质量</label>
            <div class="quality-control">
              <input
                type="range"
                v-model.number="quality"
                min="0.1"
                max="1"
                step="0.1"
                class="quality-slider"
              />
              <span class="quality-value">{{ Math.round(quality * 100) }}%</span>
            </div>
          </div>

          <div class="control-group">
            <label class="control-label">输出设置</label>
            <div class="folder-selector">
              <button
                @click="selectOutputFolder"
                class="btn-folder-select"
                :class="{ selected: selectedFolderHandle }"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>{{ selectedFolderName || '选择输出文件夹' }}</span>
                <button
                  v-if="selectedFolderHandle"
                  @click.stop="clearFolderSelection"
                  class="btn-clear-folder"
                  title="清除选择"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" />
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" />
                  </svg>
                </button>
              </button>
              <p v-if="!isFileSystemSupported" class="folder-hint">
                <small>浏览器不支持文件夹选择，将使用默认下载</small>
              </p>
            </div>
          </div>
        </aside>

        <div class="stage-content">
          <header class="content-head">
            <div>
              <p class="lab-eyebrow">图片列表</p>
              <h3>当前 {{ imageList.length }} 张</h3>
            </div>
            <span>{{ processedCount }} / {{ imageList.length }} 已处理</span>
          </header>

          <div class="image-list">
            <article
              v-for="(item, index) in imageList"
              :key="index"
              class="image-row"
              :class="{ 'is-processed': item.processed, 'is-processing': item.processing }"
            >
              <div class="row-thumb">
                <img :src="item.preview" :alt="item.name" />
                <div v-if="item.processing" class="processing-overlay">
                  <div class="spinner"></div>
                </div>
                <div v-if="item.processed" class="processed-badge">✓</div>
              </div>
              <div class="row-info">
                <p class="row-name">{{ item.name }}</p>
                <p class="row-meta">
                  <span v-if="item.originalSize">{{ item.originalSize.width }} × {{ item.originalSize.height }} px</span>
                  <span v-if="item.resizedSize" class="row-meta__result">
                    → {{ item.resizedSize.width }} × {{ item.resizedSize.height }} px
                  </span>
                </p>
              </div>
              <div class="row-actions">
                <button
                  v-if="item.processed"
                  class="btn-icon-small"
                  type="button"
                  @click="downloadSingle(item)"
                  title="下载"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" />
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" />
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" />
                  </svg>
                </button>
                <button class="btn-icon-small" type="button" @click="removeImage(index)" title="移除">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" />
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" />
                  </svg>
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useBatchImageInput } from '@/composables/useBatchImageInput'
  import { useBatchResizeProcessor } from '@/composables/useBatchResizeProcessor'
  import { useBatchDownload } from '@/composables/useBatchDownload'
  
  const imageList = ref([])
  
  const {
    resizeMode,
    targetSize,
    scalePercentage,
    quality,
    processing,
    processedCount,
    allProcessed,
    batchProcess,
  } = useBatchResizeProcessor(imageList)
  
  const {
    fileInput,
    isDragOver,
    selectImage,
    addMoreImages,
    handleFileSelect,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    resetInput,
  } = useBatchImageInput({ imageList, processedCount })
  
  const {
    selectedFolderHandle,
    selectedFolderName,
    isFileSystemSupported,
    downloading,
    selectOutputFolder,
    clearFolderSelection,
    downloadSingle,
    batchDownload,
  } = useBatchDownload(imageList)
  
  const isEmptyState = computed(() => imageList.value.length === 0)
  
  const removeImage = (index) => {
    const [removed] = imageList.value.splice(index, 1)
    if (removed?.processed) processedCount.value--
  }
  
  const resetAll = () => resetInput()
  </script>
  

  <style scoped>
    @import '@/assets/styles/design-system.css';
    
    .resizer-lab {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    
    .lab-eyebrow {
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--text-tertiary, #94a3b8);
    }
    
    /* 主舞台区域 - 添加卡片样式 */
    .resizer-stage {
      display: flex;
      flex-direction: column;
      gap: 0;
      border-radius: 28px;
      border: 1px solid var(--surface-divider, rgba(226, 232, 240, 0.9));
      background: var(--surface-card, #fffdfb);
      box-shadow: 0 24px 72px rgba(15, 23, 42, 0.12);
      overflow: hidden;
    }
    
    /* 工具栏 - 深色头部 */
    .stage-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      padding: 18px 28px;
      background: #0f172a;
      border-bottom: none;
    }
    
    .toolbar-group,
    .toolbar-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .toolbar-progress {
      flex: 1;
      min-width: 160px;
      text-align: center;
    }
    
    .toolbar-progress span {
      display: block;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.5);
    }
    
    .toolbar-progress p {
      margin: 0 0 2px;
      font-weight: 700;
      font-size: 1.1rem;
      color: #fff;
    }
    
    .chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 20px;
      border-radius: 999px;
      border: 1px solid transparent;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.18s ease;
    }
    
    .chip-filled {
      background: #fff;
      color: #0f172a;
      border: none;
    }
    
    .chip-filled:hover {
      background: #f1f5f9;
    }
    
    .chip-filled:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    
    .chip-outline {
      background: transparent;
      color: #fff;
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    .chip-outline:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
    }
    
    /* 主体区域 */
    .stage-body {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 0;
      align-items: stretch;
    }
    
    /* 左侧面板 */
    .stage-panel {
      border-right: 1px solid var(--surface-divider, rgba(226, 232, 240, 0.9));
      padding: 24px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--surface-divider, #e2e8f0);
    }
    
    .panel-header span {
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }
    
    /* 右侧内容区 */
    .stage-content {
      padding: 24px 28px;
      background: var(--surface-base, #fffaf3);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    
    .content-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .content-head h3 {
      margin: 4px 0 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
    }
    
    .content-head span {
      font-size: 0.9rem;
      color: var(--text-secondary, #64748b);
    }
    
    /* 空状态拖拽区域 */
    .empty-dropzone {
      flex: 1;
      min-height: 400px;
      border-radius: 20px;
      border: 2px dashed #cbd5e1;
      background: radial-gradient(circle at 0% 0%, #fefce8 0, #f5f3ff 45%, #e0f2fe 100%);
      text-align: center;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
      justify-content: center;
      transition: border 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
    }
    
    .empty-dropzone:hover {
      border-color: #3b82f6;
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.12);
    }
    
    .empty-dropzone.is-drag-over {
      border-color: #3b82f6;
      background: radial-gradient(circle at 0% 0%, #dbeafe 0, #ede9fe 45%, #cffafe 100%);
      box-shadow: 0 12px 32px rgba(59, 130, 246, 0.2);
    }
    
    .dropzone-icon {
      color: #94a3b8;
      opacity: 0.7;
    }
    
    .empty-dropzone h4 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #0f172a;
    }
    
    .empty-dropzone p {
      margin: 0;
      font-size: 0.9rem;
      color: #64748b;
    }
    
    .upload-btn {
      margin-top: 8px;
      padding: 12px 28px;
      border-radius: 999px;
      border: none;
      background: #0f172a;
      color: #fff;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
    }
    
    .upload-btn:hover {
      background: #1e293b;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.25);
    }
    
    
    .image-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 520px;
      overflow-y: auto;
      padding-right: 6px;
    }
    
    /* 自定义滚动条 */
    .image-list::-webkit-scrollbar {
      width: 6px;
    }
    
    .image-list::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 3px;
    }
    
    .image-list::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }
    
    .image-list::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
    
    .image-row {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr) auto;
      gap: 18px;
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid #e2e8f0;
      background: #fff;
      align-items: center;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }
    
    .image-row:hover {
      border-color: #0f172a;
      background: #fafbfc;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    }
    
    .image-row.is-processed {
      border-color: #10b981;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(16, 185, 129, 0.08) 100%);
    }
    
    .image-row.is-processing {
      border-color: #f59e0b;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(245, 158, 11, 0.08) 100%);
    }
    
    .row-thumb {
      position: relative;
      width: 72px;
      height: 72px;
      border-radius: 14px;
      overflow: hidden;
      background: #0f172a;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
    }
    
    .row-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .processing-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
    }
    
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255, 255, 255, 0.25);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    
    .processed-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #10b981;
      color: #fff;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
    }
    
    .row-info {
      min-width: 0;
    }
    
    .row-name {
      margin: 0 0 6px;
      font-weight: 600;
      font-size: 0.95rem;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .row-meta {
      margin: 0;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 0.85rem;
      color: #64748b;
    }
    
    .row-meta__result {
      color: #10b981;
      font-weight: 600;
    }
    
    .row-actions {
      display: flex;
      gap: 8px;
    }
    
    .btn-icon-small {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      cursor: pointer;
      transition: all 0.18s ease;
    }
    
    .btn-icon-small:hover {
      border-color: #0f172a;
      color: #0f172a;
      background: #f8fafc;
    }
    
    .stage-canvas {
      min-height: 480px;
    }
    
    .preview-wrapper {
      flex: 1;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at top, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.98));
      border-radius: 22px;
      overflow: hidden;
    }
    
    .preview-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 16px;
      box-shadow: 0 24px 72px rgba(0, 0, 0, 0.5);
    }
    
    .preview-placeholder {
      color: #94a3b8;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 14px;
      align-items: center;
    }
    
    .preview-placeholder p {
      margin: 0;
      font-size: 0.95rem;
    }
    
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid #e2e8f0;
    }
    
    .control-label {
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .unit {
      color: #94a3b8;
      font-weight: 400;
      margin-left: 4px;
    }
    
    .radio-group {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    
    .radio-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 0.85rem;
      color: #64748b;
      background: #f1f5f9;
      cursor: pointer;
      transition: all 0.18s ease;
    }
    
    .radio-item:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    
    .radio-item input[type="radio"] {
      accent-color: #0f172a;
    }
    
    .radio-item:has(input:checked) {
      background: #0f172a;
      color: #fff;
    }
    
    .size-input {
      width: 100%;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #fff;
      color: #0f172a;
      font-size: 0.95rem;
      font-weight: 500;
      transition: all 0.18s ease;
    }
    
    .size-input:focus {
      outline: none;
      border-color: #0f172a;
      box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
    }
    
    .input-wrapper {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .input-actions {
      display: flex;
      gap: 6px;
    }
    
    .btn-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #64748b;
      transition: all 0.18s ease;
    }
    
    .btn-icon:hover {
      border-color: #0f172a;
      color: #0f172a;
      background: #f8fafc;
    }
    
    .input-hint {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 0;
    }
    
    .preset-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .preset-btn {
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 8px 16px;
      background: #fff;
      color: #64748b;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.18s ease;
    }
    
    .preset-btn:hover {
      border-color: #0f172a;
      color: #0f172a;
      background: #f8fafc;
    }
    
    .quality-control {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    
    .quality-slider {
      flex: 1;
      height: 6px;
      accent-color: #0f172a;
      cursor: pointer;
    }
    
    .quality-value {
      min-width: 48px;
      padding: 6px 12px;
      text-align: center;
      font-weight: 700;
      font-size: 0.9rem;
      background: #0f172a;
      color: #fff;
      border-radius: 8px;
    }
    
    .stats-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px 16px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    
    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }
    
    .stat-label {
      color: #64748b;
    }
    
    .stat-value {
      font-weight: 600;
      color: #0f172a;
    }
    
    .folder-selector {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .btn-folder-select {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #fff;
      color: #0f172a;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.18s ease;
    }
    
    .btn-folder-select:hover {
      border-color: #0f172a;
      background: #f8fafc;
    }
    
    .btn-folder-select.selected {
      border-color: #0f172a;
      background: #0f172a;
      color: #fff;
    }
    
    .btn-folder-select span {
      flex: 1;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .btn-clear-folder {
      width: 22px;
      height: 22px;
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      transition: color 0.18s ease;
    }
    
    .btn-clear-folder:hover {
      color: #fff;
    }
    
    .folder-hint {
      margin: 0;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    
    @media (max-width: 1200px) {
      .stage-body {
        grid-template-columns: 1fr;
      }
    
      .stage-panel {
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
      }
    
      .resizer-stage--batch .stage-body {
        grid-template-columns: 1fr;
      }
      
      .resizer-stage--batch .stage-panel {
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
      }
    }
    
    @media (max-width: 768px) {
      .resizer-stage {
        border-radius: 20px;
      }
    
      .stage-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        padding: 16px 20px;
      }
      
      .toolbar-group,
      .toolbar-actions {
        justify-content: center;
      }
    
      .toolbar-progress {
        order: -1;
        min-width: auto;
      }
    
      .stage-content,
      .stage-panel {
        padding: 20px;
      }
      
      .control-group {
        padding: 14px;
        border-radius: 14px;
      }
    
      .image-row {
        grid-template-columns: 56px minmax(0, 1fr);
        padding: 12px;
        border-radius: 14px;
      }
    
      .row-thumb {
        width: 56px;
        height: 56px;
        border-radius: 12px;
      }
    
      .row-actions {
        grid-column: span 2;
        justify-content: flex-end;
        margin-top: 8px;
      }
      
      .empty-dropzone {
        min-height: 320px;
        border-radius: 16px;
      }
    }
    
    @media (max-width: 480px) {
      .chip {
        padding: 8px 14px;
        font-size: 0.85rem;
      }
      
      .toolbar-group,
      .toolbar-actions {
        width: 100%;
      }
      
      .chip {
        flex: 1;
        justify-content: center;
      }
    }
    </style>
    
    

