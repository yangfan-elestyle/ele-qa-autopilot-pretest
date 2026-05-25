<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 theme-mask z-50 flex items-center justify-center p-4"
      @click="onMaskClick"
    >
      <div
        class="theme-manager-container w-full mx-auto flex flex-col overflow-hidden"
        style="max-width: 880px; max-height: 92vh"
        @click.stop
      >
        <header class="ds-modal-head">
          <div class="ds-modal-head-left">
            <h3 class="ds-modal-title">{{ modalTitle }} · {{ stepLabel }}</h3>
          </div>
          <div class="ds-modal-head-right">
            <button class="ds-icon-btn-sm" type="button" :disabled="busy" aria-label="关闭" @click="closeModal">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div class="ds-modal-body" style="padding: 16px; overflow: auto">
          <!-- 步骤 1: 异步拉源 (仅当 fetchSources 存在) -->
          <section v-if="step === 'fetching'">
            <div style="display: flex; align-items: center; gap: 12px; padding: 16px 8px">
              <div class="ds-ms-spinner"></div>
              <div>
                <div style="font-weight: 500">{{ fetchingLabel }}</div>
                <div style="font-size: 13px; opacity: 0.7; margin-top: 4px">
                  {{ fetched }} / {{ selectedCount }} 完成 · 失败 {{ failedFetch }}
                </div>
              </div>
            </div>
            <div v-if="error" class="ds-ms-error" style="margin-bottom: 8px">{{ error }}</div>
          </section>

          <!-- 步骤 2: 预览聚合 + prompt 模板编辑 -->
          <section v-if="step === 'preview'">
            <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px">
              已就绪 <strong>{{ items.length }}</strong> 条用例
              <template v-if="failedFetch">· <span style="color: var(--theme-danger, #b00)">{{ failedFetch }} 条失败 (已跳过)</span></template>.
              聚合文本作为 prompt 发给 harness, 模板内容注入 system. 输出按 "=== CASE N: " 头切片录入 Autopilot.
            </div>

            <div style="margin-bottom: 10px">
              <label style="display: block; font-size: 12px; opacity: 0.8; margin-bottom: 4px">
                system 模板 (preset 一键填入, 也可自由编辑; 作为 appendSystemPrompt 注入 harness)
              </label>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; align-items: center">
                <button
                  v-for="p in promptPresets"
                  :key="p.key"
                  class="ds-ms-btn ds-ms-btn--mini"
                  type="button"
                  :title="p.tip"
                  @click="applyPreset(p.key)"
                >{{ p.label }}</button>
                <span
                  v-if="!promptPresets.length"
                  style="font-size: 12px; opacity: 0.6"
                >尚无模板, 去【集成中心 → Autopilot 模板】配置</span>
              </div>
              <textarea
                v-model="promptTemplate"
                rows="6"
                style="width: 100%; font-size: 12px; font-family: ui-monospace, monospace; padding: 8px; border-radius: 4px; border: 1px solid var(--theme-border, #ccc); resize: vertical"
              />
            </div>

            <details style="margin-bottom: 12px">
              <summary style="cursor: pointer; font-size: 13px; padding: 4px 0">聚合预览 ({{ aggregatedText.length }} chars)</summary>
              <pre class="ds-ms-pre" style="max-height: 300px; overflow: auto; font-size: 12px; white-space: pre-wrap; padding: 8px; background: rgba(0,0,0,0.04); border-radius: 4px">{{ aggregatedText }}</pre>
            </details>

            <div v-if="error" class="ds-ms-error" style="margin-bottom: 8px">{{ error }}</div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px">
              <button class="ds-ms-btn" type="button" @click="closeModal">取消</button>
              <button
                class="ds-ms-btn ds-ms-btn--primary"
                :disabled="!items.length || !promptTemplate.trim()"
                @click="callHarness"
              >调 harness</button>
            </div>
          </section>

          <!-- 步骤 3: 调 harness 中 -->
          <section v-if="step === 'calling'">
            <div style="display: flex; align-items: center; gap: 12px; padding: 24px 8px">
              <div class="ds-ms-spinner"></div>
              <div>
                <div style="font-weight: 500">harness 处理中…</div>
                <div style="font-size: 13px; opacity: 0.7; margin-top: 4px">
                  需等待 AI 完成 oneshot 推理, 通常 10–90 秒. 已用 {{ elapsed }}s
                </div>
              </div>
            </div>
            <div v-if="error" class="ds-ms-error" style="margin-bottom: 8px">{{ error }}</div>
          </section>

          <!-- 步骤 4: 审阅切片 + 编辑 folder + 录入 -->
          <section v-if="step === 'edit'">
            <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px">
              harness 返回原文已展示. 可直接编辑下方文本, 切片按 "=== CASE N: " 头进行,
              解析得到 <strong>{{ parsedTasks.length }}</strong> 条 task.
            </div>
            <label style="display: block; font-size: 12px; opacity: 0.8; margin-bottom: 4px">harness 返回 (可编辑)</label>
            <textarea
              v-model="harnessText"
              style="width: 100%; min-height: 220px; max-height: 360px; font-size: 12px; font-family: ui-monospace, monospace; padding: 8px; border-radius: 4px; border: 1px solid var(--theme-border, #ccc); resize: vertical"
            />

            <div style="margin-top: 8px; font-size: 13px">
              解析出的 tasks:
              <ul style="margin: 4px 0 0 16px; padding: 0">
                <li v-for="(t, idx) in parsedTasks" :key="idx" style="font-size: 12px; opacity: 0.85">
                  {{ idx + 1 }}. <strong>{{ t.title }}</strong> ({{ t.text.length }} chars)
                </li>
                <li v-if="!parsedTasks.length" style="color: var(--theme-danger, #b00); font-size: 12px">
                  未解析到任何 task. 请检查文本是否包含 "=== CASE N: &lt;title&gt; ===" 头.
                </li>
              </ul>
            </div>

            <div style="margin-top: 12px">
              <label style="display: block; font-size: 12px; opacity: 0.8; margin-bottom: 4px">
                目标 folder_path (按 "/" 分段, autopilot 会逐级 upsert)
              </label>
              <input
                v-model="folderPath"
                type="text"
                list="autopilot-send-folder-history"
                style="width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--theme-border, #ccc); font-size: 13px"
                :placeholder="folderPlaceholder"
              />
              <datalist id="autopilot-send-folder-history">
                <option v-for="h in folderHistoryList" :key="h" :value="h" />
              </datalist>
              <div v-if="folderHistoryList.length" style="margin-top: 4px; font-size: 11px; opacity: 0.6">
                最近使用: {{ folderHistoryList.length }} 项, 输入框聚焦可下拉选择.
              </div>
            </div>

            <div v-if="error" class="ds-ms-error" style="margin-top: 8px">{{ error }}</div>

            <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 16px">
              <button class="ds-ms-btn" type="button" :disabled="ingesting" @click="resetToPreview">
                重选 prompt / 再调一次
              </button>
              <div style="display: flex; gap: 8px">
                <button class="ds-ms-btn" type="button" :disabled="ingesting" @click="closeModal">取消</button>
                <button
                  class="ds-ms-btn ds-ms-btn--primary"
                  :disabled="!parsedTasks.length || !folderPath.trim() || ingesting"
                  @click="callIngest"
                >{{ ingesting ? '录入中…' : `录入 ${parsedTasks.length} 条到 Autopilot` }}</button>
              </div>
            </div>
          </section>

          <!-- 步骤 5: 完成 -->
          <section v-if="step === 'done'">
            <div style="padding: 8px 0">
              <div style="font-size: 15px; font-weight: 500; margin-bottom: 8px; color: var(--theme-success, #2c8a4d)">
                录入成功: {{ ingestResult?.tasks.length ?? 0 }} 条 task
              </div>
              <div style="font-size: 13px; opacity: 0.85; margin-bottom: 8px">
                folder_id: <code>{{ ingestResult?.folder_id }}</code>
              </div>
              <div style="font-size: 13px; margin-bottom: 8px">
                <a :href="autopilotUrl" target="_blank" rel="noopener" style="color: var(--theme-link, #2563eb)">→ 打开 Autopilot 工作台</a>
              </div>
              <details v-if="showSourceMap && ingestSourceMap.length" style="margin-top: 8px" open>
                <summary style="cursor: pointer; font-size: 13px">录入对照 (Autopilot ↔ 源) · {{ ingestSourceMap.length }} 条</summary>
                <div style="max-height: 240px; overflow: auto; font-size: 12px; padding: 8px; background: rgba(0,0,0,0.04); border-radius: 4px; margin-top: 4px">
                  <div
                    v-for="row in ingestSourceMap"
                    :key="row.taskId"
                    style="display: grid; grid-template-columns: 80px 1fr 110px; gap: 6px; padding: 2px 0; align-items: baseline"
                  >
                    <span style="font-family: ui-monospace, monospace; opacity: 0.7">{{ row.sourceLabel }}</span>
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap" :title="row.title">{{ row.title }}</span>
                    <a
                      :href="taskPreviewUrl(row.taskId)"
                      target="_blank"
                      rel="noopener"
                      style="font-family: ui-monospace, monospace; color: var(--theme-link, #2563eb); text-decoration: none"
                      :title="`打开任务预览 ${row.taskId}`"
                    >#{{ row.taskId.slice(0, 8) }}</a>
                  </div>
                </div>
              </details>
              <details v-if="ingestResult?.tasks.length" style="margin-top: 8px">
                <summary style="cursor: pointer; font-size: 13px">原始 task ids ({{ ingestResult.tasks.length }}) · 点击直跳预览</summary>
                <div style="max-height: 200px; overflow: auto; font-size: 12px; padding: 8px; background: rgba(0,0,0,0.04); border-radius: 4px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px">
                  <a
                    v-for="t in ingestResult.tasks"
                    :key="t.id"
                    :href="taskPreviewUrl(t.id)"
                    target="_blank"
                    rel="noopener"
                    style="font-family: ui-monospace, monospace; color: var(--theme-link, #2563eb); text-decoration: none"
                    :title="`打开任务预览 ${t.id}`"
                  >#{{ t.id.slice(0, 8) }} · {{ t.id }}</a>
                </div>
              </details>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px">
              <button class="ds-ms-btn ds-ms-btn--primary" type="button" @click="closeModal">关闭</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { getApiBasePath } from '@prompt-optimizer/core'
import { useBrowserCache } from '../composables/useBrowserCache'
import {
  usePromptPresets,
  AUTOPILOT_DEFAULT_PROMPT_TEMPLATE,
} from '../composables/usePromptPresets'

// ── 类型 ─────────────────────────────────────────────────────────────────────
// 源条目: caseIndex 是 1-based, 与聚合产物里的 "CASE N" 头一一对应.
// label / meta 用于 enrich 与 sourceMap 显示, 完全由 panel 自定义.
export interface SourceItem<TMeta = unknown> {
  caseIndex: number
  label?: string
  meta?: TMeta
}

export interface ParsedTask {
  title: string
  text: string
  caseIndex: number
}

export interface EnrichedTask {
  title?: string
  text: string
  sourceLabel?: string
}

interface IngestResult {
  folder_id: string
  tasks: { id: string }[]
}

interface IngestSourceRow {
  taskId: string
  title: string
  sourceLabel: string
}

type FetchProgressCb = (fetched: number, failed: number) => void
export type FetchSourcesFn = (onProgress: FetchProgressCb) => Promise<{ items: SourceItem[] }>

// ── 默认 ─────────────────────────────────────────────────────────────────────
const AP_CASE_HEADER_RE = /^===\s*CASE\s+(\d+):\s*(.*?)\s*===\s*$/i
const AP_FOLDER_HISTORY_MAX = 8

// presets 现由用户在【集成中心 → Autopilot 模板】配置 (账号同步到云端 D1),
// 内置仅【传话人】1 个作默认.
const { presets: promptPresets } = usePromptPresets()

// ── Props / Emits ─────────────────────────────────────────────────────────────
const props = withDefaults(defineProps<{
  open: boolean
  modalTitle: string
  sourceTag: string
  selectedCount: number
  // 同步路径: items 已就绪, 跳过 fetching
  items?: SourceItem[]
  // 异步路径: 打开时调 fetchSources, 完成后取得 items
  fetchSources?: FetchSourcesFn
  fetchingLabel?: string
  buildAggregated: (items: SourceItem[]) => string
  enrichTask?: (parsed: ParsedTask, source: SourceItem | undefined) => EnrichedTask
  defaultFolderPath?: string
  folderPlaceholder?: string
  showSourceMap?: boolean
  // localStorage key (允许两个 panel 共享同一组 key)
  promptStorageKey?: string
  folderPathStorageKey?: string
  folderHistoryStorageKey?: string
}>(), {
  fetchingLabel: '并发拉取源详情…',
  defaultFolderPath: '',
  folderPlaceholder: '例: AutoTest / 传话人验证',
  showSourceMap: false,
  // .v3 后缀: 旧 .v2 残留的是 "调 Skill 原样返回" 模板 (传话人 bug 根因),
  // 升级后该走新 DEFAULT (inline SKILL.md 正文, LLM 自己执行 Step 1-4),
  // 直接换 key 让 useBrowserCache 走 default 分支.
  promptStorageKey: 'autopilot.send.promptTemplate.v3',
  folderPathStorageKey: 'autopilot.send.folderPath',
  folderHistoryStorageKey: 'autopilot.send.folderHistory',
})

const emit = defineEmits<{
  'update:open': [v: boolean]
  done: [result: IngestResult]
}>()

// ── 状态 ─────────────────────────────────────────────────────────────────────
type Step = 'fetching' | 'preview' | 'calling' | 'edit' | 'done'

const step = ref<Step>('preview')
const items = ref<SourceItem[]>([])
const fetched = ref(0)
const failedFetch = ref(0)
const elapsed = ref(0)
const harnessText = ref('')
const ingesting = ref(false)
const ingestResult = ref<IngestResult | null>(null)
const ingestSourceMap = reactive<IngestSourceRow[]>([])
const error = ref('')

const promptTemplate = useBrowserCache<string>(props.promptStorageKey, AUTOPILOT_DEFAULT_PROMPT_TEMPLATE)
const folderPath = useBrowserCache<string>(props.folderPathStorageKey, '')
const folderHistoryRaw = useBrowserCache<string>(props.folderHistoryStorageKey, '')

const folderHistoryList = computed<string[]>(() => {
  if (!folderHistoryRaw.value) return []
  try {
    const arr = JSON.parse(folderHistoryRaw.value)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.trim()) : []
  } catch { return [] }
})

function pushFolderHistory(path: string) {
  const trimmed = path.trim()
  if (!trimmed) return
  const prev = folderHistoryList.value.filter((p) => p !== trimmed)
  const next = [trimmed, ...prev].slice(0, AP_FOLDER_HISTORY_MAX)
  folderHistoryRaw.value = JSON.stringify(next)
}

const busy = computed(() => step.value === 'fetching' || step.value === 'calling' || ingesting.value)

const stepLabel = computed(() => {
  const max = props.fetchSources ? 5 : 4
  const map: Record<Step, string> = props.fetchSources
    ? { fetching: '1/5 拉取详情', preview: '2/5 预览 + prompt', calling: '3/5 harness 处理中', edit: '4/5 审阅录入', done: '5/5 完成' }
    : { fetching: '', preview: '1/4 预览 + prompt', calling: '2/4 harness 处理中', edit: '3/4 审阅录入', done: '4/4 完成' }
  return map[step.value] ?? `${max}步`
})

const aggregatedText = computed(() => {
  if (!items.value.length) return ''
  try { return props.buildAggregated(items.value) } catch { return '' }
})

const parsedTasks = computed<ParsedTask[]>(() => parseHarnessText(harnessText.value))

// 录入完成后直跳 Autopilot 工作台 + 锁定刚 upsert 的 folder; folderId deep link 协议
// 与 AdminTaskExplorer 约定 (?folderId=). folder_id 缺失时回退到根 /autopilot.
const autopilotUrl = computed(() => {
  const url = new URL('/autopilot', window.location.origin)
  const fid = ingestResult.value?.folder_id
  if (fid) url.searchParams.set('folderId', fid)
  return url.toString()
})

function taskPreviewUrl(taskId: string): string {
  return new URL(`/autopilot/preview/${encodeURIComponent(taskId)}`, window.location.origin).toString()
}

// ── 业务 ─────────────────────────────────────────────────────────────────────
function applyPreset(key: string) {
  const preset = promptPresets.value.find((p) => p.key === key)
  if (preset) promptTemplate.value = preset.template
}

// 协议: prompt = 聚合文本本身, template 作为 appendSystemPrompt 透传给 agentic-loop.
// (旧版把 template 与 【】 包裹的 aggregated 拼接成单一 prompt; 新版分离, LLM 收到
//  system 注入指令 + user prompt 是纯净的聚合文本.)
function buildHarnessPayload(template: string, aggregated: string): {
  prompt: string
  appendSystemPrompt?: string
} {
  const sys = template.trim()
  return sys ? { prompt: aggregated, appendSystemPrompt: sys } : { prompt: aggregated }
}

function parseHarnessText(text: string): ParsedTask[] {
  const lines = text.split(/\r?\n/)
  const sections: ParsedTask[] = []
  let current: { title: string; bodyLines: string[]; caseIndex: number } | null = null
  for (const line of lines) {
    const m = line.match(AP_CASE_HEADER_RE)
    if (m) {
      if (current) sections.push({ title: current.title, text: current.bodyLines.join('\n').trim(), caseIndex: current.caseIndex })
      current = { title: m[2] || `CASE ${m[1]}`, bodyLines: [], caseIndex: Number(m[1]) }
    } else if (current) {
      current.bodyLines.push(line)
    }
  }
  if (current) sections.push({ title: current.title, text: current.bodyLines.join('\n').trim(), caseIndex: current.caseIndex })
  return sections.filter((s) => s.text.length > 0)
}

function resolveSource(parsed: ParsedTask): SourceItem | undefined {
  if (!Number.isInteger(parsed.caseIndex) || parsed.caseIndex < 1) return undefined
  return items.value.find((s) => s.caseIndex === parsed.caseIndex)
}

async function callApi<T = any>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const url = `${getApiBasePath()}${path}`
  const resp = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  const text = await resp.text()
  let json: any
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  if (!resp.ok) {
    const msg = json?.error || json?.message || `HTTP ${resp.status}`
    throw new Error(`${msg}`)
  }
  // ingest / harness 走 `{ code, message, data }`; harness 等不带 code 的直返也兼容.
  const code = json?.code
  if (typeof code === 'number' && code !== 0 && code !== 200 && code !== 100200) {
    const msg = json?.message || json?.error || `business code ${code}`
    throw new Error(`${msg} (code=${code})`)
  }
  return json as T
}

let ticker: number | null = null
function clearTicker() {
  if (ticker !== null) {
    window.clearInterval(ticker)
    ticker = null
  }
}

function startElapsedTicker() {
  elapsed.value = 0
  const startedAt = Date.now()
  clearTicker()
  ticker = window.setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
  }, 1000)
}

async function runFetch() {
  if (!props.fetchSources) return
  step.value = 'fetching'
  fetched.value = 0
  failedFetch.value = 0
  try {
    const res = await props.fetchSources((f, fl) => {
      fetched.value = f
      failedFetch.value = fl
    })
    items.value = res.items
    if (!items.value.length) {
      error.value = '所有详情均拉取失败, 无法继续'
      return
    }
    if (!folderPath.value.trim() && props.defaultFolderPath.trim()) {
      folderPath.value = props.defaultFolderPath
    }
    step.value = 'preview'
  } catch (e: any) {
    error.value = `拉取失败: ${e?.message ?? e}`
  }
}

async function callHarness() {
  if (step.value !== 'preview') return
  if (!items.value.length || !promptTemplate.value.trim()) return
  error.value = ''
  step.value = 'calling'
  startElapsedTicker()
  try {
    const payload = buildHarnessPayload(promptTemplate.value, aggregatedText.value)
    const res = await callApi<{ text: string; sessionId?: string }>(
      'POST',
      '/api/harness/oneshot',
      { ...payload, source: props.sourceTag },
    )
    harnessText.value = res?.text ?? ''
    if (!harnessText.value.trim()) throw new Error('harness 返回空文本')
    step.value = 'edit'
  } catch (e: any) {
    error.value = `harness 调用失败: ${e?.message ?? e}`
    step.value = 'preview'
  } finally {
    clearTicker()
  }
}

async function callIngest() {
  if (ingesting.value) return
  error.value = ''
  ingesting.value = true
  try {
    const segs = folderPath.value.split('/').map((s) => s.trim()).filter(Boolean)
    if (!segs.length) throw new Error('folder_path 不能为空')
    if (!parsedTasks.value.length) throw new Error('未解析到任何 task, 无法录入')

    // enrich: panel 提供 enrichTask 时按其结果替换 title/text, 否则用 parsed 原样.
    const enriched = parsedTasks.value.map((p) => {
      const src = resolveSource(p)
      const e = props.enrichTask ? props.enrichTask(p, src) : { title: p.title, text: p.text, sourceLabel: src?.label }
      return {
        title: e.title ?? p.title,
        text: e.text ?? p.text,
        sourceLabel: e.sourceLabel ?? src?.label ?? '—',
      }
    })

    const payload = {
      source: props.sourceTag,
      folder_path: segs,
      tasks: enriched.map(({ title, text }) => ({ title, text })),
    }
    const res = await callApi<{ data: IngestResult }>('POST', '/api/autopilot/ingest', payload)
    if (!res?.data?.folder_id || !Array.isArray(res?.data?.tasks)) {
      throw new Error(`返回结构异常: ${JSON.stringify(res).slice(0, 300)}`)
    }
    ingestResult.value = res.data
    ingestSourceMap.splice(0, ingestSourceMap.length)
    res.data.tasks.forEach((t, i) => {
      const e = enriched[i]
      ingestSourceMap.push({
        taskId: t.id,
        title: e?.title ?? `task ${i + 1}`,
        sourceLabel: e?.sourceLabel ?? '—',
      })
    })
    pushFolderHistory(folderPath.value)
    step.value = 'done'
    emit('done', res.data)
  } catch (e: any) {
    error.value = `autopilot 录入失败: ${e?.message ?? e}`
  } finally {
    ingesting.value = false
  }
}

function resetToPreview() {
  if (ingesting.value) return
  step.value = 'preview'
  error.value = ''
}

function closeModal() {
  if (busy.value) return
  emit('update:open', false)
}

function onMaskClick() {
  closeModal()
}

// ── 生命周期 ─────────────────────────────────────────────────────────────────
// open: false→true 触发初始化; true→false 不动状态, 让关闭过场不闪 (用户重开再 reset).
// 真正的状态重置在 open 由 false 切到 true 时执行.
watch(() => props.open, (now, prev) => {
  if (now && !prev) {
    initOnOpen()
  }
})

function initOnOpen() {
  error.value = ''
  fetched.value = 0
  failedFetch.value = 0
  elapsed.value = 0
  harnessText.value = ''
  ingestResult.value = null
  ingestSourceMap.splice(0, ingestSourceMap.length)
  ingesting.value = false
  clearTicker()

  if (props.fetchSources) {
    items.value = []
    runFetch()
  } else {
    items.value = props.items ?? []
    if (!folderPath.value.trim() && props.defaultFolderPath.trim()) {
      folderPath.value = props.defaultFolderPath
    }
    step.value = 'preview'
  }
}

// items prop 在 modal 已打开 + 非 fetching 模式时同步进来 (panel 可能在 modal 开着时改选).
// 仅在 preview 阶段同步; calling/edit/done 阶段不动, 避免破坏已发生的 harness 结果.
watch(() => props.items, (next) => {
  if (!props.open || props.fetchSources) return
  if (step.value !== 'preview') return
  items.value = next ?? []
})

onBeforeUnmount(clearTicker)
</script>

<style scoped>
.ds-ms-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--theme-border, #ddd);
  border-top-color: var(--theme-primary, #2563eb);
  border-radius: 50%;
  animation: ds-ms-spin 0.8s linear infinite;
  flex: 0 0 auto;
}
@keyframes ds-ms-spin {
  to { transform: rotate(360deg); }
}
</style>
