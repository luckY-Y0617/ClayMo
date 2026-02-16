export interface KbIconOption {
  key: string   // 传给后端的字符串
  src: string   // 图标图片资源
  label: string // 备用（可显示 tooltip 文案）
}

// 图标资源路径 - 使用 public 目录下的资源
// 如果图标放在 public/assets/kb-icons/ 目录下，可以直接使用相对路径
// 如果需要使用 import，可以改为：new URL('@/assets/kb-icons/xxx.png', import.meta.url).href
export const KB_ICON_OPTIONS: KbIconOption[] = [
  { key: 'icon_default', src: new URL('@/assets/kb-icons/default.png', import.meta.url).href, label: '默认图标' },
  { key: 'icon_book_blue', src: new URL('@/assets/kb-icons/book-blue.png', import.meta.url).href, label: '蓝色书本' },
  { key: 'icon_folder_yellow', src: new URL('@/assets/kb-icons/folder-yellow.png', import.meta.url).href, label: '黄色文件夹' },
  { key: 'icon_brain_pink', src: new URL('@/assets/kb-icons/brain-pink.png', import.meta.url).href, label: '粉色大脑' },
  { key: 'icon_doc_pen', src: new URL('@/assets/kb-icons/doc-pen.png', import.meta.url).href, label: '文档+笔' },
  { key: 'icon_notebook', src: new URL('@/assets/kb-icons/notebook.png', import.meta.url).href, label: '笔记本' },
  { key: 'icon_grid', src: new URL('@/assets/kb-icons/grid.png', import.meta.url).href, label: '网格' },
  { key: 'icon_list', src: new URL('@/assets/kb-icons/list.png', import.meta.url).href, label: '列表' },
]

// 默认图标 key
export const DEFAULT_ICON_KEY = 'icon_default'

