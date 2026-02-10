/**
 * Range Anchor Position 协议
 * 用于评论的精确定位和重定位
 */
import type { Editor } from '@tiptap/vue-3'
import type { Node, ResolvedPos } from '@tiptap/pm/model'

export const COMMENT_ANCHOR_SCHEMA = 1
export const ATOM_PLACEHOLDER = '\uFFFC'

const DEBUG = false

interface BlockInfo {
  node: Node
  nodePos: number
  start: number
  end: number
}

interface InlineSpan {
  text: string
  from: number
  to: number
}

interface RangeAnchorPosition {
  schema: number
  type: 'range'
  blockId: string
  quote: {
    exact: string
    prefix?: string | null
    suffix?: string | null
  }
  occurrence: number
  hint?: {
    fromInBlock: number
    toInBlock: number
  }
}

interface BuildRangeAnchorOptions {
  ctxLen?: number
  includeHardBreak?: boolean
  includeInlineAtom?: boolean
  atomTextResolver?: (node: Node) => string | null
}

interface BuildRangeAnchorResult {
  position?: RangeAnchorPosition
  blockPos?: number
  blockIdWritten?: boolean
  error?: string
}

interface LocateResult {
  from: number
  to: number
  blockStart: number
  blockEnd: number
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function trimText(s: string | undefined | null): string {
  return (s || '').trim()
}

/**
 * 从 ResolvedPos 向上找最近 block
 */
export function getNearestBlockInfo($pos: ResolvedPos): BlockInfo | null {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth)
    if (node.isBlock) {
      return {
        node,
        nodePos: $pos.before(depth),
        start: $pos.start(depth),
        end: $pos.end(depth),
      }
    }
  }
  return null
}

/**
 * 收集 block 内容区间内可匹配 spans
 */
export function collectInlineSpans(
  doc: Node,
  from: number,
  to: number,
  options: Partial<BuildRangeAnchorOptions> = {}
): InlineSpan[] {
  const {
    includeHardBreak = true,
    includeInlineAtom = true,
    atomTextResolver = null,
  } = options

  const spans: InlineSpan[] = []

  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText) {
      spans.push({
        text: node.text || '',
        from: pos,
        to: pos + (node.text ? node.text.length : 0),
      })
      return
    }

    if (includeHardBreak && node.type?.name === 'hardBreak') {
      spans.push({ text: '\n', from: pos, to: pos + 1 })
      return
    }

    if (includeInlineAtom && node.isInline && node.isAtom) {
      let t: string | null = null
      if (typeof atomTextResolver === 'function') {
        try {
          t = atomTextResolver(node)
        } catch {
          t = null
        }
      }
      spans.push({
        text: isNonEmptyString(t) ? t : ATOM_PLACEHOLDER,
        from: pos,
        to: pos + 1,
      })
      return
    }
  })

  return spans
}

/**
 * docPos -> fullText index
 */
export function docPosToIndex(spans: InlineSpan[], docPos: number): number {
  let acc = 0
  for (const s of spans) {
    const segStart = s.from
    const segEnd = s.from + s.text.length
    if (docPos >= segStart && docPos <= segEnd) {
      return acc + (docPos - segStart)
    }
    acc += s.text.length
  }
  return acc
}

/**
 * fullText index -> doc pos 区间映射
 */
export function mapIndexToDocPos(
  spans: InlineSpan[],
  startIndex: number,
  endIndex: number
): { from: number; to: number } | null {
  let acc = 0
  let docFrom: number | null = null
  let docTo: number | null = null

  for (const s of spans) {
    const segStart = acc
    const segEnd = acc + s.text.length

    if (docFrom == null && startIndex >= segStart && startIndex < segEnd) {
      docFrom = s.from + (startIndex - segStart)
    }

    if (docTo == null && endIndex > segStart && endIndex <= segEnd) {
      docTo = s.from + (endIndex - segStart)
    }

    if (docFrom != null && docTo != null) break
    acc = segEnd
  }

  if (docFrom == null || docTo == null) return null
  if (docTo <= docFrom) return null
  return { from: docFrom, to: docTo }
}

function findAll(fullText: string, exact: string): number[] {
  const hits: number[] = []
  if (!isNonEmptyString(exact)) return hits
  let idx = 0
  while (true) {
    const i = fullText.indexOf(exact, idx)
    if (i === -1) break
    hits.push(i)
    idx = i + 1
  }
  return hits
}

function filterByContext(
  fullText: string,
  exact: string,
  prefix: string | null | undefined,
  suffix: string | null | undefined
): number[] {
  const candidates = findAll(fullText, exact)
  if (!candidates.length) return []

  return candidates.filter((start) => {
    const leftOk =
      !isNonEmptyString(prefix) ||
      fullText.slice(Math.max(0, start - prefix.length), start) === prefix

    const rightStart = start + exact.length
    const rightOk =
      !isNonEmptyString(suffix) ||
      fullText.slice(rightStart, rightStart + suffix.length) === suffix

    return leftOk && rightOk
  })
}

function computeOccurrenceByIndex(fullText: string, exact: string, selStartIndex: number): number {
  const hits = findAll(fullText, exact)
  if (hits.length <= 1) return 0

  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < hits.length; i++) {
    const dist = Math.abs(hits[i] - selStartIndex)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

/**
 * 生成 blockId（仅兜底）
 */
export function createFallbackBlockId(): string {
  return (
    'b_' +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(4)
  )
}

/**
 * 构建 Range Anchor：统一从 selection 生成 position
 */
export function buildRangeAnchorFromSelection(
  editor: Editor,
  from: number,
  to: number,
  options: BuildRangeAnchorOptions = {}
): BuildRangeAnchorResult {
  if (!editor) return { error: 'no_editor' }
  if (typeof from !== 'number' || typeof to !== 'number' || from === to) {
    return { error: 'empty_selection' }
  }

  const { state, view } = editor
  const $from = state.doc.resolve(from)
  const $to = state.doc.resolve(to)

  const fromBlock = getNearestBlockInfo($from)
  const toBlock = getNearestBlockInfo($to)
  if (!fromBlock || !toBlock) return { error: 'no_block' }

  if (fromBlock.nodePos !== toBlock.nodePos) {
    return { error: 'cross_block' }
  }

  const block = fromBlock.node
  const blockPos = fromBlock.nodePos
  const blockStart = fromBlock.start
  const blockEnd = fromBlock.end

  let blockId = (block.attrs?.blockId as string) || null
  let blockIdWritten = false
  if (!blockId) {
    blockId = createFallbackBlockId()
    const tr = state.tr.setNodeMarkup(blockPos, block.type, { ...block.attrs, blockId }, block.marks)
    view.dispatch(tr)
    blockIdWritten = true
  }

  const spans = collectInlineSpans(state.doc, blockStart, blockEnd, options)
  const fullText = spans.map((s) => s.text).join('')
  if (!isNonEmptyString(fullText)) return { error: 'empty_block_text' }

  const selStartIndex = docPosToIndex(spans, from)
  const selEndIndex = docPosToIndex(spans, to)

  let exact = fullText.slice(selStartIndex, selEndIndex)
  exact = trimText(exact)
  if (!isNonEmptyString(exact)) return { error: 'empty_exact' }

  const ctxLen = typeof options.ctxLen === 'number' ? options.ctxLen : 12
  const prefixStart = Math.max(0, selStartIndex - ctxLen)
  const prefix = fullText.slice(prefixStart, selStartIndex) || null

  const suffixEnd = Math.min(fullText.length, selEndIndex + ctxLen)
  const suffix = fullText.slice(selEndIndex, suffixEnd) || null

  const occurrence = computeOccurrenceByIndex(fullText, exact, selStartIndex)

  const position: RangeAnchorPosition = {
    schema: COMMENT_ANCHOR_SCHEMA,
    type: 'range',
    blockId,
    quote: { exact, prefix, suffix },
    occurrence,
    hint: {
      fromInBlock: from - blockStart,
      toInBlock: to - blockStart,
    },
  }

  if (DEBUG) {
    console.log('[commentAnchor] build position', position)
  }

  return { position, blockPos, blockIdWritten }
}

/**
 * 找到 blockId 对应 block
 */
export function findBlockById(doc: Node, blockId: string): BlockInfo | null {
  let found: BlockInfo | null = null
  let count = 0

  doc.descendants((node, pos) => {
    if (node?.isBlock && (node.attrs?.blockId as string) === blockId) {
      count++
      if (!found) {
        found = {
          node,
          nodePos: pos,
          start: pos + 1,
          end: pos + node.nodeSize - 1,
        }
      }
    }
  })

  if (count > 1) {
    console.warn('[commentAnchor] duplicated blockId detected:', blockId, 'count=', count)
  }

  return found
}

function hintToDocRange(
  block: BlockInfo,
  hint: { fromInBlock: number; toInBlock: number } | undefined
): { from: number; to: number } | null {
  if (!hint) return null
  const { fromInBlock, toInBlock } = hint
  if (typeof fromInBlock !== 'number' || typeof toInBlock !== 'number') return null

  const from = block.start + fromInBlock
  const to = block.start + toInBlock
  if (from < block.start || to > block.end || from >= to) return null

  return { from, to }
}

/**
 * 核心重定位：根据 position 在当前 doc 里找到 {from,to}
 */
export function locateRangeAnchor(
  editor: Editor,
  position: RangeAnchorPosition,
  options: Partial<BuildRangeAnchorOptions> = {}
): LocateResult | null {
  if (!editor || !position) return null
  if (position.type !== 'range') return null

  const { blockId, quote, occurrence } = position
  const exact = quote?.exact
  const prefix = quote?.prefix
  const suffix = quote?.suffix

  if (!isNonEmptyString(blockId) || !isNonEmptyString(exact)) return null

  const doc = editor.state.doc
  const block = findBlockById(doc, blockId)
  if (!block) return null

  const spans = collectInlineSpans(doc, block.start, block.end, options)
  const fullText = spans.map((s) => s.text).join('')

  if (!isNonEmptyString(fullText)) {
    const h = hintToDocRange(block, position.hint)
    return h ? { ...h, blockStart: block.start, blockEnd: block.end } : null
  }

  let hits = filterByContext(fullText, exact, prefix, suffix)
  if (!hits.length) hits = findAll(fullText, exact)
  if (!hits.length) {
    const h = hintToDocRange(block, position.hint)
    return h ? { ...h, blockStart: block.start, blockEnd: block.end } : null
  }

  const idx = clamp((occurrence ?? 0) | 0, 0, hits.length - 1)
  const startIndex = hits[idx]
  const endIndex = startIndex + exact.length

  const mapped = mapIndexToDocPos(spans, startIndex, endIndex)
  if (!mapped) {
    const h = hintToDocRange(block, position.hint)
    return h ? { ...h, blockStart: block.start, blockEnd: block.end } : null
  }

  const max = doc.content.size
  const from = clamp(mapped.from, 0, max)
  const to = clamp(mapped.to, 0, max)
  if (to <= from) {
    const h = hintToDocRange(block, position.hint)
    return h ? { ...h, blockStart: block.start, blockEnd: block.end } : null
  }

  return { from, to, blockStart: block.start, blockEnd: block.end }
}

/**
 * 将 commentId 写入 commentMark
 */
export function applyCommentMarkToRange(
  editor: Editor,
  from: number,
  to: number,
  commentId: string
): boolean {
  if (!editor) return false
  if (!isNonEmptyString(commentId)) return false
  if (typeof from !== 'number' || typeof to !== 'number') return false

  const { state } = editor
  const markType = state.schema.marks.commentMark
  if (!markType) return false

  const max = state.doc.content.size
  const f = clamp(from, 0, max)
  const t = clamp(to, 0, max)
  if (t <= f) return false

  const tr = state.tr

  state.doc.nodesBetween(f, t, (node, pos) => {
    if (!node.isText) return

    const nodeTextLen = node.text ? node.text.length : 0
    const nodeFrom = pos
    const nodeTo = pos + nodeTextLen

    const segFrom = Math.max(f, nodeFrom)
    const segTo = Math.min(t, nodeTo)
    if (segFrom >= segTo) return

    const existing = node.marks.find((m) => m.type === markType) || null

    if (!existing) {
      tr.addMark(segFrom, segTo, markType.create({ commentId, commentIds: [commentId] }))
      return
    }

    const existingIds = Array.isArray(existing.attrs.commentIds)
      ? existing.attrs.commentIds
      : isNonEmptyString(existing.attrs.commentId)
        ? [existing.attrs.commentId]
        : []

    const merged = Array.from(new Set([...(existingIds as string[]), commentId]))
    const primary = isNonEmptyString(existing.attrs.commentId)
      ? existing.attrs.commentId as string
      : commentId

    tr.removeMark(segFrom, segTo, markType)
    tr.addMark(segFrom, segTo, markType.create({ commentId: primary, commentIds: merged }))
  })

  if (!tr.docChanged) return false
  editor.view.dispatch(tr)
  return true
}

/**
 * 根据后端 position 重定位后应用 commentMark
 */
export function applyCommentMarkFromPosition(
  editor: Editor,
  position: RangeAnchorPosition,
  commentId: string,
  options: Partial<BuildRangeAnchorOptions> = {}
): boolean {
  const loc = locateRangeAnchor(editor, position, options)
  if (!loc) return false
  return applyCommentMarkToRange(editor, loc.from, loc.to, commentId)
}

/**
 * 点击评论：选中并滚动到该位置
 */
export function scrollToComment(
  editor: Editor,
  position: RangeAnchorPosition,
  options: Partial<BuildRangeAnchorOptions> = {}
): boolean {
  const loc = locateRangeAnchor(editor, position, options)
  if (!loc) return false

  editor.commands.setTextSelection({ from: loc.from, to: loc.to })
  editor.commands.scrollIntoView()
  return true
}

export type { RangeAnchorPosition, BuildRangeAnchorResult, LocateResult }
