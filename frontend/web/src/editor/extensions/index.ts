/**
 * TipTap 扩展统一导出
 */

// 核心扩展
export { BlockId, type BlockIdOptions } from './BlockId'
export { CommentMark, type CommentMarkOptions, type CommentMarkAttributes } from './CommentMark'
export { TrailingParagraph } from './TrailingParagraph'

// 文档引用扩展
export {
  InlineDocumentReference,
  type InlineDocumentReferenceOptions,
  type InlineDocumentReferenceAttrs,
} from './InlineDocumentReference'
export {
  CardDocumentReference,
  type CardDocumentReferenceOptions,
  type CardDocumentReferenceAttrs,
} from './CardDocumentReference'

// 斜杠命令
export {
  SlashCommand,
  DEFAULT_COMMAND_ITEMS,
  type SlashCommandItem,
  type SlashCommandOptions,
} from './SlashCommand'

// 媒体块
export { ImageBlock, type ImageBlockOptions, type ImageBlockAttrs } from './ImageBlock'
export {
  FileBlock,
  type FileBlockOptions,
  type FileBlockAttrs,
  type FileHoverUIState,
} from './FileBlock'

// @提及
export { AtMention, type AtMentionOptions, type MentionItem } from './AtMention'

// 代码块（使用 lowlight 进行语法高亮）
export { lowlight } from './CodeBlock'

