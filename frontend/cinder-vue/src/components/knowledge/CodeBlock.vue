<template>
  <NodeViewWrapper
    class="n-codeblock"
    :class="{
      'is-folded': isFolded,
      'toolbar-open': langDropdownOpen,
    }"
    @keydown.esc.stop.prevent="closeDropdown"
  >
    <!-- Toolbar（悬浮在代码块上方，不占内容空间） -->
    <div class="n-toolbar" @mousedown.stop>
      <div class="n-left">
        <span class="n-chip" title="Code Block">
          <span class="n-dot" aria-hidden="true"></span>
          <span class="n-chip-text">Code</span>
        </span>

        <!-- Language pill -->
        <div
          class="n-lang"
          @click.stop="toggleDropdown"
          :aria-expanded="langDropdownOpen ? 'true' : 'false'"
        >
          <span class="n-lang-label">{{ currentLanguageLabel }}</span>
          <span class="n-caret" aria-hidden="true">▾</span>

          <transition name="n-fade-down">
            <div v-if="langDropdownOpen" class="n-dropdown" @click.stop @mousedown.stop>
              <div class="n-search">
                <input
                  ref="searchInputRef"
                  v-model="search"
                  class="n-search-input"
                  placeholder="搜索语言…"
                  type="text"
                  @keydown.down.prevent="moveActive(1)"
                  @keydown.up.prevent="moveActive(-1)"
                  @keydown.enter.prevent="commitActive()"
                />
                <button class="n-clear" type="button" @click="search = ''" title="清空">×</button>
              </div>

              <div class="n-list" role="listbox">
                <button
                  v-for="(lang, idx) in filteredLanguages"
                  :key="lang.value"
                  class="n-option"
                  :class="{ active: lang.value === currentLanguage, focused: idx === activeIndex }"
                  type="button"
                  @mouseenter="activeIndex = idx"
                  @click="selectLanguage(lang.value)"
                >
                  <span class="n-option-label">{{ lang.label }}</span>
                  <span class="n-option-value">{{ lang.value }}</span>
                </button>

                <div v-if="filteredLanguages.length === 0" class="n-empty">
                  无匹配语言
                </div>
              </div>

              <div class="n-footer">
                <span class="n-footer-text">{{ supportedHint }}</span>
              </div>
            </div>
          </transition>
        </div>

        <span class="n-meta" v-if="!isFolded">{{ lineCount }} 行</span>
      </div>

      <div class="n-right">
        <button class="n-iconbtn" type="button" @click="handleCopy" :title="copied ? '已复制' : '复制代码'">
          <span class="n-ic" aria-hidden="true" :class="{ ok: copied }"></span>
        </button>

        <button class="n-iconbtn" type="button" @click="toggleFold" :title="isFolded ? '展开' : '折叠'">
          <span class="n-ic fold" aria-hidden="true" :class="{ down: isFolded }"></span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="n-content" v-show="!isFolded">
      <!-- 保持 NodeViewContent 与 pre 同行，避免 pre 内空白文本节点影响光标 -->
      <pre class="n-pre"><NodeViewContent
        as="code"
        class="n-code"
        :class="`language-${currentLanguage}`"
      /></pre>
    </div>

    <!-- Fold summary -->
    <div class="n-summary" v-if="isFolded">
      <div class="n-summary-row">
        <span class="n-summary-lang">{{ currentLanguageLabel }}</span>
        <span class="n-summary-count">{{ lineCount }} 行</span>
      </div>
      <div class="n-summary-preview">{{ summaryPreview }}</div>
    </div>
  </NodeViewWrapper>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'

const props = defineProps({
  node: { type: Object, required: true },
  updateAttributes: { type: Function, required: true },
  extension: { type: Object, required: true },
})

const languages = [
  { label: '纯文本', value: 'plaintext' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C#', value: 'csharp' },
  { label: 'C++', value: 'cpp' },
  { label: 'C', value: 'c' },
  { label: 'Go', value: 'go' },
]

const copied = ref(false)
const langDropdownOpen = ref(false)
const search = ref('')
const activeIndex = ref(0)
const searchInputRef = ref(null)

const currentLanguage = computed(() => props.node.attrs.language || 'plaintext')
const isFolded = computed(() => Boolean(props.node.attrs.folded))
const codeText = computed(() => props.node.textContent || '')

const lineCount = computed(() => {
  const t = codeText.value
  if (!t) return 1
  return t.split('\n').length
})

const summaryPreview = computed(() => {
  const text = (codeText.value || '').trim()
  if (!text) return '空代码块'
  const first = text.split('\n')[0] || ''
  return first.length > 90 ? `${first.slice(0, 90)}…` : first
})

const currentLanguageLabel = computed(() => {
  const found = languages.find(l => l.value === currentLanguage.value)
  return found?.label || '纯文本'
})

/** lowlight 已注册语言（提示/过滤） */
const supportedSet = computed(() => {
  const ll = props.extension?.options?.lowlight
  const list = ll?.listLanguages?.() || []
  return new Set(list)
})

/** 默认：仅展示 lowlight 支持的 + plaintext，避免“选了没变化”错觉 */
const displayLanguages = computed(() => {
  return languages.filter(l => l.value === 'plaintext' || supportedSet.value.has(l.value))
})

const supportedHint = computed(() => {
  const total = languages.length
  const shown = displayLanguages.value.length
  if (shown === total) return '全部语言已注册高亮'
  return `仅展示已注册高亮语言（隐藏 ${total - shown} 个）`
})

const filteredLanguages = computed(() => {
  const q = search.value.trim().toLowerCase()
  const base = displayLanguages.value
  if (!q) return base
  return base.filter(l => l.label.toLowerCase().includes(q) || l.value.toLowerCase().includes(q))
})

const toggleDropdown = async () => {
  langDropdownOpen.value = !langDropdownOpen.value
  if (langDropdownOpen.value) {
    activeIndex.value = 0
    await nextTick()
    searchInputRef.value?.focus?.()
  } else {
    search.value = ''
    activeIndex.value = 0
  }
}

const closeDropdown = () => {
  langDropdownOpen.value = false
  search.value = ''
  activeIndex.value = 0
}

const selectLanguage = (lang) => {
  if (lang !== currentLanguage.value) {
    props.updateAttributes({ language: lang })
  }
  closeDropdown()
}

const moveActive = (delta) => {
  const len = filteredLanguages.value.length
  if (!len) return
  activeIndex.value = (activeIndex.value + delta + len) % len
}

const commitActive = () => {
  const item = filteredLanguages.value[activeIndex.value]
  if (item) selectLanguage(item.value)
}

const toggleFold = () => {
  props.updateAttributes({ folded: !isFolded.value })
}

const handleCopy = async () => {
  const text = codeText.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
  } finally {
    if (copied.value) setTimeout(() => (copied.value = false), 1400)
  }
}

const onDocClick = () => {
  if (langDropdownOpen.value) closeDropdown()
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<style scoped>
/* ===== Container ===== */
.n-codeblock {
  --r: 12px;
  position: relative;
  overflow: visible;
}

/* ===== Toolbar floating above (no layout impact) ===== */
.n-toolbar {
  position: absolute;
  left: 0;
  right: 0;

  /* 悬浮在块上方，不占内部空间，顶部空白自然变小 */
  top: 0;
  transform: translateY(calc(-100% - 10px));

  z-index: 20;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  padding: 8px 10px;
  box-sizing: border-box;

  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 12px;

  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease;
}

.n-codeblock:hover .n-toolbar,
.n-codeblock:focus-within .n-toolbar,
.n-codeblock.toolbar-open .n-toolbar {
  opacity: 1;
  pointer-events: auto;
}

/* ===== Content ===== */
.n-content {
  margin: 0 !important;
  padding: 0 !important;
}

/* pre / code：编辑区域是你真正的 codeblock 视觉主体 */
.n-codeblock :deep(pre) {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--r);
  background: rgba(15, 15, 15, 0.035);
  border: 1px solid rgba(15, 15, 15, 0.08);

  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(15, 15, 15, 0.86);
}

/* 清理 inline code / hljs 背景污染 */
.n-codeblock :deep(code),
.n-codeblock :deep(.hljs) {
  background: transparent !important;
  padding: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;

  display: block;
  white-space: pre !important;

  font-variant-ligatures: none;
  font-feature-settings: "liga" 0, "calt" 0;
}

/* 灰阶文档风（更“正经”） */
.n-codeblock :deep(.hljs-keyword),
.n-codeblock :deep(.hljs-built_in),
.n-codeblock :deep(.hljs-type),
.n-codeblock :deep(.hljs-title),
.n-codeblock :deep(.hljs-literal) {
  color: rgba(15, 15, 15, 0.86) !important;
  font-weight: 600;
}
.n-codeblock :deep(.hljs-string),
.n-codeblock :deep(.hljs-number),
.n-codeblock :deep(.hljs-attr),
.n-codeblock :deep(.hljs-attribute) {
  color: rgba(15, 15, 15, 0.78) !important;
}
.n-codeblock :deep(.hljs-comment) {
  color: rgba(15, 15, 15, 0.45) !important;
  font-style: italic;
}

/* ===== Toolbar controls ===== */
.n-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.n-right { display: flex; align-items: center; gap: 6px; }

.n-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(15, 15, 15, 0.08);
  background: rgba(255, 255, 255, 0.95);
}
.n-dot {
  width: 8px; height: 8px; border-radius: 999px;
  background: rgba(15, 15, 15, 0.18);
}
.n-chip-text { font-size: 12px; color: rgba(15, 15, 15, 0.72); }

.n-lang {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(15, 15, 15, 0.08);
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  user-select: none;
  min-width: 180px;
  max-width: 260px;
}
.n-lang-label {
  font-size: 12px;
  color: rgba(15, 15, 15, 0.78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.n-caret { margin-left: auto; color: rgba(15, 15, 15, 0.45); font-size: 12px; }
.n-meta { font-size: 12px; color: rgba(15, 15, 15, 0.5); }

.n-iconbtn {
  width: 34px; height: 30px;
  border-radius: 10px;
  border: 1px solid rgba(15, 15, 15, 0.08);
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.n-iconbtn:hover { border-color: rgba(15, 15, 15, 0.12); background: #fff; }

/* 小图标 */
.n-ic { width: 14px; height: 14px; position: relative; }
.n-ic::before, .n-ic::after {
  content: "";
  position: absolute;
  inset: 0;
  border: 2px solid rgba(15, 15, 15, 0.55);
  border-radius: 2px;
}
.n-ic::after { transform: translate(3px, -3px); opacity: 0.7; }
.n-ic.ok::before, .n-ic.ok::after { border: none; }
.n-ic.ok::before {
  content: "";
  position: absolute;
  left: 2px; top: 6px;
  width: 4px; height: 8px;
  border-right: 2px solid rgba(15, 15, 15, 0.65);
  border-bottom: 2px solid rgba(15, 15, 15, 0.65);
  transform: rotate(45deg);
}
.n-ic.fold::before, .n-ic.fold::after { border: none; }
.n-ic.fold::before {
  content: "";
  position: absolute;
  left: 3px; top: 5px;
  width: 8px; height: 8px;
  border-right: 2px solid rgba(15, 15, 15, 0.6);
  border-bottom: 2px solid rgba(15, 15, 15, 0.6);
  transform: rotate(-135deg);
}
.n-ic.fold.down::before { transform: rotate(45deg); top: 2px; }

/* ===== Dropdown (强约束，防 reset 污染) ===== */
.n-dropdown {
  position: absolute;
  left: 0;
  top: calc(100% + 8px);
  z-index: 50;

  width: 320px;
  max-width: calc(100vw - 24px);

  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(15, 15, 15, 0.12);
  box-shadow: 0 18px 44px rgba(15, 15, 15, 0.14);
  overflow: hidden;
}

.n-dropdown,
.n-dropdown * {
  box-sizing: border-box;
  font-family: inherit;
}

.n-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px;
  border-bottom: 1px solid rgba(15, 15, 15, 0.08);
}

.n-search-input {
  display: block;
  width: 100%;
  height: 30px;
  line-height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(15, 15, 15, 0.14);
  background: rgba(15, 15, 15, 0.03);
  outline: none;
  font-size: 12px;
}
.n-search-input:focus { background: #fff; border-color: rgba(15, 15, 15, 0.18); }

.n-clear {
  flex: 0 0 auto;
  width: 30px; height: 30px; line-height: 28px;
  border-radius: 10px;
  border: 1px solid rgba(15, 15, 15, 0.12);
  background: rgba(15, 15, 15, 0.03);
  cursor: pointer;
  color: rgba(15, 15, 15, 0.6);
  font-size: 16px;
}

.n-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 280px;
  overflow: auto;
  padding: 8px;
}

.n-option {
  appearance: none;
  -webkit-appearance: none;

  display: flex;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;

  padding: 8px 10px;
  border-radius: 10px;

  cursor: pointer;
  font-size: 12px;
  line-height: 18px;

  justify-content: space-between;
  gap: 12px;
  white-space: nowrap;
}
.n-option:hover, .n-option.focused { background: rgba(15, 15, 15, 0.06); }
.n-option.active { background: rgba(15, 15, 15, 0.10); }

.n-option-label { overflow: hidden; text-overflow: ellipsis; }
.n-option-value { flex: 0 0 auto; color: rgba(15, 15, 15, 0.45); font-size: 11px; }

.n-empty { padding: 10px; color: rgba(15, 15, 15, 0.45); font-size: 12px; }

.n-footer {
  padding: 10px 12px;
  border-top: 1px solid rgba(15, 15, 15, 0.08);
  background: rgba(15, 15, 15, 0.02);
}
.n-footer-text { font-size: 11px; color: rgba(15, 15, 15, 0.5); }

/* ===== Fold summary ===== */
.n-summary {
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 12px;
  background: rgba(15, 15, 15, 0.02);
}
.n-summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
.n-summary-lang { font-size: 12px; font-weight: 600; color: rgba(15, 15, 15, 0.72); }
.n-summary-count { font-size: 12px; color: rgba(15, 15, 15, 0.5); }
.n-summary-preview {
  font-size: 12px;
  color: rgba(15, 15, 15, 0.55);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Transition */
.n-fade-down-enter-active,
.n-fade-down-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.n-fade-down-enter-from,
.n-fade-down-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
