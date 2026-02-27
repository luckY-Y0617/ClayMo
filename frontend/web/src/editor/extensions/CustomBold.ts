/**
 * 自定义加粗扩展
 * 让 **text** 在输入完成后立即生效（无需两侧空格）
 */

import { Bold, type BoldOptions } from '@tiptap/extension-bold'
import { markInputRule } from '@tiptap/core'

export interface CustomBoldOptions extends BoldOptions {}

export const CustomBold = Bold.extend<CustomBoldOptions>({
  addInputRules() {
    return [
      // 匹配 **text** 格式（text 前后不需要空格）
      // 例如：输入 **bold** 会自动转换为加粗
      markInputRule({
        find: /\*\*([^*]+)\*\*$/,
        type: this.type,
      }),
    ]
  },
})
