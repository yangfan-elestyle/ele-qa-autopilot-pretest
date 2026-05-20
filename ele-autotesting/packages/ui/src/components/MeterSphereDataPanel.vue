<template>
  <div class="ds-ms-panel">
    <!-- 凭据 + 项目/模块选择 -->
    <div class="ds-ms-controls">
      <div class="ds-ms-field">
        <label>Access Key</label>
        <input v-model="ak" type="password" placeholder="AK (16 字符)" autocomplete="off" />
      </div>
      <div class="ds-ms-field">
        <label>Secret Key</label>
        <input v-model="sk" type="password" placeholder="SK (16/24/32 字符)" autocomplete="off" />
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
        <button class="ds-ms-btn" :disabled="!ak || !sk || loading.projects" @click="loadProjects">
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
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getApiBasePath } from '@prompt-optimizer/core'
import { useBrowserCache } from '../composables/useBrowserCache'

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

// AK/SK 走通用浏览器缓存, 与 AutotestCasesPanel 共享同一组 localStorage key.
// projectId / moduleId 同走 useBrowserCache: 用户上次选过的项目与模块刷新后自动恢复,
// 配合 onMounted 自动联动可一路拉到该模块的 cases, 减少重复点击.
const ak = useBrowserCache<string>('metersphere.ak', '')
const sk = useBrowserCache<string>('metersphere.sk', '')
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
  return {
    'content-type': 'application/json',
    'x-ms-ak': ak.value.trim(),
    'x-ms-sk': sk.value.trim(),
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
  // 上游 MS 走 `{ code, message, data }`, 0/200 为成功; HTTP 200 + code 非成功当前会被前端误判.
  // 仅当 code 字段存在且为数字时校验, 兼容无 code 字段的边界响应.
  const code = json?.code
  if (typeof code === 'number' && code !== 0 && code !== 200) {
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
onMounted(async () => {
  if (!ak.value.trim() || !sk.value.trim()) return
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
</script>
