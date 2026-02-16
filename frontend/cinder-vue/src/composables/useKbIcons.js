import { ref } from 'vue'
import { KB_ICON_OPTIONS, DEFAULT_ICON_KEY } from '@/constants/kbIcons'

// 可复用的图标处理逻辑：提供 src 获取、emoji 占位和统一的 onerror 处理
export default function useKbIcons() {
  // 记录加载失败的图标 key，避免重复请求失败资源
  const iconErrorMap = ref(new Set())

  const getIconSrc = (iconKey) => {
    if (!iconKey) return null

    // 如果指定 key 标记为失败，尝试回退到默认图标（如果默认未失败）
    if (iconErrorMap.value.has(iconKey)) {
      const defaultOption = KB_ICON_OPTIONS.find((opt) => opt.key === DEFAULT_ICON_KEY)
      if (defaultOption && !iconErrorMap.value.has(DEFAULT_ICON_KEY)) {
        return defaultOption.src
      }
      return null
    }

    const iconOption = KB_ICON_OPTIONS.find((opt) => opt.key === iconKey)
    return iconOption ? iconOption.src : null
  }

  const getIconEmoji = (iconKey) => {
    const emojiMap = {
      icon_default: '📘',
      icon_book_blue: '📚',
      icon_folder_yellow: '🗂️',
      icon_brain_pink: '🧠',
      icon_doc_pen: '📝',
      icon_notebook: '📔',
      icon_grid: '📊',
      icon_list: '📋',
    }
    return emojiMap[iconKey] || emojiMap[DEFAULT_ICON_KEY] || '📘'
  }

  const handleImageError = (_event, iconKey) => {
    // 只标记加载失败，由 getIconSrc 在渲染层回退到默认或占位，避免直接操作 DOM
    if (iconKey) {
      iconErrorMap.value.add(iconKey)
    }
  }

  return {
    iconErrorMap,
    getIconSrc,
    getIconEmoji,
    handleImageError,
  }
}


