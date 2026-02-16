// src/utils/commentAnchor.js

/**
 * Range Anchor Position 协议（建议）
 * {
 *   schema: 1,
 *   type: 'range',
 *   blockId: '...',
 *   quote: { exact: '...', prefix: '...', suffix: '...' },
 *   occurrence: 0,
 *   hint: { fromInBlock: 12, toInBlock: 18 } // 可选兜底（仅前端）
 * }
 */

export const COMMENT_ANCHOR_SCHEMA = 1
export const ATOM_PLACEHOLDER = '\uFFFC'

const DEBUG = false

function isNonEmptyString(v) {
  return typeof v === 'string' && v.length > 0
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function trimText(s) {
  return (s || '').trim()
}

/**
 * 从 ResolvedPos 向上找最近 block（用于构建锚点）
 * 返回：
 * { node, nodePos, start, end }
 * - nodePos: block 节点位置（setNodeMarkup 用）
 * - start/end: block 内容区间（doc pos）
 */
export function getNearestBlockInfo($pos) {
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
 * 收集 block 内容区间内可匹配 spans（统一口径）
 * - text: node.text
 * - hardBreak: '\n'
 * - inline atom: '\uFFFC'（mention / inline card 等）
 *
 * spans: [{ text, from, to }]
 * - from: doc pos
 * - to: doc pos（按 text.length 推算，不依赖 nodeSize）
 */
export function collectInlineSpans(doc, from, to, options = {}) {
  const {
    includeHardBreak = true,
    includeInlineAtom = true,
    atomTextResolver = null, // (node) => string | null
  } = options

  const spans = []

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
      let t = null
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
 * docPos -> fullText index（基于 spans）
 */
export function docPosToIndex(spans, docPos) {
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
 * 将 [startIndex, endIndex) 映射回 {from,to}
 */
export function mapIndexToDocPos(spans, startIndex, endIndex) {
  let acc = 0
  let docFrom = null
  let docTo = null

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

function findAll(fullText, exact) {
  const hits = []
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

function filterByContext(fullText, exact, prefix, suffix) {
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

function computeOccurrenceByIndex(fullText, exact, selStartIndex) {
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
 * 生成 blockId（仅兜底；正常由 BlockId extension 保证）
 */
export function createFallbackBlockId() {
  return (
    'b_' +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(4)
  )
}

/**
 * ✅ 构建 Range Anchor：统一从 selection 生成 position（BubbleMenu 用）
 *
 * 约束：
 * - 必须同一 block 内（否则返回 { error: 'cross_block' }）
 * - quote 的口径与 locateRangeAnchor 完全一致（spans 拼接）
 *
 * 返回：
 * { position, blockPos?, blockIdWritten? } 或 { error }
 *
 * 如果 block 没 blockId，会写回（dispatch 一次）：
 * - blockIdWritten: true
 */
export function buildRangeAnchorFromSelection(editor, from, to, options = {}) {
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

  // blockId：应由 BlockId extension 保证；这里只兜底写回
  let blockId = block.attrs?.blockId || null
  let blockIdWritten = false
  if (!blockId) {
    blockId = createFallbackBlockId()
    const tr = state.tr.setNodeMarkup(blockPos, block.type, { ...block.attrs, blockId }, block.marks)
    view.dispatch(tr)
    blockIdWritten = true
  }

  // spans/fullText（与 locateRangeAnchor 同口径）
  const spans = collectInlineSpans(state.doc, blockStart, blockEnd, options)
  const fullText = spans.map((s) => s.text).join('')
  if (!isNonEmptyString(fullText)) return { error: 'empty_block_text' }

  const selStartIndex = docPosToIndex(spans, from)
  const selEndIndex = docPosToIndex(spans, to)

  // exact：对用户体验友好，trim 一下；prefix/suffix 不 trim（提高 context 命中率）
  let exact = fullText.slice(selStartIndex, selEndIndex)
  exact = trimText(exact)
  if (!isNonEmptyString(exact)) return { error: 'empty_exact' }

  const ctxLen = typeof options.ctxLen === 'number' ? options.ctxLen : 12
  const prefixStart = Math.max(0, selStartIndex - ctxLen)
  const prefix = fullText.slice(prefixStart, selStartIndex) || null

  const suffixEnd = Math.min(fullText.length, selEndIndex + ctxLen)
  const suffix = fullText.slice(selEndIndex, suffixEnd) || null

  const occurrence = computeOccurrenceByIndex(fullText, exact, selStartIndex)

  const position = {
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
 * 1) 找到 blockId 对应 block（用于重定位）
 */
export function findBlockById(doc, blockId) {
  let found = null
  let count = 0

  doc.descendants((node, pos) => {
    if (node?.isBlock && node.attrs?.blockId === blockId) {
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

function hintToDocRange(block, hint) {
  if (!hint) return null
  const { fromInBlock, toInBlock } = hint
  if (typeof fromInBlock !== 'number' || typeof toInBlock !== 'number') return null

  const from = block.start + fromInBlock
  const to = block.start + toInBlock
  if (from < block.start || to > block.end || from >= to) return null

  return { from, to }
}

/**
 * ✅ 核心重定位：根据 position 在当前 doc 里找到 {from,to}
 * 返回：{ from, to, blockStart, blockEnd } 或 null
 */
export function locateRangeAnchor(editor, position, options = {}) {
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

  // 1) prefix/suffix 精准过滤
  let hits = filterByContext(fullText, exact, prefix, suffix)
  // 2) fallback：所有命中
  if (!hits.length) hits = findAll(fullText, exact)
  // 3) fallback：hint
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
 * 将 commentId 写入 commentMark，并合并 commentIds（支持同一范围多个评论叠加）
 */
export function applyCommentMarkToRange(editor, from, to, commentId) {
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
      : (isNonEmptyString(existing.attrs.commentId) ? [existing.attrs.commentId] : [])

    const merged = Array.from(new Set([...existingIds, commentId]))
    const primary = isNonEmptyString(existing.attrs.commentId) ? existing.attrs.commentId : commentId

    tr.removeMark(segFrom, segTo, markType)
    tr.addMark(segFrom, segTo, markType.create({ commentId: primary, commentIds: merged }))
  })

  if (!tr.docChanged) return false
  editor.view.dispatch(tr)
  return true
}

/** 根据后端 position 重定位后应用 commentMark */
export function applyCommentMarkFromPosition(editor, position, commentId, options = {}) {
  const loc = locateRangeAnchor(editor, position, options)
  if (!loc) return false
  return applyCommentMarkToRange(editor, loc.from, loc.to, commentId)
}

/** 点击评论：选中并滚动到该位置 */
export function scrollToComment(editor, position, options = {}) {
  const loc = locateRangeAnchor(editor, position, options)
  if (!loc) return false

  editor.commands.setTextSelection({ from: loc.from, to: loc.to })
  editor.commands.scrollIntoView()
  return true
}
