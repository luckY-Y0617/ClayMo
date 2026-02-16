<template>
  <div class="format-toolbar" v-if="editor">
    <!-- 隐藏的图片选择输入框 -->
    <input
      ref="imageInputRef"
      class="hidden-file-input"
      type="file"
      accept="image/*"
      @change="onImageFileChange"
    />
    <!-- 隐藏的附件选择输入框 -->
    <input
      ref="fileInputRef"
      class="hidden-file-input"
      type="file"
      @change="onFileChange"
    />

    <!-- 文本格式 -->
    <div class="toolbar-group">
      <button
        class="tool-btn"
        :class="{ active: editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
        title="粗体 (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        class="tool-btn"
        :class="{ active: editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
        title="斜体 (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        class="tool-btn"
        :class="{ active: editor.isActive('strike') }"
        @click="editor.chain().focus().toggleStrike().run()"
        title="删除线"
      >
        <el-icon><Minus /></el-icon>
      </button>
      <button
        class="tool-btn"
        :class="{ active: editor.isActive('code') }"
        @click="editor.chain().focus().toggleCode().run()"
        title="行内代码"
      >
        &lt;/&gt;
      </button>
    </div>

    <!-- 标题 -->
    <div class="toolbar-group heading-group" ref="headingGroupRef">
      <button
        class="tool-btn heading-btn"
        :class="{ active: headingDropdownOpen }"
        @click.stop="toggleHeadingDropdown"
      >
        <span>{{ currentHeading || '正文' }}</span>
        <el-icon class="caret-icon"><ArrowDown /></el-icon>
      </button>

      <transition name="fade-down">
        <div
          v-if="headingDropdownOpen"
          class="heading-dropdown"
          @click.stop
        >
          <button
            v-for="item in headingOptions"
            :key="item.key"
            class="heading-option"
            :class="{ active: isHeadingActive(item.key) }"
            @click="onHeadingOptionClick(item)"
          >
            {{ item.label }}
          </button>
        </div>
      </transition>
    </div>

    <!-- 列表 -->
    <div class="toolbar-group">
      <button
        class="tool-btn"
        :class="{ active: editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
        title="无序列表"
      >
        <el-icon><List /></el-icon>
      </button>
      <button
        class="tool-btn"
        :class="{ active: editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
        title="有序列表"
      >
        <el-icon><Sort /></el-icon>
      </button>
      <button
        class="tool-btn"
        :class="{ active: editor.isActive('blockquote') }"
        @click="editor.chain().focus().toggleBlockquote().run()"
        title="引用"
      >
        <el-icon><ChatLineRound /></el-icon>
      </button>
    </div>

    <!-- 插入 -->
    <div class="toolbar-group">
      <button
        class="tool-btn"
        @click="handleInsertImage"
        title="插入图片"
      >
        <el-icon><Picture /></el-icon>
      </button>
      <button
        class="tool-btn"
        @click="handleInsertFile"
        title="上传附件"
      >
        <svg class="tool-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
        </svg>
      </button>
      <button
        class="tool-btn"
        @click="handleInsertTable"
        title="插入表格"
      >
        <el-icon><Grid /></el-icon>
      </button>
      <button
        class="tool-btn"
        @click="editor.chain().focus().toggleCodeBlock().run()"
        title="代码块"
      >
        <el-icon><Document /></el-icon>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { useImageUpload } from '@/composables/useImageUpload'
// Removed: useKnowledgeEditorStore - now using inject('editorSession')

const editorSession = inject('editorSession')
const baseId = inject('baseId')
const editor = computed(() => editorSession.editor.value)

// 图片上传
const { uploadFile, isUploading, uploadProgress } = useImageUpload()

const headingDropdownOpen = ref(false)
const headingGroupRef = ref(null)
const imageInputRef = ref(null)
const fileInputRef = ref(null)

const currentHeading = computed(() => {
  if (!editor.value) return null
  if (editor.value.isActive('heading', { level: 1 })) return 'H1'
  if (editor.value.isActive('heading', { level: 2 })) return 'H2'
  if (editor.value.isActive('heading', { level: 3 })) return 'H3'
  if (editor.value.isActive('heading', { level: 4 })) return 'H4'
  return null
})

const headingOptions = [
  { key: 'paragraph', label: '正文' },
  { key: '1', label: '标题 1' },
  { key: '2', label: '标题 2' },
  { key: '3', label: '标题 3' },
  { key: '4', label: '标题 4' },
]

const toggleHeadingDropdown = () => {
  headingDropdownOpen.value = !headingDropdownOpen.value
}

const handleHeading = (command) => {
  if (!editor.value) return
  if (command === 'paragraph') {
    editor.value.chain().focus().setParagraph().run()
  } else {
    editor.value.chain().focus().toggleHeading({ level: parseInt(command, 10) }).run()
  }
}

const onHeadingOptionClick = (item) => {
  headingDropdownOpen.value = false
  handleHeading(item.key)
}

const isHeadingActive = (key) => {
  if (!editor.value) return false
  if (key === 'paragraph') {
    return !currentHeading.value
  }
  const level = parseInt(key, 10)
  return editor.value.isActive('heading', { level })
}

// 点击外部关闭标题下拉菜单
const handleClickOutside = (event) => {
  if (headingGroupRef.value && !headingGroupRef.value.contains(event.target)) {
    headingDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

/**
 * 图片插入：点击按钮 -> 唤起本地选择 -> 上传 -> 插入编辑器
 */
const handleInsertImage = () => {
  if (!imageInputRef.value) return
  imageInputRef.value.click()
}

const onImageFileChange = async (event) => {
  const files = event.target.files
  if (!files || !files.length || !editor.value) return

  const file = files[0]
  // 允许选择同一文件重复触发 change
  event.target.value = ''

  try {
    const url = await uploadImage(file)
    if (!url) {
      throw new Error('empty url')
    }

    editor.value.chain().focus().setImage({ src: url, size: 'md', align: 'center' }).run()

  } catch (error) {
    console.error('上传图片失败:', error)
    ElMessage.error('上传图片失败，请稍后重试')
  }
}

/**
 * 上传图片到服务器
 * 使用 uploadToken 系统进行安全的图片上传
 */
const uploadImage = async (file) => {
  if (!baseId.value) {
    throw new Error('无法获取知识库ID')
  }

  return await uploadFile(file, baseId.value)
}

const handleInsertTable = () => {
  if (!editor.value) return
  editor.value
    .chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run()
}

/**
 * 附件插入：点击按钮 -> 唤起本地选择 -> 上传 -> 插入编辑器
 */
const handleInsertFile = () => {
  if (!fileInputRef.value) return
  fileInputRef.value.click()
}

const onFileChange = async (event) => {
  const files = event.target.files
  if (!files || !files.length || !editor.value) return

  const file = files[0]
  // 允许选择同一文件重复触发 change
  event.target.value = ''

  try {
    const fileUrl = await uploadFile(file, baseId.value)
    if (!fileUrl) {
      throw new Error('empty url')
    }

    // 插入附件块
    editor.value.chain().focus().setFileBlock({
      src: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }).run()

  } catch (error) {
    console.error('上传附件失败:', error)
    ElMessage.error('上传附件失败，请稍后重试')
  }
}

</script>

<style scoped>
.format-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 48px;
  background: #FFFFFF;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-wrap: nowrap;
}

/* 隐藏文件输入 */
.hidden-file-input {
  display: none;
}

/* 工具栏分组（背景胶囊） */
.toolbar-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 8px;
  background: transparent;
}

/* 每个按钮 */
.tool-btn {
  border: none;
  background: transparent;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tool-btn strong,
.tool-btn em {
  font-weight: 600;
}

.tool-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #1a1a1a;
}

.tool-btn.active {
  background: rgba(0, 0, 0, 0.1);
  color: #1a1a1a;
  font-weight: 500;
}

/* 标题按钮 + 下拉菜单 */

.heading-group {
  position: relative;
}

.heading-btn {
  padding-right: 4px;
}

.heading-btn.active {
  background: rgba(0, 0, 0, 0.1);
  color: #1a1a1a;
  font-weight: 500;
}

.caret-icon {
  font-size: 12px;
  transition: transform 0.18s ease;
}

.heading-btn.active .caret-icon {
  transform: rotate(180deg);
}

/* 下拉菜单（矩形、语雀风格） */
.heading-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 140px;
  padding: 6px 0;
  border-radius: 8px;
  background: #FFFFFF;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.08);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

/* 下拉出现动画（与 fade-down 过渡名对应） */
.fade-down-enter-active,
.fade-down-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 下拉选项 */
.heading-option {
  border: none;
  background: transparent;
  padding: 8px 16px;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  text-align: left;
  cursor: pointer;
  color: #666;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.heading-option:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #1a1a1a;
}

.heading-option.active {
  background: rgba(0, 0, 0, 0.08);
  color: #1a1a1a;
  font-weight: 500;
}

.format-toolbar > .toolbar-group:first-child {
  margin-left: 0;
}
</style>
