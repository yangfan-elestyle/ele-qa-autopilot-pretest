import { computed, onMounted, ref, type WritableComputedRef } from 'vue'
import { getApiBasePath } from '@prompt-optimizer/core'

export interface PromptPreset {
  key: string
  label: string
  tip: string
  template: string
}

// 云端仅存 user customs (key 不在 DEFAULT 中的 preset). DEFAULT 永远从代码读 →
// 升级即对全员生效, 不会被旧账号同步快照覆盖. display = [...DEFAULT, ...customs].
export const AUTOPILOT_PROMPT_PRESETS_STORAGE_KEY = 'autopilot.send.promptCustoms'

// preset.template 作为 appendSystemPrompt 透传给 agentic-loop, prompt 字段始终是
// MeterSphereDataPanel 按 FCB-CASE 协议聚合产生的多 fenced block 文本.
// agentic-loop 收到时把 appendSystemPrompt 注入默认 system 末尾并加 MUST follow 强调.
//
// FCB-CASE 协议 (Fenced Case Block): 每个 case 是一个 markdown fenced code block,
// 开 fence 行 `\`\`\`case id=N title="..."` (3 个 backtick, info string 含 id + title 元数据),
// 闭 fence 行 `\`\`\``. 多 case 串联, 之间空白行分隔. 不再使用旧 `=== CASE N: <title> ===` 头.
//
// 详细编排 Flow (切片 / fan-out / 自检 / 拼接) 单一信源: ele-harness
// `.harness/plugins/qa-orchestrator/skills/qa-browser-orchestrator/SKILL.md`.
// 本模板只做角色定位 + Skill 加载入口 + 输出契约, 不复述 Flow 细节.
export const AUTOPILOT_QA_ORCHESTRATOR_TEMPLATE = `你是 QA Browser Orchestrator。

用户消息是 MeterSphere 测试用例聚合文本，遵循 **FCB-CASE 协议** (Fenced Case Block): 每个 case = 一个 markdown fenced code block，开 fence 形如 \`\`\`\`case id=N title="..."\`\`\`\` (三个反引号 + \`case\` + 空格 + \`id=N\` + 空格 + \`title="..."\`)，闭 fence 为单独一行的三个反引号。多个 case 串联，之间用空白行分隔。

# 任务

1. 调用 \`Skill({ skill: 'qa-orchestrator:qa-browser-orchestrator', args: <用户消息全文> })\` 获取编排 Flow 文档。
2. 按该 Flow 文档执行: 切片 (沿 \`\`\`\`case id=N title="..."\`\`\`\` 开 fence 与 \`\`\`\`\`\`\`\` 闭 fence 边界) → fan-out 子 agent 处理每条 case → 自检回炉 → 按 id 升序拼接产物。
3. 把拼接后的最终产物作为本次回复的唯一 text 块输出。

# 输出契约

- 每条产物逐字符保留原 \`\`\`\`case id=N title="..."\`\`\`\` 开 fence + 原 \`\`\`\`\`\`\`\` 闭 fence，id 与输入对齐，顺序与输入一致
- text 块即唯一交付物，不前后包裹解释 / 摘要 / 额外代码块，不在 case body 内出现连续三个反引号 (会撕裂 fence)`

export const AUTOPILOT_PASSTHROUGH_TEMPLATE = `你是 "传话人". 用户消息是按 **FCB-CASE 协议** 组织的测试用例聚合文本 (每个 case 用 \`\`\`\`case id=N title="..."\`\`\`\` 开 fence + \`\`\`\`\`\`\`\` 闭 fence 包裹). 请把用户消息原样输出, 不要做任何改动 / 解读 / 归纳 / 评价 / 增删字符 / 翻译.

逐字符保留每条 case 的开 fence + body + 闭 fence, id 与输入一致, 多 case 顺序与输入一致. 不要在前后添加任何解释 / 寒暄 / 摘要 / 外层代码块; 只输出原文.`

// 兼容旧导出名 (默认值跟随主推 preset)
export const AUTOPILOT_DEFAULT_PROMPT_TEMPLATE = AUTOPILOT_QA_ORCHESTRATOR_TEMPLATE

export const DEFAULT_PROMPT_PRESETS: PromptPreset[] = [
  {
    key: 'qa-browser-orchestrator',
    label: 'QA Orchestrator (推荐)',
    tip: '调 ELE-Harness qa-orchestrator plugin, 把测试用例编排成 browser-use 任务',
    template: AUTOPILOT_QA_ORCHESTRATOR_TEMPLATE,
  },
  {
    key: 'passthrough',
    label: '传话人 (原文)',
    tip: '让 harness 把内容原样吐回, 不做任何改写 (回退选项)',
    template: AUTOPILOT_PASSTHROUGH_TEMPLATE,
  },
]

const DEFAULT_KEY_SET = new Set(DEFAULT_PROMPT_PRESETS.map((p) => p.key))

export function isDefaultPresetKey(key: string): boolean {
  return DEFAULT_KEY_SET.has(key)
}

function sanitizeCustoms(list: unknown): PromptPreset[] | null {
  if (!Array.isArray(list)) return null
  const out: PromptPreset[] = []
  const seen = new Set<string>()
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const key = typeof r.key === 'string' ? r.key.trim() : ''
    const label = typeof r.label === 'string' ? r.label.trim() : ''
    const tip = typeof r.tip === 'string' ? r.tip : ''
    const template = typeof r.template === 'string' ? r.template : ''
    if (!key || !label || !template.trim()) continue
    // 过滤掉与 DEFAULT key 冲突的项 (兼容旧云端快照里可能混杂的 default 副本)
    if (DEFAULT_KEY_SET.has(key)) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ key, label, tip, template })
  }
  return out
}

// localStorage 仅作 cold-start cache 让 UI 立即可用; 真正的事实源是云端
// (`/api/sync/items/:key`), bootstrap 期 GET 覆盖, 写入时 PUT 推送.
function loadLocalRaw(): string {
  if (typeof window === 'undefined' || !window.localStorage) return ''
  try {
    return window.localStorage.getItem(AUTOPILOT_PROMPT_PRESETS_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveLocalRaw(value: string) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    if (value) window.localStorage.setItem(AUTOPILOT_PROMPT_PRESETS_STORAGE_KEY, value)
    else window.localStorage.removeItem(AUTOPILOT_PROMPT_PRESETS_STORAGE_KEY)
  } catch {
    // quota / 隐私模式静默
  }
}

// 模块级单例: 所有调用方共享同一 ref, panel 改了 modal 即时可见.
const rawValue = ref<string>(loadLocalRaw())

let bootstrapped = false
async function bootstrapFromRemote(): Promise<void> {
  if (bootstrapped) return
  bootstrapped = true
  const apiBase = getApiBasePath()
  const url = `${apiBase}/api/sync/items/${encodeURIComponent(AUTOPILOT_PROMPT_PRESETS_STORAGE_KEY)}`
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return
    const data = (await res.json()) as { value: string | null }
    if (typeof data.value === 'string' && data.value.length > 0) {
      rawValue.value = data.value
      saveLocalRaw(data.value)
    } else if (data.value === null && rawValue.value) {
      // 云端首次接入: 把本地已有的自定义 seed 上去.
      await pushRemote(rawValue.value)
    }
  } catch {
    // 鉴权 / 网络失败静默, 已有 localStorage fallback.
  }
}

async function pushRemote(value: string): Promise<void> {
  const apiBase = getApiBasePath()
  const url = `${apiBase}/api/sync/items/${encodeURIComponent(AUTOPILOT_PROMPT_PRESETS_STORAGE_KEY)}`
  try {
    if (value === '') {
      await fetch(url, { method: 'DELETE', credentials: 'include' })
    } else {
      await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value }),
      })
    }
  } catch {
    // push 失败不阻塞 UI; 下次启动 bootstrap 仍会 GET 一次. 多端并发编辑当前
    // 业务接受 last-write-wins.
  }
}

export interface UsePromptPresetsReturn {
  /** 完整展示 list = DEFAULT (代码) + customs (云端). 升级 DEFAULT 全员立即可见. */
  presets: WritableComputedRef<PromptPreset[]>
  /** 仅 user customs, 不含 DEFAULT. integration panel 应在此基础上做编辑. */
  customs: WritableComputedRef<PromptPreset[]>
  /** 设置完整 list (含 default + custom), 内部自动 filter 出 customs 持久化. */
  setPresets: (list: PromptPreset[]) => void
  /** 清空 customs, 仅保留 DEFAULT. */
  resetToDefaults: () => void
}

export function usePromptPresets(): UsePromptPresetsReturn {
  onMounted(() => {
    void bootstrapFromRemote()
  })

  const customs = computed<PromptPreset[]>({
    get() {
      if (!rawValue.value) return []
      try {
        const parsed = JSON.parse(rawValue.value)
        return sanitizeCustoms(parsed) ?? []
      } catch {
        return []
      }
    },
    set(list) {
      const clean = sanitizeCustoms(list) ?? []
      const next = clean.length === 0 ? '' : JSON.stringify(clean)
      rawValue.value = next
      saveLocalRaw(next)
      void pushRemote(next)
    },
  })

  const presets = computed<PromptPreset[]>({
    get() {
      return [...DEFAULT_PROMPT_PRESETS, ...customs.value]
    },
    set(list) {
      // 接受调用方传入的完整 list, 自动 filter 掉 default key 后持久化.
      customs.value = list.filter((p) => !DEFAULT_KEY_SET.has(p.key))
    },
  })

  function setPresets(list: PromptPreset[]) {
    presets.value = list
  }

  function resetToDefaults() {
    customs.value = []
  }

  return { presets, customs, setPresets, resetToDefaults }
}
