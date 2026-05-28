/**
 * 解析 testcase-generator 模板生成的纯文本测试用例.
 *
 * 协议: FCB-CASE (Fenced Case Block).
 * 每个 case = markdown fenced code block, 开 fence `\`\`\`case`, 闭 fence `\`\`\``.
 * 多 case 串联输出, 之间允许空白行.
 * 字段对应 OutputFormat: 用例名称 / 前置条件 / 所属模块 / 步骤描述 / 预期结果 / 标签 / 用例等级.
 * 上游 prompt 见 `packages/core/src/services/template/default-templates/optimize/testcase-generator.ts`.
 */

export type ParsedTestCase = {
  name: string
  preconditions: string
  module: string
  steps: string
  expected: string
  tags: string
  level: string
}

const LABEL_ALIASES: Record<keyof ParsedTestCase, string[]> = {
  name: ['用例名称', '用例名', '标题', '用例标题'],
  preconditions: ['前置条件', '前提条件', '先决条件'],
  module: ['所属模块', '模块', '模块路径', '所属目录'],
  steps: ['步骤描述', '步骤', '测试步骤', '操作步骤'],
  expected: ['预期结果', '期望结果', '预期', '期望'],
  tags: ['标签', 'Tags', 'Tag', '标记'],
  level: ['用例等级', '等级', '优先级', '优先级别', '用例级别', '级别', 'P级'],
}

const aliasToCanonical = (() => {
  const map = new Map<string, keyof ParsedTestCase>()
  ;(Object.keys(LABEL_ALIASES) as (keyof ParsedTestCase)[]).forEach((key) => {
    LABEL_ALIASES[key].forEach((alias) => map.set(alias.toLowerCase(), key))
  })
  return map
})()

const buildLabelRegex = () => {
  const allLabels = Array.from(aliasToCanonical.keys())
    // 长别名优先, 否则 "模块" 会先吞掉 "所属模块".
    .sort((a, b) => b.length - a.length)
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  return new RegExp(`(^|\n)\\s*(${allLabels})\\s*[:：]`, 'gi')
}

const LABEL_REGEX = buildLabelRegex()

// FCB-CASE fence 边界识别. 严格按 3-backtick + info string 起首 `case` 匹配.
const FENCE_OPEN_RE = /^\s*```case(?:\s.*)?$/
const FENCE_CLOSE_RE = /^\s*```\s*$/

const splitBlocks = (text: string): string[] => {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: string[] = []
  let inside = false
  let buf: string[] = []
  for (const line of lines) {
    if (!inside) {
      if (FENCE_OPEN_RE.test(line)) {
        inside = true
        buf = []
      }
      // 块外的行 (前导噪音 / 块间空白 / 异常文本) 一律丢弃, 与协议对齐.
    } else if (FENCE_CLOSE_RE.test(line)) {
      const body = buf.join('\n').trim()
      if (body) blocks.push(body)
      inside = false
      buf = []
    } else {
      buf.push(line)
    }
  }
  // 末尾 case 未闭合 (LLM 漏写闭 fence) → 也采纳, 避免整段丢失.
  if (inside) {
    const body = buf.join('\n').trim()
    if (body) blocks.push(body)
  }
  // 兜底: 整段不含任何 \`\`\`case fence → 视为单 case (LLM 违规但内容尚可救).
  if (blocks.length === 0) {
    const fallback = text.trim()
    if (fallback) blocks.push(fallback)
  }
  return blocks
}

const parseBlock = (block: string): ParsedTestCase => {
  const text = block.replace(/\r\n?/g, '\n')
  const matches: { key: keyof ParsedTestCase; valueStart: number; matchIndex: number }[] = []

  const regex = new RegExp(LABEL_REGEX.source, LABEL_REGEX.flags)
  let m: RegExpExecArray | null
  while ((m = regex.exec(text))) {
    const alias = (m[2] || '').toLowerCase()
    const key = aliasToCanonical.get(alias)
    if (!key) continue
    matches.push({ key, valueStart: m.index + m[0].length, matchIndex: m.index })
  }

  const result: ParsedTestCase = {
    name: '',
    preconditions: '',
    module: '',
    steps: '',
    expected: '',
    tags: '',
    level: '',
  }

  if (matches.length === 0) {
    result.steps = text.trim()
    return result
  }

  for (let i = 0; i < matches.length; i++) {
    const { key, valueStart } = matches[i]
    const valueEnd = i + 1 < matches.length ? matches[i + 1].matchIndex : text.length
    let value = text.slice(valueStart, valueEnd)
    value = value.replace(/^\s*\n/, '').trim()
    value = value.replace(/ /g, ' ')
    ;(result as any)[key] = value
  }

  if (result.tags) {
    const tags = result.tags
      .replace(/[，、\s]+/g, ',')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    result.tags = tags.join(', ')
  }

  return result
}

const normalizeIndexedList = (input: string): string => {
  if (!input) return ''
  let s = input.replace(/\r\n?/g, '\n')
  const token = /\s*(\[\d+\])/g
  s = s.replace(token, (_m, g1) => `\n${String(g1).trim()}`)
  s = s.replace(/^\n+/, '')
  s = s.replace(/\n{2,}/g, '\n')
  s = s
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
  return s
}

export function parseTestCases(raw: string): ParsedTestCase[] {
  const text = (raw || '').trim()
  if (!text) return []
  const blocks = splitBlocks(text)
  const records = blocks.map(parseBlock).map((r) => ({
    ...r,
    steps: normalizeIndexedList(r.steps),
    expected: normalizeIndexedList(r.expected),
  }))
  return records.filter((r) => Object.values(r).some((v) => (v || '').trim().length > 0))
}
