<template>
  <div class="ds-ms-panel">
    <!-- 凭据 + 项目/模块选择 -->
    <div class="ds-ms-controls">
      <div class="ds-ms-field ds-ms-field--status">
        <label>MeterSphere 凭证</label>
        <div class="ds-ms-status-row">
          <span v-if="msConfigured" class="ds-integration-status-tag ds-integration-status-tag--ok">已配置 · 云端</span>
          <span v-else-if="msStatusLoaded" class="ds-integration-status-tag ds-integration-status-tag--off">未配置</span>
          <span v-else class="ds-integration-status-tag">检查中…</span>
          <span v-if="msStatusLoaded && !msConfigured" class="ds-ms-hint">
            请到「集成中心 → MeterSphere」填写 AK / SK
          </span>
        </div>
      </div>
      <div class="ds-ms-field">
        <label>项目</label>
        <select v-model="projectId" :disabled="!projects.length">
          <option value="">{{ projects.length ? '请选择' : '尚未加载' }}</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="ds-ms-field ds-ms-field--tree">
        <label>模块 (可选, 不选 = 全部)</label>
        <input
          v-model="moduleKeyword"
          class="ds-ms-search"
          type="search"
          placeholder="搜索模块名…"
          :disabled="!modulesFlat.length"
          style="max-width: none; margin-bottom: 4px"
        />
        <select v-model="moduleId" :disabled="!modulesFlat.length" @change="onModuleChange">
          <option value="">{{ modulesFlat.length ? '全部' : '尚未加载' }}</option>
          <option v-for="m in modulesFiltered" :key="m.id" :value="m.id">
            {{ '— '.repeat(m.depth) }}{{ m.name }}
          </option>
        </select>
      </div>
      <div class="ds-ms-actions">
        <button class="ds-ms-btn" :disabled="!msConfigured || loading.projects" @click="loadProjects">
          {{ loading.projects ? '加载…' : '拉项目' }}
        </button>
        <button class="ds-ms-btn" :disabled="!projectId || loading.modules" @click="loadModules">
          {{ loading.modules ? '加载…' : '拉模块' }}
        </button>
        <button class="ds-ms-btn ds-ms-btn--primary" :disabled="!projectId || loading.cases" @click="loadCases(1)">
          {{ loading.cases ? '加载…' : '拉用例' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="ds-ms-error">{{ error }}</div>

    <!-- 用例表 toolbar -->
    <div class="ds-ms-toolbar">
      <span class="ds-ms-toolbar-title">MeterSphere 用例</span>
      <input
        v-model="caseKeyword"
        class="ds-ms-search"
        type="search"
        placeholder="搜索 名称 / 标签 / 创建人"
      />
      <span class="ds-ms-toolbar-meta">
        {{ cases.length }} / {{ caseTotal || cases.length }} 条
        <template v-if="caseTotal">· 第 {{ casePage }} 页 / {{ Math.max(1, Math.ceil(caseTotal / casePageSize)) }}</template>
        <template v-if="selectedIds.size">· 已选 {{ selectedIds.size }}</template>
      </span>
      <div class="ds-ms-actions">
        <button
          class="ds-ms-btn ds-ms-btn--primary"
          :disabled="!canSendAutopilot"
          :title="sendAutopilotDisabledReason"
          @click="openSendAutopilot"
        >送至 Autopilot</button>
      </div>
    </div>

    <div class="ds-ms-table-wrap">
      <table class="ds-ms-table">
        <thead>
          <tr>
            <th style="width: 32px">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate.prop="someSelected && !allSelected"
                @change="toggleAll(($event.target as HTMLInputElement).checked)"
                aria-label="全选"
              />
            </th>
            <th style="width: 56px">#</th>
            <th style="width: 26%">名称</th>
            <th style="width: 12%">类型</th>
            <th>Tags</th>
            <th style="width: 14%">创建人</th>
            <th style="width: 18%">创建时间</th>
            <th style="width: 68px"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in cases" :key="row.id">
            <tr :class="{ 'ds-ms-row--selected': selectedIds.has(row.id) }">
              <td>
                <input
                  type="checkbox"
                  :checked="selectedIds.has(row.id)"
                  @change="toggleOne(row.id, ($event.target as HTMLInputElement).checked)"
                  :aria-label="`选中 ${row.name}`"
                />
              </td>
              <td>{{ row.num }}</td>
              <td>{{ row.name }}</td>
              <td>{{ row.caseEditType }}</td>
              <td>
                <span v-for="t in (row.tags ?? [])" :key="t" class="ds-ms-tag">{{ t }}</span>
              </td>
              <td>{{ row.createUserName ?? row.createUser ?? '—' }}</td>
              <td>{{ formatTs(row.createTime) }}</td>
              <td>
                <button class="ds-ms-btn ds-ms-btn--mini" @click="toggleDetail(row.id)">
                  {{ expandedId === row.id ? '收起' : '详情' }}
                </button>
              </td>
            </tr>
            <tr v-if="expandedId === row.id">
              <td colspan="8" class="ds-ms-detail-cell">
                <div v-if="loadingDetail" class="ds-ms-empty">加载详情中…</div>
                <div v-else-if="detailError" class="ds-ms-error">{{ detailError }}</div>
                <div v-else-if="detail" class="ds-ms-detail">
                  <div class="ds-ms-detail-row">
                    <span class="ds-ms-detail-label">模块</span>
                    <span>{{ detail.moduleName ?? '—' }}</span>
                  </div>
                  <div class="ds-ms-detail-row" v-if="detail.prerequisite">
                    <span class="ds-ms-detail-label">前置条件</span>
                    <pre class="ds-ms-pre">{{ detail.prerequisite }}</pre>
                  </div>
                  <div class="ds-ms-detail-row" v-if="detail.caseEditType === 'STEP' && parsedSteps.length">
                    <span class="ds-ms-detail-label">步骤</span>
                    <ol class="ds-ms-detail-steps">
                      <li v-for="(s, i) in parsedSteps" :key="s.id ?? i">
                        <div><strong>步骤:</strong> <span>{{ s.desc || '—' }}</span></div>
                        <div v-if="s.result"><strong>期望:</strong> <span>{{ s.result }}</span></div>
                      </li>
                    </ol>
                  </div>
                  <div class="ds-ms-detail-row" v-if="detail.caseEditType === 'TEXT'">
                    <span class="ds-ms-detail-label">描述</span>
                    <pre class="ds-ms-pre">{{ detail.textDescription }}</pre>
                    <span class="ds-ms-detail-label">期望</span>
                    <pre class="ds-ms-pre">{{ detail.expectedResult }}</pre>
                  </div>
                  <div class="ds-ms-detail-row" v-if="detail.description">
                    <span class="ds-ms-detail-label">备注</span>
                    <pre class="ds-ms-pre">{{ detail.description }}</pre>
                  </div>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!cases.length">
            <td colspan="8" class="ds-ms-empty">{{ loading.cases ? '加载中…' : (caseKeyword.trim() ? '无匹配' : '尚未拉取或无数据') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="caseTotal > casePageSize" class="ds-ms-pager">
      <button class="ds-ms-btn ds-ms-btn--mini" :disabled="casePage <= 1 || loading.cases" @click="loadCases(casePage - 1)">上一页</button>
      <span>{{ casePage }}</span>
      <button class="ds-ms-btn ds-ms-btn--mini" :disabled="casePage * casePageSize >= caseTotal || loading.cases" @click="loadCases(casePage + 1)">下一页</button>
    </div>

    <!-- 送至 Autopilot: 共用 modal, 见 SendToAutopilotModal.vue -->
    <SendToAutopilotModal
      v-model:open="sendAutopilotOpen"
      modal-title="MS 用例 → Autopilot"
      source-tag="autotesting"
      :selected-count="selectedIds.size"
      :fetch-sources="fetchMsDetails"
      fetching-label="并发拉取 MS 用例详情…"
      :build-aggregated="buildAggregatedFromItems"
      :enrich-task="enrichMsTask"
      :default-folder-path="apDefaultFolderPath"
      :folder-placeholder="apFolderPlaceholder"
      :show-source-map="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getApiBasePath } from '@prompt-optimizer/core'
import { useBrowserCache } from '../composables/useBrowserCache'
import SendToAutopilotModal, {
  type SourceItem,
  type ParsedTask,
  type EnrichedTask,
} from './SendToAutopilotModal.vue'

interface MsProject { id: string; name: string; organizationId?: string }
interface MsModuleNode { id: string; name: string; parentId: string; children?: MsModuleNode[] }
interface MsFlatModule { id: string; name: string; depth: number }
interface MsCase {
  id: string
  num: number
  name: string
  caseEditType?: string
  tags?: string[]
  createTime?: number
  createUser?: string
  createUserName?: string
}
interface MsCaseDetail {
  id: string
  num: number
  name: string
  moduleId?: string
  moduleName?: string
  caseEditType?: 'STEP' | 'TEXT' | string
  prerequisite?: string
  steps?: string
  textDescription?: string
  expectedResult?: string
  description?: string
  tags?: string[]
}
interface MsStepItem { id?: string; num?: number; desc?: string; result?: string }

// AK/SK 已迁到集成中心 -> Cloudflare D1 (owner-scoped); 本面板只读 configured 状态,
// 不再持有明文. projectId / moduleId 仍走 useBrowserCache: 用户上次选过的项目/模块刷新后
// 自动恢复, 配合 onMounted 自动联动一路拉到该模块的 cases, 减少重复点击.
const msConfigured = ref(false)
const msStatusLoaded = ref(false)
const projectId = useBrowserCache<string>('metersphere.projectId', '')
const moduleId = useBrowserCache<string>('metersphere.moduleId', '')
const moduleKeyword = ref('')
const caseKeyword = ref('')

const projects = ref<MsProject[]>([])
const modulesFlat = ref<MsFlatModule[]>([])
const cases = ref<MsCase[]>([])
const caseTotal = ref(0)
const casePage = ref(1)
// 100 是经验值: 表格仍可流畅渲染, 上游 MS `/functional/case/page` pageSize 在 200 内稳定;
// server 端 clamp 至 500 上限. 用户嫌一次 20 太少 → 调到 100.
const casePageSize = ref(100)

const loading = ref({ projects: false, modules: false, cases: false })
const error = ref('')

const selectedIds = ref<Set<string>>(new Set())
const expandedId = ref<string | null>(null)
const detail = ref<MsCaseDetail | null>(null)
const loadingDetail = ref(false)
const detailError = ref('')

const modulesFiltered = computed(() => {
  const kw = moduleKeyword.value.trim().toLowerCase()
  if (!kw) return modulesFlat.value
  return modulesFlat.value.filter((m) => m.name.toLowerCase().includes(kw))
})

// 用例检索改走上游 MS `/functional/case/page` 的 keyword 字段 (按 name/num/id/tag 模糊匹配),
// 不再仅过滤本页. 客户端只渲染上游返回结果.
const allSelected = computed(() => cases.value.length > 0 && cases.value.every((c) => selectedIds.value.has(c.id)))
const someSelected = computed(() => cases.value.some((c) => selectedIds.value.has(c.id)))

const parsedSteps = computed<MsStepItem[]>(() => {
  const raw = detail.value?.steps
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
})

function toggleOne(id: string, on: boolean) {
  const next = new Set(selectedIds.value)
  if (on) next.add(id); else next.delete(id)
  selectedIds.value = next
}

function toggleAll(on: boolean) {
  const next = new Set(selectedIds.value)
  for (const c of cases.value) {
    if (on) next.add(c.id); else next.delete(c.id)
  }
  selectedIds.value = next
}

function buildHeaders(extra: Record<string, string> = {}): HeadersInit {
  // AK/SK 由 Worker 按 ownerId 从 D1 集成中心配置读出后做签名, 前端不再透传.
  return {
    'content-type': 'application/json',
    ...extra,
  }
}

async function callApi<T = any>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const url = `${getApiBasePath()}${path}`
  const resp = await fetch(url, {
    method,
    headers: buildHeaders(),
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
  // 上游 MS 走 `{ code, message, data }`. 成功码: MS v3 = 100200 (MsHttpResultCode.SUCCESS), v2 = 0;
  // 200 仅做历史兜底. 仅当 code 字段存在且为数字时校验, 兼容无 code 字段的边界响应.
  const code = json?.code
  if (typeof code === 'number' && code !== 0 && code !== 200 && code !== 100200) {
    const msg = json?.message || json?.error || `business code ${code}`
    throw new Error(`${msg} (code=${code})`)
  }
  return json as T
}

async function loadProjects() {
  error.value = ''
  loading.value.projects = true
  try {
    const res = await callApi<any>('POST', '/api/ms/projects', { current: 1, pageSize: 100 })
    const list: MsProject[] = res?.data?.list ?? res?.data ?? []
    projects.value = list.map((p) => ({ id: p.id, name: p.name, organizationId: p.organizationId }))
    if (!projects.value.length) error.value = '项目列表为空 (确认 AK 是否有项目读权限)'
  } catch (e: any) {
    error.value = `拉项目失败: ${e?.message ?? e}`
  } finally {
    loading.value.projects = false
  }
}

async function loadModules() {
  if (!projectId.value) return
  error.value = ''
  loading.value.modules = true
  try {
    const res = await callApi<any>('GET', `/api/ms/modules?projectId=${encodeURIComponent(projectId.value)}`)
    const tree: MsModuleNode[] = res?.data ?? []
    modulesFlat.value = flattenTree(tree, 0)
  } catch (e: any) {
    error.value = `拉模块失败: ${e?.message ?? e}`
  } finally {
    loading.value.modules = false
  }
}

function flattenTree(nodes: MsModuleNode[], depth: number): MsFlatModule[] {
  const out: MsFlatModule[] = []
  for (const n of nodes ?? []) {
    out.push({ id: n.id, name: n.name, depth })
    if (n.children?.length) out.push(...flattenTree(n.children, depth + 1))
  }
  return out
}

async function loadCases(page: number) {
  if (!projectId.value) return
  error.value = ''
  loading.value.cases = true
  try {
    const res = await callApi<any>('POST', '/api/ms/cases', {
      projectId: projectId.value,
      moduleIds: moduleId.value ? [moduleId.value] : [],
      current: page,
      pageSize: casePageSize.value,
      keyword: caseKeyword.value.trim(),
    })
    const list: MsCase[] = res?.data?.list ?? []
    cases.value = list
    caseTotal.value = Number(res?.data?.total ?? 0)
    casePage.value = page
    // 翻页 / 切项目时清空选中与展开, 避免错位.
    selectedIds.value = new Set()
    expandedId.value = null
    detail.value = null
  } catch (e: any) {
    error.value = `拉用例失败: ${e?.message ?? e}`
  } finally {
    loading.value.cases = false
  }
}

async function toggleDetail(id: string) {
  if (expandedId.value === id) {
    expandedId.value = null
    detail.value = null
    detailError.value = ''
    return
  }
  expandedId.value = id
  detail.value = null
  detailError.value = ''
  loadingDetail.value = true
  try {
    const res = await callApi<any>('GET', `/api/ms/case/${encodeURIComponent(id)}`)
    detail.value = res?.data ?? null
    if (!detail.value) detailError.value = '上游未返回详情数据'
  } catch (e: any) {
    detailError.value = `拉详情失败: ${e?.message ?? e}`
  } finally {
    loadingDetail.value = false
  }
}

// projectId 变化 -> 清依赖状态; 新值非空时并发拉模块 + 用例 (全部, moduleId 已 reset 为 '').
// loadModules 与 loadCases 都只依赖 projectId, 不必排序; 各自处理 loading / error.
watch(projectId, (next) => {
  modulesFlat.value = []
  moduleId.value = ''
  cases.value = []
  caseTotal.value = 0
  selectedIds.value = new Set()
  expandedId.value = null
  detail.value = null
  if (next) {
    loadModules()
    loadCases(1)
  }
})

// 用户主动选模块 -> 拉该模块用例. 走 @change 而非 watch(moduleId), 避免 projectId reset
// 时同步重置 moduleId 误触发. v-model 先更新 ref 再触发 @change, 此处 moduleId.value 已是新值.
function onModuleChange() {
  if (projectId.value) loadCases(1)
}

// 关键词搜索走上游 MS keyword 字段, 翻页时也保留过滤. debounce 350ms 避免敲键瞬时刷.
let caseKeywordTimer: ReturnType<typeof setTimeout> | null = null
watch(caseKeyword, () => {
  if (caseKeywordTimer) clearTimeout(caseKeywordTimer)
  caseKeywordTimer = setTimeout(() => {
    if (projectId.value) loadCases(1)
  }, 350)
})

// 组件销毁时清掉未 fire 的 timer, 否则 modal 关闭 (DataLinkagePanel v-if=false) 后
// timer 仍会回调 loadCases, 触发无效 fetch + 潜在 unhandled rejection.
onBeforeUnmount(() => {
  if (caseKeywordTimer) {
    clearTimeout(caseKeywordTimer)
    caseKeywordTimer = null
  }
})

// 挂载时基于浏览器缓存自动联动:
//   AK/SK 缓存 → 拉项目 → 命中缓存 projectId → 拉模块 + 用例 (用例用缓存 moduleId, 若有效)
// 任一缓存失效 (上游已删 / 换组织等), 清掉该层缓存避免下次再误命中;
// watch(projectId) 已处理"项目变 → 重置 modules/cases", 失效时设 projectId.value=''
// 即可触发清空, 不必在此重复.
async function loadMsConfigured() {
  try {
    const res = await fetch(`${getApiBasePath()}/api/integrations/metersphere`, { credentials: 'include' })
    if (!res.ok) return
    const json = await res.json().catch(() => ({}))
    msConfigured.value = !!json?.configured
  } catch {
    // 沉默: 网络问题 (TypeError: Failed to fetch / CORS) 不应打断 onMounted 链路;
    // msConfigured 保持 false, UI 会提示用户去集成中心检查. 与 AutotestCasesPanel 同口径.
  } finally {
    msStatusLoaded.value = true
  }
}

onMounted(async () => {
  await loadMsConfigured()
  if (!msConfigured.value) return
  await loadProjects()
  const cachedPid = projectId.value
  if (!cachedPid) return
  if (!projects.value.find((p) => p.id === cachedPid)) {
    projectId.value = ''
    return
  }
  // 缓存项目仍有效: 不会触发 watch(projectId) (值没变), 手动并发拉模块 + 用例.
  await loadModules()
  if (moduleId.value && !modulesFlat.value.find((m) => m.id === moduleId.value)) {
    moduleId.value = ''
  }
  loadCases(1)
})

function formatTs(ts?: number) {
  if (!ts) return '—'
  try { return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) } catch { return String(ts) }
}

// ── 送至 Autopilot ─────────────────────────────────────────────────────────
// modal 状态机 / prompt 模板 / folder 历史 / harness + ingest 调用都在共用组件
// SendToAutopilotModal 内. 本 panel 仅负责: 1) 触发"送至 Autopilot"的按钮态;
// 2) fetchMsDetails 把选中的 MS case id 并发拉详情转成 SourceItem 列表;
// 3) buildAggregatedFromItems 把详情拼成 harness 输入文本;
// 4) enrichMsTask 把 MS 元数据 (项目/编号/ID/模块) 注入 task 的 title / text.

const sendAutopilotOpen = ref(false)

// Autopilot ingest API 的 title 长度上限 (与 ele-autopilot/app/routes/api.v1.ingest.tasks.tsx
// `TASK_TITLE_MAX` 同值). 加 [MS #num] 前缀后超限的原 title 会被截尾 + ellipsis.
const AP_TASK_TITLE_MAX = 200

const canSendAutopilot = computed(() => selectedIds.value.size > 0 && msConfigured.value)
const sendAutopilotDisabledReason = computed(() => {
  if (!selectedIds.value.size) return '请先选中至少一条 MS 用例'
  if (!msConfigured.value) return '请先到「集成中心 → MeterSphere」配置凭证'
  return ''
})

const apFolderPlaceholder = computed(() => {
  const proj = projects.value.find((p) => p.id === projectId.value)?.name?.trim()
  return proj ? `例: MeterSphere / ${proj}` : '例: MeterSphere / <项目名>'
})

// 默认 folder_path 由当前项目名建议; modal 内部仅在 useBrowserCache 缓存为空时套用.
const apDefaultFolderPath = computed(() => {
  const proj = projects.value.find((p) => p.id === projectId.value)?.name?.trim()
  return proj ? `MeterSphere / ${proj}` : ''
})

function openSendAutopilot() {
  if (!canSendAutopilot.value) return
  sendAutopilotOpen.value = true
}

// SourceItem.meta 携带 MS 详情, 供 buildAggregated / enrichMsTask 使用.
async function fetchMsDetails(onProgress: (fetched: number, failed: number) => void): Promise<{ items: SourceItem[] }> {
  const ids = Array.from(selectedIds.value)
  // 并发上限 5, 避免一次性给上游 MS / VPC 打太多并发.
  const concurrency = 5
  let cursor = 0
  let fetched = 0
  let failed = 0
  const results: MsCaseDetail[] = []

  async function worker() {
    while (cursor < ids.length) {
      const i = cursor++
      const id = ids[i]
      try {
        const res = await callApi<any>('GET', `/api/ms/case/${encodeURIComponent(id)}`)
        const d: MsCaseDetail | null = res?.data ?? null
        if (d) results.push(d)
        else { failed += 1 }
      } catch {
        failed += 1
      } finally {
        fetched += 1
        onProgress(fetched, failed)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, () => worker()))

  // 按原列表 num 排序, 避免并发顺序错乱.
  results.sort((a, b) => (a.num ?? 0) - (b.num ?? 0))

  // caseIndex 是 1-based, 对应聚合产物里的 "CASE N" 头, 也是 SendToAutopilotModal
  // 解析 harness 返回切片后回填 source meta 的索引依据.
  const items: SourceItem<MsCaseDetail>[] = results.map((d, idx) => ({
    caseIndex: idx + 1,
    label: `#${d.num}`,
    meta: d,
  }))
  return { items }
}

function buildAggregatedFromItems(items: SourceItem[]): string {
  const parts = items.map((it) => {
    const d = it.meta as MsCaseDetail | undefined
    if (!d) return `=== CASE ${it.caseIndex}: ${it.label ?? ''} ===`
    let stepsBlock = ''
    if (d.caseEditType === 'STEP') {
      try {
        const arr = JSON.parse(d.steps ?? '[]')
        if (Array.isArray(arr) && arr.length) {
          stepsBlock = '\n步骤:\n' + arr
            .map((s: any, i: number) => {
              const desc = (s?.desc ?? '').trim()
              const result = (s?.result ?? '').trim()
              return result ? `${i + 1}. ${desc} → 期望: ${result}` : `${i + 1}. ${desc}`
            })
            .join('\n')
        }
      } catch { /* steps 字段不是 json, 忽略 */ }
    } else if (d.caseEditType === 'TEXT' && d.textDescription) {
      stepsBlock = `\n描述:\n${d.textDescription}`
    }
    const expectedLine = d.expectedResult?.trim() ? `\n期望: ${d.expectedResult.trim()}` : ''
    const preReqLine = d.prerequisite?.trim() ? `\n前置: ${d.prerequisite.trim()}` : ''
    const tagsLine = d.tags?.length ? `\n标签: ${d.tags.join(', ')}` : ''
    return `=== CASE ${it.caseIndex}: ${d.name} ===
模块: ${d.moduleName ?? '—'}${preReqLine}${stepsBlock}${expectedLine}${tagsLine}`
  })
  return parts.join('\n\n')
}

function buildEnrichedTitle(rawTitle: string, detail: MsCaseDetail): string {
  const prefix = `[MS #${detail.num}] `
  if (!rawTitle.trim()) return prefix.trimEnd()
  const combined = `${prefix}${rawTitle}`
  if (combined.length <= AP_TASK_TITLE_MAX) return combined
  // 给省略号留 1 字符. prefix 一般 ≤ 16, 即便 num 极长也极少超 200.
  const allowed = Math.max(1, AP_TASK_TITLE_MAX - prefix.length - 1)
  return `${prefix}${rawTitle.slice(0, allowed)}…`
}

// 把 MS 元数据追加到 task.text 末尾, 用 markdown 引用块 (`> `) 隔离: autopilot UI 渲染时
// 可见, browser-use agent 看到引用块通常会跳过, 不影响执行.
function buildTaskTextWithSource(rawText: string, detail: MsCaseDetail): string {
  const projectName = projects.value.find((p) => p.id === projectId.value)?.name?.trim()
  const metaLines: string[] = [
    '',
    '---',
    '> **来源**: MeterSphere',
    `> 用例编号: #${detail.num}`,
    `> 用例 ID: \`${detail.id}\``,
  ]
  if (projectName) metaLines.push(`> 项目: ${projectName}`)
  if (detail.moduleName?.trim()) metaLines.push(`> 模块: ${detail.moduleName.trim()}`)
  if (detail.tags?.length) metaLines.push(`> 标签: ${detail.tags.join(', ')}`)
  return `${rawText}\n${metaLines.join('\n')}`
}

function enrichMsTask(parsed: ParsedTask, source: SourceItem | undefined): EnrichedTask {
  const detail = source?.meta as MsCaseDetail | undefined
  if (!detail) return { title: parsed.title, text: parsed.text, sourceLabel: '—' }
  return {
    title: buildEnrichedTitle(parsed.title || detail.name || '', detail),
    text: buildTaskTextWithSource(parsed.text, detail),
    sourceLabel: `#${detail.num}`,
  }
}
</script>
