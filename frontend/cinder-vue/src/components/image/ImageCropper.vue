<template>
  <section class="cropper-lab">
    <div class="cropper-stage">
      <input ref="fileInput" type="file" accept="image/*" @change="handleFileSelect" style="display: none">

      <div class="stage-preview">
        <header class="stage-toolbar">
          <div>
            <p class="lab-eyebrow">实时预览</p>
            <h3>{{ outputSize.width.toFixed(0) }} × {{ outputSize.height.toFixed(0) }} px</h3>
            <p class="stage-meta">
              原图 {{ imageElement?.naturalWidth || 0 }} × {{ imageElement?.naturalHeight || 0 }} px
            </p>
          </div>
          <div class="stage-actions">
            <button class="btn ghost" @click="selectImage">更换图片</button>
            <button class="btn ghost" @click="resetImage">重置视图</button>
            <button class="btn primary" @click="confirmCrop">导出裁剪</button>
          </div>
        </header>

        <div
          class="canvas-shell"
          ref="imageWrapper"
          @mousedown="startImageDrag"
          @dragover.prevent="handleDragOver"
          @dragenter.prevent="handleDragEnter"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <img
            ref="imageElement"
            :src="imageSrc"
            @load="onImageLoad"
            :style="imageStyle"
            class="crop-image"
            draggable="false"
          />

          <div
            class="crop-box"
            v-if="imageLoaded && imageSrc"
            :style="cropBoxStyle"
            @mousedown="startCropDrag"
          >
            <div class="crop-border"></div>

            <!-- 关键修复：四个角手柄必须带 crop-handle，避免 startCropDrag 抢事件 -->
            <div
              class="crop-corner crop-corner-nw crop-handle"
              @mousedown.stop="startResize('nw', $event)"
            ></div>
            <div
              class="crop-corner crop-corner-ne crop-handle"
              @mousedown.stop="startResize('ne', $event)"
            ></div>
            <div
              class="crop-corner crop-corner-sw crop-handle"
              @mousedown.stop="startResize('sw', $event)"
            ></div>
            <div
              class="crop-corner crop-corner-se crop-handle"
              @mousedown.stop="startResize('se', $event)"
            ></div>
          </div>
        </div>
      </div>

      <aside class="stage-panel">
        <section class="panel-card panel-card--form">
          <header>
            <p class="lab-eyebrow">输出尺寸</p>
            <h4>精准输入</h4>
          </header>

          <div class="dim-grid">
            <label>
              <span>宽度 (px)</span>
              <input
                ref="widthInputRef"
                :value="widthInputValue"
                @input="handleWidthInput"
                @blur="handleWidthBlur"
                @focus="handleWidthFocus"
                type="number"
                min="1"
                max="4096"
                step="1"
              >
            </label>

            <label>
              <span>高度 (px)</span>
              <input
                ref="heightInputRef"
                :value="heightInputValue"
                @input="handleHeightInput"
                @blur="handleHeightBlur"
                @focus="handleHeightFocus"
                type="number"
                min="1"
                max="4096"
                step="1"
              >
            </label>
          </div>

          <div class="preset-tags">
            <button
              v-for="preset in sizePresets"
              :key="preset.name"
              class="chip"
              @click="setCropSize(preset.size)"
            >
              {{ preset.name }}
            </button>
          </div>

          <div class="panel-divider"></div>

          <div class="panel-subhead">
            <div>
              <p class="lab-eyebrow">宽高比</p>
              <h4>一键切换</h4>
            </div>
          </div>

          <div class="ratio-buttons tight">
            <button
              @click="setAspectRatio(4/3)"
              :class="['ratio-btn', { active: aspectRatio === 4/3 }]"
            >
              4 : 3
            </button>
            <button
              @click="setAspectRatio(16/9)"
              :class="['ratio-btn', { active: aspectRatio === 16/9 }]"
            >
              16 : 9
            </button>
            <button
              @click="setAspectRatio(null)"
              :class="['ratio-btn', { active: aspectRatio === null }]"
            >
              自由
            </button>
          </div>
        </section>

        <section class="panel-card panel-card--form">
          <header>
            <p class="lab-eyebrow">输出位置</p>
            <h4>文件夹/本地</h4>
          </header>

          <div class="folder-selector">
            <button
              @click="selectOutputFolder"
              class="btn-folder-select"
              :class="{ selected: selectedFolderHandle }"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>{{ selectedFolderName || '选择输出文件夹' }}</span>

              <button
                v-if="selectedFolderHandle"
                @click.stop="clearFolderSelection"
                class="btn-clear-folder"
                title="清除选择"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </button>

            <p v-if="!isFileSystemSupported" class="folder-hint">
              浏览器暂不支持文件夹写入，导出时将触发下载。
            </p>
          </div>

          <div class="panel-divider subtle"></div>

          <div class="panel-actions inline">
            <button class="btn ghost" @click="resetImage">重置视图</button>
            <button class="btn primary" @click="confirmCrop">导出裁剪</button>
          </div>
        </section>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useImageLoader } from '@/composables/useImageLoader.js'
import { useImageCropper } from '@/composables/useImageCropper.js'
import { useCanvasExport } from '@/composables/useCanvasExport.js'
import { useDirectorySave } from '@/composables/useDirectorySave.js'

const emit = defineEmits(['crop'])

// DOM refs
const imageElement = ref(null)
const imageWrapper = ref(null)
const fileInput = ref(null)
const widthInputRef = ref(null)
const heightInputRef = ref(null)

// 预设尺寸（模板在用）
const sizePresets = ref([
  { name: '854×1440', size: { width: 854, height: 1440 } },
  { name: '1280×1440', size: { width: 1280, height: 1440 } },
  { name: '2560×1440', size: { width: 2560, height: 1440 } },
])

// 1) 图片加载（imageSrc + 拖拽上传 + input change）
const {
  imageSrc,
  isDragOver,
  selectImage,
  handleFileSelect,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop
} = useImageLoader({ fileInput })

// 2) 裁剪（几何 + 交互 + 全局 mousemove/mouseup）
const cropper = useImageCropper({
  imageElement,
  imageWrapper,
  enableImageDrag: false // 要支持拖动图片就改 true；并建议把 @mousedown 绑到 img 上
})

// 为了不动 template：把 cropper 中的字段/方法铺平
const {
  imageLoaded,
  imageStyle,
  cropBoxStyle,
  outputSize,
  aspectRatio,

  onImageLoad,
  resetImage,

  startCropDrag,
  startResize,
  startImageDrag,

  widthInputValue,
  heightInputValue,
  handleWidthInput,
  handleWidthBlur,
  handleWidthFocus,
  handleHeightInput,
  handleHeightBlur,
  handleHeightFocus,

  setCropSize,
  setAspectRatio
} = cropper

// 3) 导出（纯裁剪输出）
const { exportCroppedImage } = useCanvasExport()

// 4) 保存（目录写入 + 下载兜底）
const {
  selectedFolderHandle,
  selectedFolderName,
  isFileSystemSupported,
  selectOutputFolder,
  clearFolderSelection,
  saveWithFallback
} = useDirectorySave()

const confirmCrop = async () => {
  if (!imageElement.value) return

  const dataUrl = exportCroppedImage({
    imageElement: imageElement.value,
    imagePosition: cropper.imagePosition.value,
    cropBox: cropper.cropBox.value,
    actualScale: cropper.actualScale.value,
    outputSize: cropper.outputSize.value,
    mimeType: 'image/png'
  })

  if (!dataUrl) return

  const os = cropper.outputSize.value
  const fileName = `cropped-image-${os.width}x${os.height}-${Date.now()}.png`

  const { savedToFolder } = await saveWithFallback(dataUrl, fileName, { fallbackDownload: true })

  emit('crop', {
    imageData: dataUrl,
    savedToFolder,
    fileName
  })
}
</script>

  
  

<style scoped>
  .cropper-lab {
    display: flex;
    flex-direction: column;
    border-radius: 32px;
    background: var(--surface-base, #fffaf3);
  }
  
  .cropper-stage {
    display: flex;
    gap: 0;
    border-radius: 28px;
    border: 1px solid var(--surface-divider, rgba(226, 232, 240, 0.9));
    background: var(--surface-card, #fffdfb);
    box-shadow: 0 24px 72px rgba(15, 23, 42, 0.12);
    overflow: hidden;
  }
  
  .stage-preview,
  .stage-panel {
    background: transparent;
  }
  
  .stage-preview {
    flex: 1.7;
    min-width: 0;
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  
  .stage-panel {
    flex: 1;
    min-width: 320px;
    border-left: 1px solid var(--surface-divider, rgba(226, 232, 240, 0.9));
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  
  .stage-toolbar {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    align-items: baseline;
  }
  
  .stage-toolbar h3 {
    margin: 4px 0;
    font-size: 1.6rem;
  }
  
  .stage-meta {
    margin: 0;
    color: var(--text-tertiary, #94a3b8);
    font-size: 0.85rem;
  }
  
  .stage-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .stage-actions .btn,
  .panel-actions .btn {
    border-radius: 999px;
  }
  
  .canvas-shell {
    position: relative;
    flex: 1;
    min-height: 520px;
    border-radius: 22px;
    background: radial-gradient(circle at 0% 0%, #fefce8 0, #f5f3ff 45%, #e0f2fe 100%);
    border: none;
    overflow: hidden;
  }
  
  .crop-image {
    position: absolute;
    top: 0;
    left: 0;
    cursor: move;
    user-select: none;
    max-width: none;
    max-height: none;
  }
  
  .crop-box {
    position: absolute;
    border-radius: 18px;
    border: 2px solid rgba(129, 140, 248, 0.8);
    background: rgba(129, 140, 248, 0.08);
    box-shadow:
      0 0 0 1px rgba(15, 23, 42, 0.16),
      0 14px 30px rgba(15, 23, 42, 0.4);
    cursor: move;
    backdrop-filter: blur(1px);
  }
  
  .crop-border {
    position: absolute;
    inset: 0;
    border: 1px dashed rgba(255, 255, 255, 0.4);
    pointer-events: none;
  }
  
  .crop-corner {
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 2px solid #fff;
    background: linear-gradient(135deg, #a78bfa, #6366f1);
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.5);
  }
  
  .crop-corner-nw { top: -11px; left: -11px; cursor: nw-resize; }
  .crop-corner-ne { top: -11px; right: -11px; cursor: ne-resize; }
  .crop-corner-sw { bottom: -11px; left: -11px; cursor: sw-resize; }
  .crop-corner-se { bottom: -11px; right: -11px; cursor: se-resize; }
  
  .panel-card {
    padding: 4px 0 16px;
    border-radius: 0;
    border: none;
    background: transparent;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .panel-card--form {
    gap: 18px;
  }
  
  .panel-divider {
    width: 100%;
    height: 1px;
    background: var(--surface-divider, #e2e8f0);
  }
  
  .panel-divider.subtle {
    opacity: 0.5;
  }
  
  .panel-subhead {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  
  .panel-subhead h4 {
    margin: 4px 0 0;
    font-size: 0.95rem;
  }
  
  .panel-card header h4 {
    margin: 6px 0 0;
    font-size: 1rem;
  }
  
  .dim-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  
  .dim-grid label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-secondary, #475569);
  }
  
  .dim-grid input {
    border: 1px solid var(--surface-divider, #d7e0ea);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 0.95rem;
    background: #fff;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }
  
  .dim-grid input:focus {
    outline: none;
    border-color: var(--primary-500, #6366f1);
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.3);
  }
  
  .preset-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .chip {
    border-radius: 999px;
    border: 1px solid var(--surface-divider, #d7e0ea);
    padding: 6px 12px;
    background: #fff;
    font-size: 0.8rem;
    color: var(--text-secondary, #475569);
    cursor: pointer;
    transition: all 0.18s ease;
  }
  
  .chip:hover {
    border-color: var(--primary-400, #a78bfa);
    color: var(--primary-500, #6366f1);
    background: rgba(129, 140, 248, 0.08);
  }
  
  .ratio-buttons {
    display: flex;
    gap: 10px;
  }
  
  .ratio-buttons.tight {
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .ratio-btn {
    flex: 1;
    border-radius: 14px;
    border: 1px solid var(--surface-divider, #d7e0ea);
    padding: 8px 10px;
    background: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.18s ease;
  }
  
  .ratio-btn.active {
    border-color: var(--primary-500, #6366f1);
    color: var(--primary-600, #4f46e5);
    background: rgba(129, 140, 248, 0.12);
  }
  
  .folder-selector {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .btn-folder-select {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 16px;
    border: 1px solid var(--surface-divider, #d7e0ea);
    background: #fff;
    cursor: pointer;
    transition: border-color 0.18s ease, background 0.18s ease;
  }
  
  .btn-folder-select svg {
    width: 20px;
    height: 20px;
    color: var(--text-secondary, #475569);
  }
  
  .btn-folder-select span {
    flex: 1;
    text-align: left;
    color: var(--text-primary, #0f172a);
  }
  
  .btn-folder-select.selected {
    border-color: var(--primary-500, #6366f1);
    background: rgba(129, 140, 248, 0.08);
  }
  
  .btn-clear-folder {
    border: none;
    background: transparent;
    color: var(--text-tertiary, #94a3b8);
    cursor: pointer;
  }
  
  .folder-hint {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-tertiary, #94a3b8);
  }
  
  .panel-actions {
    display: flex;
    gap: 12px;
  }
  
  .panel-actions.inline {
    justify-content: space-between;
    flex-wrap: wrap;
  }
  
  .panel-actions.inline .btn {
    flex: 1;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px 16px;
    border-radius: 999px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.18s ease;
  }
  
  .btn.ghost {
    border-color: var(--surface-divider, #d7e0ea);
    color: var(--text-secondary, #475569);
    background: rgba(255, 255, 255, 0.8);
  }
  
  .btn.primary {
    background: #0f172a;
    color: #fff;
    border-color: transparent;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.35);
  }
  
  .btn.primary svg,
  .btn.primary path {
    color: currentColor;
  }
  
  .btn.ghost:hover {
    border-color: #0f172a;
    color: #0f172a;
  }
  
  .btn.primary:hover {
    transform: translateY(-1px);
    background: #1e293b;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.45);
  }
  
  .lab-eyebrow {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-tertiary, #94a3b8);
  }
  
  @media (max-width: 1280px) {
    .cropper-stage {
      flex-direction: column;
    }
    
    .stage-panel {
      border-left: none;
      border-top: 1px solid var(--surface-divider, #e2e8f0);
    }
  }
  
  @media (max-width: 992px) {
    .cropper-lab {
      padding: 24px;
    }
  }
  
  @media (max-width: 768px) {
    .cropper-lab {
      padding: 20px 16px;
    }
  
    .stage-toolbar,
    .stage-actions {
      flex-direction: column;
      align-items: stretch;
    }
  
    .panel-actions {
      flex-direction: column;
    }
  }
  </style>
    