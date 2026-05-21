<template>
  <div class="ds-ms-panel">
    <!-- Toolbar: 搜索 + 选中计数 + 录入 MS -->
    <div class="ds-ms-toolbar">
      <span class="ds-ms-toolbar-title">AutoTest 用例 (示例)</span>
      <input
        v-model="keyword"
        class="ds-ms-search"
        type="search"
        placeholder="搜索 名称 / 模块 / 步骤 / 期望"
      />
      <span class="ds-ms-toolbar-meta">
        {{ filtered.length }} / {{ cases.length }} 条
        <template v-if="selectedIds.size">· 已选 {{ selectedIds.size }}</template>
      </span>
      <div class="ds-ms-actions">
        <button
          class="ds-ms-btn"
          :disabled="!canSendAutopilot"
          :title="sendAutopilotDisabledReason"
          @click="openSendAutopilot"
        >送至 Autopilot</button>
        <button
          class="ds-ms-btn ds-ms-btn--primary"
          :disabled="!canIngest"
          :title="ingestDisabledReason"
          @click="openIngest"
        >录入 MeterSphere</button>
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
            <th style="width: 18%">模块</th>
            <th style="width: 72px">优先级</th>
            <th>步骤</th>
            <th style="width: 22%">期望</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filtered" :key="row.id" :class="{ 'ds-ms-row--selected': selectedIds.has(row.id) }">
            <td>
              <input
                type="checkbox"
                :checked="selectedIds.has(row.id)"
                @change="toggleOne(row.id, ($event.target as HTMLInputElement).checked)"
                :aria-label="`选中 ${row.name}`"
              />
            </td>
            <td>{{ row.num }}</td>
            <td>
              <div class="ds-ms-case-name">{{ row.name }}</div>
              <div v-if="row.tags?.length" class="ds-ms-tags">
                <span v-for="t in row.tags" :key="t" class="ds-ms-tag">{{ t }}</span>
              </div>
            </td>
            <td>{{ row.module }}</td>
            <td>
              <span class="ds-ms-prio" :class="`ds-ms-prio--${row.priority.toLowerCase()}`">{{ row.priority }}</span>
            </td>
            <td>
              <pre class="ds-ms-pre">{{ row.steps }}</pre>
            </td>
            <td>{{ row.expected }}</td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="7" class="ds-ms-empty">{{ cases.length ? '无匹配' : '暂无数据' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 录入 MS 弹框 -->
    <Teleport to="body">
      <div v-if="ingest.open" class="fixed inset-0 theme-mask z-50 flex items-center justify-center p-4" @click="closeIngest">
        <div
          class="theme-manager-container w-full mx-auto flex flex-col overflow-hidden"
          style="max-width: 640px; max-height: 92vh"
          @click.stop
        >
          <header class="ds-modal-head">
            <div class="ds-modal-head-left">
              <h3 class="ds-modal-title">录入到 MeterSphere</h3>
            </div>
            <div class="ds-modal-head-right">
              <button class="ds-icon-btn-sm" type="button" @click="closeIngest" :disabled="ingest.running" aria-label="关闭">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div class="ds-modal-body" style="padding: 16px">
            <div class="ds-ms-field" style="margin-bottom: 12px">
              <label>目标项目</label>
              <div style="display: flex; gap: 8px; align-items: center">
                <select v-model="ingest.projectId" :disabled="ingest.running || !ingest.projects.length" style="flex: 1">
                  <option value="">{{ ingest.projects.length ? '请选择' : '尚未加载' }}</option>
                  <option v-for="p in ingest.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
                <button
                  class="ds-ms-btn ds-ms-btn--mini"
                  :disabled="ingest.running || ingest.loadingProjects"
                  @click="loadIngestProjects"
                >{{ ingest.loadingProjects ? '加载…' : '拉项目' }}</button>
              </div>
            </div>

            <div style="font-size: 13px; opacity: 0.8; margin-bottom: 12px">
              将录入 <strong>{{ selectedIds.size }}</strong> 条 AutoTest 用例.
              模块按用例自带 module 路径 (按 "/" 拆分) 在 MeterSphere 中逐级查找或新建.
            </div>

            <div v-if="ingest.error" class="ds-ms-error" style="margin-bottom: 8px">{{ ingest.error }}</div>

            <div v-if="ingest.running || ingest.done > 0 || ingest.failed > 0" style="font-size: 13px; margin-bottom: 8px">
              进度: {{ ingest.done + ingest.failed }} / {{ selectedIds.size }} (成功 {{ ingest.done }} · 失败 {{ ingest.failed }})
              <div v-if="ingest.currentName" style="opacity: 0.7; margin-top: 4px">→ {{ ingest.currentName }}</div>
            </div>

            <details v-if="ingest.logs.length" style="margin-bottom: 8px">
              <summary style="cursor: pointer; font-size: 13px">详细日志 ({{ ingest.logs.length }})</summary>
              <pre class="ds-ms-pre" style="max-height: 200px; overflow: auto; font-size: 12px">{{ ingest.logs.join('\n') }}</pre>
            </details>

            <div style="display: flex; justify-content: flex-end; gap: 8px">
              <button class="ds-ms-btn" type="button" @click="closeIngest" :disabled="ingest.running">
                {{ ingest.done + ingest.failed > 0 && !ingest.running ? '关闭' : '取消' }}
              </button>
              <button
                class="ds-ms-btn ds-ms-btn--primary"
                :disabled="!ingest.projectId || ingest.running"
                @click="startIngest"
              >{{ ingest.running ? '录入中…' : '开始录入' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 送至 Autopilot 弹框: 聚合 -> harness 传话 -> 拆分 -> 调 autopilot ingest -->
    <Teleport to="body">
      <div v-if="ap.open" class="fixed inset-0 theme-mask z-50 flex items-center justify-center p-4" @click="closeSendAutopilot">
        <div
          class="theme-manager-container w-full mx-auto flex flex-col overflow-hidden"
          style="max-width: 880px; max-height: 92vh"
          @click.stop
        >
          <header class="ds-modal-head">
            <div class="ds-modal-head-left">
              <h3 class="ds-modal-title">送至 Autopilot · {{ apStepLabel }}</h3>
            </div>
            <div class="ds-modal-head-right">
              <button class="ds-icon-btn-sm" type="button" @click="closeSendAutopilot" :disabled="ap.callingHarness || ap.ingesting" aria-label="关闭">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div class="ds-modal-body" style="padding: 16px; overflow: auto">
            <!-- 步骤 1: 聚合预览 -->
            <section v-if="ap.step === 'preview'">
              <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px">
                将 <strong>{{ selectedIds.size }}</strong> 条用例聚合成一段文本, 加 "传话人" 提示后调 harness 原文返回.
                返回成功后可编辑, 再按用例切片录入到 Autopilot (n 条用例 → n 条 task).
              </div>
              <details style="margin-bottom: 12px" open>
                <summary style="cursor: pointer; font-size: 13px; padding: 4px 0">聚合预览 ({{ apAggregatedText.length }} chars)</summary>
                <pre class="ds-ms-pre" style="max-height: 360px; overflow: auto; font-size: 12px; white-space: pre-wrap; padding: 8px; background: rgba(0,0,0,0.04); border-radius: 4px">{{ apAggregatedText }}</pre>
              </details>
              <div v-if="ap.error" class="ds-ms-error" style="margin-bottom: 8px">{{ ap.error }}</div>
              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px">
                <button class="ds-ms-btn" type="button" @click="closeSendAutopilot">取消</button>
                <button class="ds-ms-btn ds-ms-btn--primary" @click="callHarness" :disabled="!selectedIds.size">
                  调 harness (传话人)
                </button>
              </div>
            </section>

            <!-- 步骤 2: 调用 harness 中 -->
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

            <!-- 步骤 3: 编辑 + 录入 -->
            <section v-if="ap.step === 'edit'">
              <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px">
                harness 返回原文已展示. 你可以直接编辑下方文本; 切片按 "=== CASE N: " 头进行,
                解析得到 <strong>{{ apParsedTasks.length }}</strong> 条 task.
              </div>
              <label style="display: block; font-size: 12px; opacity: 0.8; margin-bottom: 4px">harness 返回 (可编辑)</label>
              <textarea
                v-model="ap.harnessText"
                style="width: 100%; min-height: 240px; max-height: 360px; font-size: 12px; font-family: ui-monospace, monospace; padding: 8px; border-radius: 4px; border: 1px solid var(--theme-border, #ccc); resize: vertical"
              />

              <div style="margin-top: 8px; font-size: 13px">
                解析出的 tasks (按解析顺序):
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
                <input v-model="ap.folderPath" type="text" style="width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--theme-border, #ccc); font-size: 13px"
                  placeholder='例: AutoTest / 传话人验证'
                />
              </div>

              <div v-if="ap.error" class="ds-ms-error" style="margin-top: 8px">{{ ap.error }}</div>

              <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 16px">
                <button class="ds-ms-btn" type="button" @click="apResetToPreview" :disabled="ap.ingesting">
                  重新聚合 / 再调一次
                </button>
                <div style="display: flex; gap: 8px">
                  <button class="ds-ms-btn" type="button" @click="closeSendAutopilot" :disabled="ap.ingesting">取消</button>
                  <button
                    class="ds-ms-btn ds-ms-btn--primary"
                    :disabled="!apParsedTasks.length || !ap.folderPath.trim() || ap.ingesting"
                    @click="callIngest"
                  >{{ ap.ingesting ? '录入中…' : `录入 ${apParsedTasks.length} 条到 Autopilot` }}</button>
                </div>
              </div>
            </section>

            <!-- 步骤 4: 录入完成 -->
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
                <details v-if="ap.ingestResult?.tasks.length" style="margin-top: 8px" open>
                  <summary style="cursor: pointer; font-size: 13px">task ids ({{ ap.ingestResult.tasks.length }}) · 点击直跳预览</summary>
                  <div style="max-height: 200px; overflow: auto; font-size: 12px; padding: 8px; background: rgba(0,0,0,0.04); border-radius: 4px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px">
                    <a
                      v-for="t in ap.ingestResult.tasks"
                      :key="t.id"
                      :href="apTaskPreviewUrl(t.id)"
                      target="_blank"
                      rel="noopener"
                      style="font-family: ui-monospace, monospace; color: var(--theme-link, #2563eb); text-decoration: none"
                      :title="`打开任务预览 ${t.id}`"
                    >#{{ t.id.slice(0, 8) }} · {{ t.id }}</a>
                  </div>
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
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { getApiBasePath } from '@prompt-optimizer/core'
import { useBrowserCache } from '../composables/useBrowserCache'
import { MOCK_AUTOTEST_CASES, type AutotestCase } from './_mock/autotest-cases'

const cases: AutotestCase[] = MOCK_AUTOTEST_CASES

// AK/SK 与 MeterSphereDataPanel 共享同一组 localStorage key.
const ak = useBrowserCache<string>('metersphere.ak', '')
const sk = useBrowserCache<string>('metersphere.sk', '')

const keyword = ref('')
const selectedIds = ref<Set<string>>(new Set())

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return cases
  return cases.filter((c) =>
    [c.name, c.module, c.steps, c.expected, ...(c.tags ?? [])]
      .some((s) => (s ?? '').toLowerCase().includes(kw)),
  )
})

const allSelected = computed(() => filtered.value.length > 0 && filtered.value.every((c) => selectedIds.value.has(c.id)))
const someSelected = computed(() => filtered.value.some((c) => selectedIds.value.has(c.id)))

function toggleOne(id: string, on: boolean) {
  const next = new Set(selectedIds.value)
  if (on) next.add(id); else next.delete(id)
  selectedIds.value = next
}

function toggleAll(on: boolean) {
  const next = new Set(selectedIds.value)
  for (const c of filtered.value) {
    if (on) next.add(c.id); else next.delete(c.id)
  }
  selectedIds.value = next
}

// ── 录入 MS ─────────────────────────────────────────────────────────────────
const canIngest = computed(() => selectedIds.value.size > 0 && !!ak.value.trim() && !!sk.value.trim())
const ingestDisabledReason = computed(() => {
  if (!selectedIds.value.size) return '请先选中至少一条用例'
  if (!ak.value.trim() || !sk.value.trim()) return '请先在 MeterSphere 标签填入 AK / SK'
  return ''
})

interface MsProject { id: string; name: string }
interface MsModuleNode { id: string; name: string; parentId: string; children?: MsModuleNode[] }

const ingest = reactive({
  open: false,
  loadingProjects: false,
  projects: [] as MsProject[],
  projectId: '',
  running: false,
  done: 0,
  failed: 0,
  currentName: '',
  error: '',
  logs: [] as string[],
})

function openIngest() {
  if (!canIngest.value) return
  ingest.open = true
  ingest.error = ''
  ingest.done = 0
  ingest.failed = 0
  ingest.logs = []
  ingest.currentName = ''
  if (!ingest.projects.length) loadIngestProjects()
}

function closeIngest() {
  if (ingest.running) return
  ingest.open = false
}

function buildHeaders(): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-ms-ak': ak.value.trim(),
    'x-ms-sk': sk.value.trim(),
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
  // 上游 (MS / 自家 ingest) 多走 `{ code, message, data }`. 成功码: MS v3 = 100200
  // (MsHttpResultCode.SUCCESS), v2 / 自家 ingest = 0; 200 仅做历史兜底.
  // 仅当 code 字段存在且为数字时校验, 兼容 harness 等不带 code 的自家响应.
  const code = json?.code
  if (typeof code === 'number' && code !== 0 && code !== 200 && code !== 100200) {
    const msg = json?.message || json?.error || `business code ${code}`
    throw new Error(`${msg} (code=${code})`)
  }
  return json as T
}

async function loadIngestProjects() {
  ingest.loadingProjects = true
  ingest.error = ''
  try {
    const res = await callApi<any>('POST', '/api/ms/projects', { current: 1, pageSize: 200 })
    const list: any[] = res?.data?.list ?? res?.data ?? []
    ingest.projects = list.map((p) => ({ id: p.id, name: p.name }))
    if (!ingest.projects.length) ingest.error = '项目列表为空 (AK 是否有项目读权限?)'
  } catch (e: any) {
    ingest.error = `拉项目失败: ${e?.message ?? e}`
  } finally {
    ingest.loadingProjects = false
  }
}

function flattenModuleTree(nodes: MsModuleNode[]): MsModuleNode[] {
  const out: MsModuleNode[] = []
  for (const n of nodes ?? []) {
    out.push(n)
    if (n.children?.length) out.push(...flattenModuleTree(n.children))
  }
  return out
}

function splitModulePath(s: string): string[] {
  // 支持 "登录 / 异常路径" 或 "登录/异常路径".
  return s.split('/').map((x) => x.trim()).filter(Boolean)
}

function parseStepsToMs(stepsText: string): Array<{ id: string; num: number; desc: string; result: string }> {
  // AutoTest 步骤是带行号的纯文本 (`1. xxx\n2. yyy`). 拆行 -> MS step item.
  const lines = stepsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  return lines.map((line, idx) => {
    const m = line.match(/^\d+[.、)]\s*(.+)$/)
    const desc = m ? m[1] : line
    return { id: `s${idx + 1}`, num: idx + 1, desc, result: '' }
  })
}

async function ensureModuleChain(projectId: string, chain: string[], moduleCache: Map<string, MsModuleNode[]>): Promise<string> {
  // 拉 (并缓存) 当前 MS 项目模块树, 沿 chain 逐级查找/新建.
  if (!moduleCache.has(projectId)) {
    const res = await callApi<any>('GET', `/api/ms/modules?projectId=${encodeURIComponent(projectId)}`)
    moduleCache.set(projectId, res?.data ?? [])
  }
  let parentId = 'NONE'
  let level: MsModuleNode[] = moduleCache.get(projectId) ?? []
  for (const name of chain) {
    const exist = level.find((n) => n.name === name && (n.parentId === parentId || (parentId === 'NONE' && !n.parentId)))
    if (exist) {
      parentId = exist.id
      level = exist.children ?? []
      continue
    }
    const res = await callApi<any>('POST', '/api/ms/module/add', { projectId, parentId, name })
    const newId = res?.data ?? res?.id
    if (typeof newId !== 'string' || !newId) throw new Error(`新建模块 "${name}" 未返回 id (resp=${JSON.stringify(res)})`)
    const node: MsModuleNode = { id: newId, name, parentId, children: [] }
    // 同步到内存树, 让同批次后续用例复用.
    if (parentId === 'NONE') {
      ;(moduleCache.get(projectId) ?? []).push(node)
    } else {
      const findById = (nodes: MsModuleNode[], id: string): MsModuleNode | null => {
        for (const n of nodes) {
          if (n.id === id) return n
          if (n.children?.length) {
            const found = findById(n.children, id)
            if (found) return found
          }
        }
        return null
      }
      const parent = findById(moduleCache.get(projectId) ?? [], parentId)
      if (parent) { (parent.children ??= []).push(node) }
    }
    parentId = newId
    level = []
  }
  return parentId
}

async function getTemplateId(projectId: string, cache: Map<string, string>): Promise<string> {
  if (cache.has(projectId)) return cache.get(projectId)!
  const res = await callApi<any>('GET', `/api/ms/default-template/${encodeURIComponent(projectId)}`)
  const id = res?.data?.id ?? res?.id
  if (typeof id !== 'string' || !id) throw new Error(`默认模板未返回 id (resp=${JSON.stringify(res)})`)
  cache.set(projectId, id)
  return id
}

async function startIngest() {
  if (!ingest.projectId || ingest.running) return
  ingest.running = true
  ingest.error = ''
  ingest.done = 0
  ingest.failed = 0
  ingest.logs = []
  const moduleCache = new Map<string, MsModuleNode[]>()
  const templateCache = new Map<string, string>()
  const targets = cases.filter((c) => selectedIds.value.has(c.id))
  try {
    for (const cs of targets) {
      ingest.currentName = `${cs.num}. ${cs.name}`
      try {
        const chain = splitModulePath(cs.module)
        const moduleId = chain.length
          ? await ensureModuleChain(ingest.projectId, chain, moduleCache)
          : 'root'
        const templateId = await getTemplateId(ingest.projectId, templateCache)
        const steps = parseStepsToMs(cs.steps)
        const reqBody = {
          projectId: ingest.projectId,
          templateId,
          name: cs.name,
          moduleId,
          caseEditType: 'STEP' as const,
          prerequisite: '',
          steps: JSON.stringify(steps),
          description: cs.expected ? `期望结果:\n${cs.expected}` : '',
          tags: cs.tags ?? [],
        }
        await callApi<any>('POST', '/api/ms/case/add', reqBody)
        ingest.done += 1
        ingest.logs.push(`OK ${cs.num}. ${cs.name} (module=${chain.join('/') || 'root'})`)
      } catch (e: any) {
        ingest.failed += 1
        ingest.logs.push(`FAIL ${cs.num}. ${cs.name}: ${e?.message ?? e}`)
      }
    }
  } finally {
    ingest.currentName = ''
    ingest.running = false
  }
}

// ── 送至 Autopilot ─────────────────────────────────────────────────────────
// 4 步: preview → calling (harness) → edit (harness 返回 + 切片预览) → done
// 切片规则: 按 "=== CASE N: <title> ===" 头切; harness 用 "传话人" 提示原文返回,
// 期望分隔头不被改写. 解析失败时给前端提示, 不强制必须录入.

const AP_CASE_HEADER_RE = /^===\s*CASE\s+(\d+):\s*(.*?)\s*===\s*$/i

interface ApParsedTask { title: string; text: string }
interface ApIngestResult {
  folder_id: string
  tasks: { id: string }[]
}

const canSendAutopilot = computed(() => selectedIds.value.size > 0)
const sendAutopilotDisabledReason = computed(() =>
  selectedIds.value.size ? '' : '请先选中至少一条用例',
)

const ap = reactive({
  open: false,
  step: 'preview' as 'preview' | 'calling' | 'edit' | 'done',
  callingHarness: false,
  elapsed: 0,
  harnessText: '',
  folderPath: 'AutoTest / 传话人验证',
  ingesting: false,
  ingestResult: null as ApIngestResult | null,
  error: '',
  sessionId: '' as string | undefined,
})

const apStepLabel = computed(() => {
  switch (ap.step) {
    case 'preview':
      return '1/4 预览聚合'
    case 'calling':
      return '2/4 harness 处理中'
    case 'edit':
      return '3/4 审阅并录入'
    case 'done':
      return '4/4 录入完成'
    default:
      return ''
  }
})

const apSelectedCases = computed(() =>
  cases.filter((c) => selectedIds.value.has(c.id)).sort((a, b) => a.num - b.num),
)

function buildAggregated(selected: AutotestCase[]): string {
  const parts = selected.map((c, idx) => {
    const tags = c.tags?.length ? `\n标签: ${c.tags.join(', ')}` : ''
    return `=== CASE ${idx + 1}: ${c.name} ===
模块: ${c.module}
优先级: ${c.priority}
步骤:
${c.steps}
期望: ${c.expected}${tags}`
  })
  return parts.join('\n\n')
}

const apAggregatedText = computed(() => buildAggregated(apSelectedCases.value))

// 传话人 prompt: 让 harness LLM 把内容原样吐回, 保留分隔头.
function buildMessengerPrompt(aggregated: string): string {
  return `你是"传话人". 请把【】内的内容原样复述出来, 不要做任何改动 / 解读 / 归纳 / 评价 / 增删字符 / 翻译.
保持分隔头 "=== CASE N: <title> ===" 原样, 不要去掉, 不要换行错位.
不要在前后添加任何解释 / 寒暄 / 摘要; 只输出原文.

【
${aggregated}
】`
}

// 按 "=== CASE N: " 头切, 跳过头自身后取直到下一头 (或文件末尾).
function parseHarnessText(text: string): ApParsedTask[] {
  const lines = text.split(/\r?\n/)
  const sections: ApParsedTask[] = []
  let current: { title: string; bodyLines: string[] } | null = null
  for (const line of lines) {
    const m = line.match(AP_CASE_HEADER_RE)
    if (m) {
      if (current) sections.push({ title: current.title, text: current.bodyLines.join('\n').trim() })
      current = { title: m[2] || `CASE ${m[1]}`, bodyLines: [] }
    } else if (current) {
      current.bodyLines.push(line)
    }
  }
  if (current) sections.push({ title: current.title, text: current.bodyLines.join('\n').trim() })
  return sections.filter((s) => s.text.length > 0)
}

const apParsedTasks = computed(() => parseHarnessText(ap.harnessText))

// 录入完成后直跳 Autopilot 工作台 + 锁定刚 upsert 的 folder, deep link 协议同
// MeterSphereDataPanel: AdminTaskExplorer 读 URL ?folderId= 选中该 folder.
const apAutopilotUrl = computed(() => {
  const url = new URL('/autopilot', window.location.origin)
  const fid = ap.ingestResult?.folder_id
  if (fid) url.searchParams.set('folderId', fid)
  return url.toString()
})

function apTaskPreviewUrl(taskId: string): string {
  return new URL(`/autopilot/preview/${encodeURIComponent(taskId)}`, window.location.origin).toString()
}

function openSendAutopilot() {
  if (!canSendAutopilot.value) return
  ap.open = true
  ap.step = 'preview'
  ap.harnessText = ''
  ap.ingestResult = null
  ap.error = ''
  ap.sessionId = ''
  ap.elapsed = 0
  ap.callingHarness = false
  ap.ingesting = false
}

function closeSendAutopilot() {
  if (ap.callingHarness || ap.ingesting) return
  ap.open = false
}

function apResetToPreview() {
  if (ap.ingesting) return
  ap.step = 'preview'
  ap.error = ''
}

// 提到模块作用域便于组件卸载时兜底 clear, 避免 await 期间组件被销毁导致 ticker 泄漏.
let harnessTicker: number | null = null

function clearHarnessTicker() {
  if (harnessTicker !== null) {
    window.clearInterval(harnessTicker)
    harnessTicker = null
  }
}

async function callHarness() {
  if (ap.callingHarness) return
  ap.error = ''
  ap.callingHarness = true
  ap.step = 'calling'
  ap.elapsed = 0
  const startedAt = Date.now()
  // 简单计时 ticker; ap.elapsed 给 UI 提示用, 不影响业务.
  clearHarnessTicker()
  harnessTicker = window.setInterval(() => {
    ap.elapsed = Math.floor((Date.now() - startedAt) / 1000)
  }, 1000)

  try {
    const aggregated = apAggregatedText.value
    const prompt = buildMessengerPrompt(aggregated)
    const res = await callApi<{ text: string; sessionId?: string; events?: unknown[] }>(
      'POST',
      '/api/harness/oneshot',
      { prompt, source: 'autotesting' },
    )
    ap.harnessText = res?.text ?? ''
    ap.sessionId = res?.sessionId
    if (!ap.harnessText.trim()) {
      throw new Error('harness 返回空文本')
    }
    ap.step = 'edit'
  } catch (e: any) {
    ap.error = `harness 调用失败: ${e?.message ?? e}`
    ap.step = 'preview'
  } finally {
    clearHarnessTicker()
    ap.callingHarness = false
  }
}

onBeforeUnmount(clearHarnessTicker)

async function callIngest() {
  if (ap.ingesting) return
  ap.error = ''
  ap.ingesting = true
  try {
    const folderPath = ap.folderPath
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!folderPath.length) throw new Error('folder_path 不能为空')
    if (!apParsedTasks.value.length) throw new Error('未解析到任何 task, 无法录入')

    const payload = {
      source: 'autotesting',
      folder_path: folderPath,
      tasks: apParsedTasks.value.map((t) => ({ title: t.title, text: t.text })),
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
    ap.step = 'done'
  } catch (e: any) {
    ap.error = `autopilot 录入失败: ${e?.message ?? e}`
  } finally {
    ap.ingesting = false
  }
}
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
