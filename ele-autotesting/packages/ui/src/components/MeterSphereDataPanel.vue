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

    <!-- 送至 Autopilot 弹框: 拉详情 -> 预览 + prompt 编辑 -> harness -> 切片审阅 + folder -> 录入 -->
    <Teleport to="body">
      <div v-if="ap.open" class="fixed inset-0 theme-mask z-50 flex items-center justify-center p-4" @click="closeSendAutopilot">
        <div
          class="theme-manager-container w-full mx-auto flex flex-col overflow-hidden"
          style="max-width: 880px; max-height: 92vh"
          @click.stop
        >
          <header class="ds-modal-head">
            <div class="ds-modal-head-left">
              <h3 class="ds-modal-title">MS 用例 → Autopilot · {{ apStepLabel }}</h3>
            </div>
            <div class="ds-modal-head-right">
              <button class="ds-icon-btn-sm" type="button" @click="closeSendAutopilot" :disabled="apBusy" aria-label="关闭">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div class="ds-modal-body" style="padding: 16px; overflow: auto">
            <!-- 步骤 1: 拉详情 -->
            <section v-if="ap.step === 'fetching'">
              <div style="display: flex; align-items: center; gap: 12px; padding: 16px 8px">
                <div class="ds-ms-spinner"></div>
                <div>
                  <div style="font-weight: 500">并发拉取 MS 用例详情…</div>
                  <div style="font-size: 13px; opacity: 0.7; margin-top: 4px">
                    {{ ap.fetched }} / {{ ap.total }} 完成 · 失败 {{ ap.failedFetch }}
                  </div>
                </div>
              </div>
              <div v-if="ap.error" class="ds-ms-error" style="margin-bottom: 8px">{{ ap.error }}</div>
            </section>

            <!-- 步骤 2: 预览聚合 + prompt 模板编辑 -->
            <section v-if="ap.step === 'preview'">
              <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px">
                已拉取 <strong>{{ ap.details.length }}</strong> 条 MS 用例详情
                <template v-if="ap.failedFetch">· <span style="color: var(--theme-danger, #b00)">{{ ap.failedFetch }} 条失败 (已跳过)</span></template>.
                聚合成一段文本, 经 harness 走 prompt 模板处理后, 按 "=== CASE N: " 头切片录入 Autopilot.
              </div>

              <div style="margin-bottom: 10px">
                <label style="display: block; font-size: 12px; opacity: 0.8; margin-bottom: 4px">
                  prompt 模板 (preset 一键填入, 也可自由编辑; 模板尾部会自动拼接聚合后的用例文本)
                </label>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px">
                  <button
                    v-for="p in promptPresets"
                    :key="p.key"
                    class="ds-ms-btn ds-ms-btn--mini"
                    type="button"
                    :title="p.tip"
                    @click="applyPreset(p.key)"
                  >{{ p.label }}</button>
                </div>
                <textarea
                  v-model="ap.promptTemplate"
                  rows="6"
                  style="width: 100%; font-size: 12px; font-family: ui-monospace, monospace; padding: 8px; border-radius: 4px; border: 1px solid var(--theme-border, #ccc); resize: vertical"
                />
              </div>

              <details style="margin-bottom: 12px">
                <summary style="cursor: pointer; font-size: 13px; padding: 4px 0">聚合预览 ({{ apAggregatedText.length }} chars)</summary>
                <pre class="ds-ms-pre" style="max-height: 300px; overflow: auto; font-size: 12px; white-space: pre-wrap; padding: 8px; background: rgba(0,0,0,0.04); border-radius: 4px">{{ apAggregatedText }}</pre>
              </details>

              <div v-if="ap.error" class="ds-ms-error" style="margin-bottom: 8px">{{ ap.error }}</div>

              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px">
                <button class="ds-ms-btn" type="button" @click="closeSendAutopilot">取消</button>
                <button
                  class="ds-ms-btn ds-ms-btn--primary"
                  :disabled="!ap.details.length || !ap.promptTemplate.trim()"
                  @click="callHarness"
                >调 harness</button>
              </div>
            </section>

            <!-- 步骤 3: 调 harness 中 -->
            <section v-if="ap.step === 'calling'">
              <div style="display: flex; align-items: center; gap: 12px; padding: 24px 8px">
                <div class="ds-ms-spinner"></div>
                <div>
                  <div style="font-weight: 500">harness 处理中…</div>
                  <div style="font-size: 13px; opacity: 0.7; margin-top: 4px">
                    需等待 AI 完成 oneshot 推理, 通常 10–90 秒. 已用 {{ ap.elapsed }}s
                  </div>
                </div>
              </div>
              <div v-if="ap.error" class="ds-ms-error" style="margin-bottom: 8px">{{ ap.error }}</div>
            </section>

            <!-- 步骤 4: 审阅 + 录入 -->
            <section v-if="ap.step === 'edit'">
              <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px">
                harness 返回原文已展示. 可直接编辑下方文本, 切片按 "=== CASE N: " 头进行,
                解析得到 <strong>{{ apParsedTasks.length }}</strong> 条 task.
              </div>
              <label style="display: block; font-size: 12px; opacity: 0.8; margin-bottom: 4px">harness 返回 (可编辑)</label>
              <textarea
                v-model="ap.harnessText"
                style="width: 100%; min-height: 220px; max-height: 360px; font-size: 12px; font-family: ui-monospace, monospace; padding: 8px; border-radius: 4px; border: 1px solid var(--theme-border, #ccc); resize: vertical"
              />

              <div style="margin-top: 8px; font-size: 13px">
                解析出的 tasks:
                <ul style="margin: 4px 0 0 16px; padding: 0">
                  <li v-for="(t, idx) in apParsedTasks" :key="idx" style="font-size: 12px; opacity: 0.85">
                    {{ idx + 1 }}. <strong>{{ t.title }}</strong> ({{ t.text.length }} chars)
                  </li>
                  <li v-if="!apParsedTasks.length" style="color: var(--theme-danger, #b00); font-size: 12px">
                    未解析到任何 task. 请检查文本是否包含 "=== CASE N: &lt;title&gt; ===" 头.
                  </li>
                </ul>
              </div>

              <div style="margin-top: 12px">
                <label style="display: block; font-size: 12px; opacity: 0.8; margin-bottom: 4px">
                  目标 folder_path (按 "/" 分段, autopilot 会逐级 upsert)
                </label>
                <input
                  v-model="apFolderPath"
                  type="text"
                  list="ap-folder-history"
                  style="width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--theme-border, #ccc); font-size: 13px"
                  :placeholder="apFolderPlaceholder"
                />
                <datalist id="ap-folder-history">
                  <option v-for="h in apFolderHistoryList" :key="h" :value="h" />
                </datalist>
                <div v-if="apFolderHistoryList.length" style="margin-top: 4px; font-size: 11px; opacity: 0.6">
                  最近使用: {{ apFolderHistoryList.length }} 项, 输入框聚焦可下拉选择.
                </div>
              </div>

              <div v-if="ap.error" class="ds-ms-error" style="margin-top: 8px">{{ ap.error }}</div>

              <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 16px">
                <button class="ds-ms-btn" type="button" @click="apResetToPreview" :disabled="ap.ingesting">
                  重选 prompt / 再调一次
                </button>
                <div style="display: flex; gap: 8px">
                  <button class="ds-ms-btn" type="button" @click="closeSendAutopilot" :disabled="ap.ingesting">取消</button>
                  <button
                    class="ds-ms-btn ds-ms-btn--primary"
                    :disabled="!apParsedTasks.length || !apFolderPath.trim() || ap.ingesting"
                    @click="callIngest"
                  >{{ ap.ingesting ? '录入中…' : `录入 ${apParsedTasks.length} 条到 Autopilot` }}</button>
                </div>
              </div>
            </section>

            <!-- 步骤 5: 完成 -->
            <section v-if="ap.step === 'done'">
              <div style="padding: 8px 0">
                <div style="font-size: 15px; font-weight: 500; margin-bottom: 8px; color: var(--theme-success, #2c8a4d)">
                  录入成功: {{ ap.ingestResult?.tasks.length ?? 0 }} 条 task
                </div>
                <div style="font-size: 13px; opacity: 0.85; margin-bottom: 8px">
                  folder_id: <code>{{ ap.ingestResult?.folder_id }}</code>
                </div>
                <div style="font-size: 13px; margin-bottom: 8px">
                  <a :href="apAutopilotUrl" target="_blank" rel="noopener" style="color: var(--theme-link, #2563eb)">→ 打开 Autopilot 工作台</a>
                </div>
                <details v-if="apIngestSourceMap.length" style="margin-top: 8px" open>
                  <summary style="cursor: pointer; font-size: 13px">录入对照 (Autopilot ↔ MeterSphere) · {{ apIngestSourceMap.length }} 条</summary>
                  <div style="max-height: 240px; overflow: auto; font-size: 12px; padding: 8px; background: rgba(0,0,0,0.04); border-radius: 4px; margin-top: 4px">
                    <div
                      v-for="row in apIngestSourceMap"
                      :key="row.taskId"
                      style="display: grid; grid-template-columns: 64px 1fr 110px; gap: 6px; padding: 2px 0; align-items: baseline"
                    >
                      <span style="font-family: ui-monospace, monospace; opacity: 0.7">{{ row.msLabel }}</span>
                      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap" :title="row.title">{{ row.title }}</span>
                      <a
                        :href="apTaskPreviewUrl(row.taskId)"
                        target="_blank"
                        rel="noopener"
                        style="font-family: ui-monospace, monospace; color: var(--theme-link, #2563eb); text-decoration: none"
                        :title="`打开任务预览 ${row.taskId}`"
                      >#{{ row.taskId.slice(0, 8) }}</a>
                    </div>
                  </div>
                </details>
                <details style="margin-top: 8px">
                  <summary style="cursor: pointer; font-size: 13px">原始 task ids ({{ ap.ingestResult?.tasks.length ?? 0 }})</summary>
                  <pre class="ds-ms-pre" style="max-height: 200px; overflow: auto; font-size: 12px; padding: 8px; background: rgba(0,0,0,0.04); border-radius: 4px">{{ ap.ingestResult?.tasks.map((t: any) => t.id).join('\n') }}</pre>
                </details>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px">
                <button class="ds-ms-btn ds-ms-btn--primary" type="button" @click="closeSendAutopilot">关闭</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
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

// ── 送至 Autopilot ─────────────────────────────────────────────────────────
// 5 步: fetching (并发拉详情) → preview (编辑 prompt 模板) → calling (harness) →
//        edit (审阅切片 + 编辑 folder_path) → done.
// 切片头沿用与 AutotestCasesPanel 相同的 `=== CASE N: <title> ===`, 保持下游一致.
// prompt 模板, folder_path, folder 历史均走 useBrowserCache, 重开面板自动恢复.

const AP_CASE_HEADER_RE = /^===\s*CASE\s+(\d+):\s*(.*?)\s*===\s*$/i
const AP_FOLDER_HISTORY_MAX = 8
const AP_DEFAULT_PROMPT_TEMPLATE = `你是"传话人". 请把【】内的内容原样复述出来, 不要做任何改动 / 解读 / 归纳 / 评价 / 增删字符 / 翻译.
保持分隔头 "=== CASE N: <title> ===" 原样, 不要去掉, 不要换行错位.
不要在前后添加任何解释 / 寒暄 / 摘要; 只输出原文.`

interface ApIngestResult {
  folder_id: string
  tasks: { id: string }[]
}

// 录入时 enrich 出的对照行: autopilot task id ↔ MS 用例编号 + 录入用的最终 title.
// 用户在 done 步骤看一眼就能知道哪条 MS 用例落到了哪条 autopilot task.
interface ApIngestSourceRow { taskId: string; title: string; msLabel: string }

interface ApParsedTask { title: string; text: string; caseIndex: number }

// Autopilot ingest API 的 title 长度上限 (与 ele-autopilot/app/routes/api.v1.ingest.tasks.tsx
// `TASK_TITLE_MAX` 同值). 加 [MS #num] 前缀后超限的原 title 会被截尾 + ellipsis.
const AP_TASK_TITLE_MAX = 200

interface ApPromptPreset { key: string; label: string; tip: string; template: string }

const promptPresets: ApPromptPreset[] = [
  {
    key: 'passthrough',
    label: '传话人 (原文)',
    tip: '让 harness 把内容原样吐回, 不做任何改写',
    template: AP_DEFAULT_PROMPT_TEMPLATE,
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

const apFolderPath = useBrowserCache<string>('autopilot.send.folderPath', '')
const apFolderHistoryRaw = useBrowserCache<string>('autopilot.send.folderHistory', '')
const apPromptTemplateCache = useBrowserCache<string>('autopilot.send.promptTemplate', AP_DEFAULT_PROMPT_TEMPLATE)

const apFolderHistoryList = computed<string[]>(() => {
  if (!apFolderHistoryRaw.value) return []
  try {
    const arr = JSON.parse(apFolderHistoryRaw.value)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.trim()) : []
  } catch { return [] }
})

function pushFolderHistory(path: string) {
  const trimmed = path.trim()
  if (!trimmed) return
  const prev = apFolderHistoryList.value.filter((p) => p !== trimmed)
  const next = [trimmed, ...prev].slice(0, AP_FOLDER_HISTORY_MAX)
  apFolderHistoryRaw.value = JSON.stringify(next)
}

const apFolderPlaceholder = computed(() => {
  const proj = projects.value.find((p) => p.id === projectId.value)?.name?.trim()
  return proj ? `例: MeterSphere / ${proj}` : '例: MeterSphere / <项目名>'
})

interface ApRunState {
  open: boolean
  step: 'fetching' | 'preview' | 'calling' | 'edit' | 'done'
  total: number
  fetched: number
  failedFetch: number
  details: MsCaseDetail[]
  promptTemplate: string
  harnessText: string
  elapsed: number
  ingesting: boolean
  ingestResult: ApIngestResult | null
  ingestSourceMap: ApIngestSourceRow[]
  error: string
  sessionId: string | undefined
}

const ap = reactive<ApRunState>({
  open: false,
  step: 'fetching',
  total: 0,
  fetched: 0,
  failedFetch: 0,
  details: [],
  promptTemplate: AP_DEFAULT_PROMPT_TEMPLATE,
  harnessText: '',
  elapsed: 0,
  ingesting: false,
  ingestResult: null,
  ingestSourceMap: [],
  error: '',
  sessionId: undefined,
})

const apIngestSourceMap = computed<ApIngestSourceRow[]>(() => ap.ingestSourceMap)

const apBusy = computed(() => ap.step === 'fetching' || ap.step === 'calling' || ap.ingesting)

const canSendAutopilot = computed(() => selectedIds.value.size > 0 && !!ak.value.trim() && !!sk.value.trim())
const sendAutopilotDisabledReason = computed(() => {
  if (!selectedIds.value.size) return '请先选中至少一条 MS 用例'
  if (!ak.value.trim() || !sk.value.trim()) return '请先填入 MS AK / SK'
  return ''
})

const apStepLabel = computed(() => {
  switch (ap.step) {
    case 'fetching': return '1/5 拉取详情'
    case 'preview': return '2/5 预览 + prompt'
    case 'calling': return '3/5 harness 处理中'
    case 'edit': return '4/5 审阅录入'
    case 'done': return '5/5 完成'
    default: return ''
  }
})

// 录入完成后直跳 Autopilot 工作台并锁定到刚 upsert 的 folder; folderId deep link 协议在
// ele-autopilot AdminTaskExplorer 中读 URL ?folderId=. 任一缺失 (未录入 / 未拿到 folder_id)
// 时回退到根 /autopilot, 进入第一个 root folder, 不阻塞用户.
const apAutopilotUrl = computed(() => {
  const url = new URL('/autopilot', window.location.origin)
  const fid = ap.ingestResult?.folder_id
  if (fid) url.searchParams.set('folderId', fid)
  return url.toString()
})

// 单条 task 直链到 Autopilot 任务预览页 (/autopilot/preview/<taskId>). 录入对照表渲染时
// 用它生成 <a>, 用户点击 task id 直接看 job 历史 / 执行截图, 不再需要先回工作台搜.
function apTaskPreviewUrl(taskId: string): string {
  return new URL(`/autopilot/preview/${encodeURIComponent(taskId)}`, window.location.origin).toString()
}

function applyPreset(key: string) {
  const preset = promptPresets.find((p) => p.key === key)
  if (!preset) return
  ap.promptTemplate = preset.template
}

function buildAggregatedFromDetails(details: MsCaseDetail[]): string {
  const parts = details.map((d, idx) => {
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
    return `=== CASE ${idx + 1}: ${d.name} ===
模块: ${d.moduleName ?? '—'}${preReqLine}${stepsBlock}${expectedLine}${tagsLine}`
  })
  return parts.join('\n\n')
}

const apAggregatedText = computed(() => buildAggregatedFromDetails(ap.details))

function buildHarnessPrompt(template: string, aggregated: string): string {
  // 模板 + 聚合文本; 用 `【...】` 包裹聚合体, 与 AutotestCasesPanel 一致, 让 LLM 知道边界.
  return `${template.trim()}\n\n【\n${aggregated}\n】`
}

function parseHarnessText(text: string): ApParsedTask[] {
  const lines = text.split(/\r?\n/)
  const sections: ApParsedTask[] = []
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

// 通过 CASE 头里的编号 N 映射到 ap.details[N-1], 用于把 MS 来源元数据 (项目/编号/ID/模块)
// 注入到录入 Autopilot 的 task. 若用户在 harness 编辑步骤新增 / 删除了 CASE 头导致
// 编号对不上原始 details, 返回 undefined, 此条 task 跳过 metadata 注入但仍录入.
function resolveSourceDetail(parsed: ApParsedTask): MsCaseDetail | undefined {
  if (!Number.isInteger(parsed.caseIndex) || parsed.caseIndex < 1) return undefined
  return ap.details[parsed.caseIndex - 1]
}

function buildEnrichedTitle(parsed: ApParsedTask, detail: MsCaseDetail | undefined): string | undefined {
  const rawTitle = (parsed.title || detail?.name || '').trim()
  if (!detail) return rawTitle || undefined
  const prefix = `[MS #${detail.num}] `
  if (!rawTitle) return prefix.trimEnd()
  const combined = `${prefix}${rawTitle}`
  if (combined.length <= AP_TASK_TITLE_MAX) return combined
  // 给省略号留 1 字符. prefix 一般 ≤ 16, 即便 num 极长也极少超 200.
  const allowed = Math.max(1, AP_TASK_TITLE_MAX - prefix.length - 1)
  return `${prefix}${rawTitle.slice(0, allowed)}…`
}

// 把 MS 元数据追加到 task.text 末尾, 使用 markdown 引用块 (`> `) 隔离, autopilot UI 渲染时
// 可见, browser-use agent 看到引用块通常会跳过, 不影响执行. 含项目 / 模块 / 编号 / ID,
// 让任务可追溯回 MS 原始用例.
function buildTaskTextWithSource(parsed: ApParsedTask, detail: MsCaseDetail | undefined): string {
  if (!detail) return parsed.text
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
  return `${parsed.text}\n${metaLines.join('\n')}`
}

const apParsedTasks = computed(() => parseHarnessText(ap.harnessText))

function openSendAutopilot() {
  if (!canSendAutopilot.value) return
  ap.open = true
  ap.step = 'fetching'
  ap.total = selectedIds.value.size
  ap.fetched = 0
  ap.failedFetch = 0
  ap.details = []
  ap.promptTemplate = apPromptTemplateCache.value.trim() ? apPromptTemplateCache.value : AP_DEFAULT_PROMPT_TEMPLATE
  ap.harnessText = ''
  ap.ingestResult = null
  ap.ingestSourceMap = []
  ap.error = ''
  ap.sessionId = undefined
  ap.elapsed = 0
  ap.ingesting = false
  fetchSelectedDetails().catch((e) => { ap.error = `拉详情失败: ${e?.message ?? e}` })
}

function closeSendAutopilot() {
  if (apBusy.value) return
  ap.open = false
}

function apResetToPreview() {
  if (ap.ingesting) return
  ap.step = 'preview'
  ap.error = ''
}

async function fetchSelectedDetails() {
  const ids = Array.from(selectedIds.value)
  // 并发但有上限 (5), 避免一次性给上游 MS / VPC 打太多并发.
  const concurrency = 5
  let cursor = 0
  const results: MsCaseDetail[] = []

  async function worker() {
    while (cursor < ids.length) {
      const i = cursor++
      const id = ids[i]
      try {
        const res = await callApi<any>('GET', `/api/ms/case/${encodeURIComponent(id)}`)
        const d: MsCaseDetail | null = res?.data ?? null
        if (d) results.push(d)
        else ap.failedFetch += 1
      } catch {
        ap.failedFetch += 1
      } finally {
        ap.fetched += 1
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, () => worker()))

  // 按原列表 num 排序, 避免并发顺序错乱.
  results.sort((a, b) => (a.num ?? 0) - (b.num ?? 0))
  ap.details = results

  if (!results.length) {
    ap.error = '所有详情均拉取失败, 无法继续'
    return
  }

  // 默认 folder_path: 优先用缓存, 没缓存时根据当前项目名给个建议值.
  if (!apFolderPath.value.trim()) {
    const proj = projects.value.find((p) => p.id === projectId.value)?.name?.trim()
    if (proj) apFolderPath.value = `MeterSphere / ${proj}`
  }
  ap.step = 'preview'
}

// 持久化用户对 prompt 模板的修改, 让重开 / 切 tab 后保留.
watch(() => ap.promptTemplate, (v) => {
  // 只在弹框打开 + 非默认值时写入缓存; 显式还原默认走 ap.promptTemplate = AP_DEFAULT_PROMPT_TEMPLATE,
  // 也允许写回默认 (用户可能就想用默认值).
  if (ap.open) apPromptTemplateCache.value = v
})

let apTicker: number | null = null

function clearApTicker() {
  if (apTicker !== null) {
    window.clearInterval(apTicker)
    apTicker = null
  }
}

async function callHarness() {
  if (ap.step !== 'preview') return
  if (!ap.details.length || !ap.promptTemplate.trim()) return
  ap.error = ''
  ap.step = 'calling'
  ap.elapsed = 0
  const startedAt = Date.now()
  clearApTicker()
  apTicker = window.setInterval(() => {
    ap.elapsed = Math.floor((Date.now() - startedAt) / 1000)
  }, 1000)

  try {
    const prompt = buildHarnessPrompt(ap.promptTemplate, apAggregatedText.value)
    const res = await callApi<{ text: string; sessionId?: string }>('POST', '/api/harness/oneshot', {
      prompt,
      source: 'autotesting',
    })
    ap.harnessText = res?.text ?? ''
    ap.sessionId = res?.sessionId
    if (!ap.harnessText.trim()) throw new Error('harness 返回空文本')
    ap.step = 'edit'
  } catch (e: any) {
    ap.error = `harness 调用失败: ${e?.message ?? e}`
    ap.step = 'preview'
  } finally {
    clearApTicker()
  }
}

async function callIngest() {
  if (ap.ingesting) return
  ap.error = ''
  ap.ingesting = true
  try {
    const folderPath = apFolderPath.value
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!folderPath.length) throw new Error('folder_path 不能为空')
    if (!apParsedTasks.value.length) throw new Error('未解析到任何 task, 无法录入')

    // 录入前把 MS 来源元数据注入每条 task: title 加 [MS #num] 前缀, text 末尾追加引用块.
    // 让 autopilot 工作台一眼能追溯到 MS 原始用例 (#num + ID + 项目 + 模块).
    const enrichedTasks = apParsedTasks.value.map((t) => {
      const detail = resolveSourceDetail(t)
      return {
        title: buildEnrichedTitle(t, detail),
        text: buildTaskTextWithSource(t, detail),
        detail,
      }
    })
    const payload = {
      source: 'autotesting',
      folder_path: folderPath,
      tasks: enrichedTasks.map(({ title, text }) => ({ title, text })),
    }
    const res = await callApi<{ code: number; message: string; data: ApIngestResult }>(
      'POST',
      '/api/autopilot/ingest',
      payload,
    )
    if (!res?.data?.folder_id || !Array.isArray(res?.data?.tasks)) {
      throw new Error(`返回结构异常: ${JSON.stringify(res).slice(0, 300)}`)
    }
    ap.ingestResult = res.data
    // 按返回 task id 顺序与 enrichedTasks 对齐 (ingest API 保证 tasks[].id 顺序与请求一致),
    // 构造录入对照表, 让 done 步骤直观显示哪条 MS 用例落到了哪条 autopilot task.
    ap.ingestSourceMap = res.data.tasks.map((createdTask, i) => {
      const entry = enrichedTasks[i]
      return {
        taskId: createdTask.id,
        title: entry?.title ?? `task ${i + 1}`,
        msLabel: entry?.detail ? `#${entry.detail.num}` : '—',
      }
    })
    pushFolderHistory(apFolderPath.value)
    ap.step = 'done'
  } catch (e: any) {
    ap.error = `autopilot 录入失败: ${e?.message ?? e}`
  } finally {
    ap.ingesting = false
  }
}

onBeforeUnmount(clearApTicker)
</script>
