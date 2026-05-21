import { computed, type WritableComputedRef } from 'vue'
import { useBrowserCache } from './useBrowserCache'

export interface PromptPreset {
  key: string
  label: string
  tip: string
  template: string
}

export const AUTOPILOT_PROMPT_PRESETS_STORAGE_KEY = 'autopilot.send.promptPresets'

export const AUTOPILOT_DEFAULT_PROMPT_TEMPLATE = `你是"传话人". 请把【】内的内容原样复述出来, 不要做任何改动 / 解读 / 归纳 / 评价 / 增删字符 / 翻译.
保持分隔头 "=== CASE N: <title> ===" 原样, 不要去掉, 不要换行错位.
不要在前后添加任何解释 / 寒暄 / 摘要; 只输出原文.`

export const DEFAULT_PROMPT_PRESETS: PromptPreset[] = [
  {
    key: 'passthrough',
    label: '传话人 (原文)',
    tip: '让 harness 把内容原样吐回, 不做任何改写',
    template: AUTOPILOT_DEFAULT_PROMPT_TEMPLATE,
  },
  {
    key: 'distill',
    label: '梳理 (合并去重)',
    tip: '让 harness 合并重复 / 极相似 case, 输出仍按 CASE N 分隔',
    template: `你是测试用例梳理助手. 请阅读【】内的多条测试用例, 合并重复 / 极相似的, 去掉冗余描述,
保留必要的步骤与期望. 输出仍按 "=== CASE N: <title> ===" 头切分, N 从 1 开始重新编号,
分隔头独占一行, 不允许去掉.
仅输出整理后的用例文本, 不要附加任何解释 / 寒暄 / 摘要.`,
  },
  {
    key: 'translate-en',
    label: '翻译为英文',
    tip: '把每条 case 翻成英文, 严格保留 CASE N 分隔头',
    template: `请把【】内的每条测试用例翻译为英文.
严格保留 "=== CASE N: <title> ===" 行不被翻译 / 不被去掉, N 与原文一一对应, 标题部分翻译.
其他内容 (模块 / 步骤 / 期望) 翻译为自然的技术英文.
仅输出翻译后的全文, 不要附加任何前言 / 寒暄 / 解释.`,
  },
  {
    key: 'fill-expected',
    label: '补充期望结果',
    tip: '给缺期望或期望过简的 case 补充更具体的 expected',
    template: `你是测试评审助手. 阅读【】内的每条测试用例, 对期望 / expected 缺失或过于简略的,
基于步骤推断出更可执行的期望结果并补全 (尽量具体到 UI 反馈 / 状态码 / 文案).
不要改步骤 / 模块 / 标签 / 标题. 严格保留 "=== CASE N: <title> ===" 头与原编号.
仅输出补全后的全文, 不要附加任何解释 / 寒暄 / 摘要.`,
  },
]

function sanitize(list: unknown): PromptPreset[] | null {
  if (!Array.isArray(list)) return null
  const out: PromptPreset[] = []
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const key = typeof r.key === 'string' ? r.key.trim() : ''
    const label = typeof r.label === 'string' ? r.label.trim() : ''
    const tip = typeof r.tip === 'string' ? r.tip : ''
    const template = typeof r.template === 'string' ? r.template : ''
    if (!key || !label || !template.trim()) continue
    out.push({ key, label, tip, template })
  }
  return out
}

export interface UsePromptPresetsReturn {
  presets: WritableComputedRef<PromptPreset[]>
  setPresets: (list: PromptPreset[]) => void
  resetToDefaults: () => void
}

export function usePromptPresets(): UsePromptPresetsReturn {
  const raw = useBrowserCache<string>(AUTOPILOT_PROMPT_PRESETS_STORAGE_KEY, '')

  const presets = computed<PromptPreset[]>({
    get() {
      if (!raw.value) return DEFAULT_PROMPT_PRESETS
      try {
        const parsed = JSON.parse(raw.value)
        const clean = sanitize(parsed)
        if (!clean || clean.length === 0) return DEFAULT_PROMPT_PRESETS
        return clean
      } catch {
        return DEFAULT_PROMPT_PRESETS
      }
    },
    set(list) {
      const clean = sanitize(list) ?? []
      raw.value = clean.length === 0 ? '' : JSON.stringify(clean)
    },
  })

  function setPresets(list: PromptPreset[]) {
    presets.value = list
  }

  function resetToDefaults() {
    raw.value = ''
  }

  return { presets, setPresets, resetToDefaults }
}
