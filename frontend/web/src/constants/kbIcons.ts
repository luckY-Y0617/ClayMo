export interface KbIconOption {
  /** 传给后端的字符串 */
  key: string
  /** 图标图片资源（可选） */
  imageSrc?: string
  /** Emoji 图标（图片加载失败时的回退） */
  emoji: string
  /** 显示名称 / tooltip */
  label: string
  /** 旧版 value（兼容） */
  value: string
}

/**
 * 知识库图标选项
 * 注意：图片资源需要放在 public/assets/kb-icons/ 目录下
 */
export const KB_ICON_OPTIONS: KbIconOption[] = [
  {
    key: 'icon_default',
    value: 'icon_default',
    emoji: '📚',
    label: '默认图标',
    imageSrc: '/assets/kb-icons/default.png',
  },
  {
    key: 'icon_book_blue',
    value: 'icon_book_blue',
    emoji: '📘',
    label: '蓝色书本',
    imageSrc: '/assets/kb-icons/book-blue.png',
  },
  {
    key: 'icon_folder_yellow',
    value: 'icon_folder_yellow',
    emoji: '📁',
    label: '黄色文件夹',
    imageSrc: '/assets/kb-icons/folder-yellow.png',
  },
  {
    key: 'icon_brain_pink',
    value: 'icon_brain_pink',
    emoji: '🧠',
    label: '粉色大脑',
    imageSrc: '/assets/kb-icons/brain-pink.png',
  },
  {
    key: 'icon_doc_pen',
    value: 'icon_doc_pen',
    emoji: '📝',
    label: '文档+笔',
    imageSrc: '/assets/kb-icons/doc-pen.png',
  },
  {
    key: 'icon_notebook',
    value: 'icon_notebook',
    emoji: '📓',
    label: '笔记本',
    imageSrc: '/assets/kb-icons/notebook.png',
  },
  {
    key: 'icon_grid',
    value: 'icon_grid',
    emoji: '🗂️',
    label: '网格',
    imageSrc: '/assets/kb-icons/grid.png',
  },
  {
    key: 'icon_list',
    value: 'icon_list',
    emoji: '📋',
    label: '列表',
    imageSrc: '/assets/kb-icons/list.png',
  },
]

/** 默认图标 key */
export const DEFAULT_ICON_KEY = 'icon_default'

/**
 * 根据 key 获取图标选项
 */
export function getIconOption(key: string | undefined): KbIconOption | undefined {
  if (!key) return KB_ICON_OPTIONS.find((opt) => opt.key === DEFAULT_ICON_KEY)
  return KB_ICON_OPTIONS.find((opt) => opt.key === key || opt.value === key)
}

/**
 * 根据 key 获取图标图片 URL（如果存在）
 */
export function getIconImageSrc(key: string | undefined): string | undefined {
  const option = getIconOption(key)
  return option?.imageSrc
}

/**
 * 根据 key 获取 Emoji（作为回退）
 */
export function getIconEmoji(key: string | undefined): string {
  const option = getIconOption(key)
  return option?.emoji || '📚'
}

/**
 * 根据 emoji 获取对应的 key（用于保存时转换）
 */
export function getIconKeyByEmoji(emoji: string | undefined): string {
  if (!emoji) return DEFAULT_ICON_KEY
  const option = KB_ICON_OPTIONS.find((opt) => opt.emoji === emoji)
  return option?.key || DEFAULT_ICON_KEY
}
