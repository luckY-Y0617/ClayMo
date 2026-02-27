/**
 * 自定义 BulletList 扩展
 * 只使用 `-` 作为列表标记，释放 `*` 用于 Markdown 语法（如加粗 **bold**）
 */

import { BulletList, type BulletListOptions } from '@tiptap/extension-bullet-list'
import { wrappingInputRule } from '@tiptap/core'

export interface CustomBulletListOptions extends BulletListOptions {}

export const CustomBulletList = BulletList.extend<CustomBulletListOptions>({
  addInputRules() {
    return [
      // 只匹配 `- ` 开头的行作为列表项
      wrappingInputRule({
        find: /^(\s*)-(\s)$/,
        type: this.type,
        getAttributes: () => ({}),
        joinPredicate: () => true,
      }),
    ]
  },
})
