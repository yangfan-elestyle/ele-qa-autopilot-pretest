import { computed, onMounted, ref, type WritableComputedRef } from 'vue'
import { getApiBasePath } from '@prompt-optimizer/core'

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

// localStorage 仅作 cold-start cache 让 UI 立即可用; 真正的事实源是 D1
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
      // 云端首次接入: 把本地已有的自定义模板 seed 上去.
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
  presets: WritableComputedRef<PromptPreset[]>
  setPresets: (list: PromptPreset[]) => void
  resetToDefaults: () => void
}

export function usePromptPresets(): UsePromptPresetsReturn {
  onMounted(() => {
    void bootstrapFromRemote()
  })

  const presets = computed<PromptPreset[]>({
    get() {
      if (!rawValue.value) return DEFAULT_PROMPT_PRESETS
      try {
        const parsed = JSON.parse(rawValue.value)
        const clean = sanitize(parsed)
        if (!clean || clean.length === 0) return DEFAULT_PROMPT_PRESETS
        return clean
      } catch {
        return DEFAULT_PROMPT_PRESETS
      }
    },
    set(list) {
      const clean = sanitize(list) ?? []
      const next = clean.length === 0 ? '' : JSON.stringify(clean)
      rawValue.value = next
      saveLocalRaw(next)
      void pushRemote(next)
    },
  })

  function setPresets(list: PromptPreset[]) {
    presets.value = list
  }

  function resetToDefaults() {
    presets.value = []
  }

  return { presets, setPresets, resetToDefaults }
}
