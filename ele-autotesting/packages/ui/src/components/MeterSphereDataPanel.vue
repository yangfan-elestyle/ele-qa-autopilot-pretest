<template>
  <div class="ds-ms-panel">
    <!-- 凭据 + 组织/项目/模块选择 -->
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
        <select v-model="moduleId" :disabled="!modulesFlat.length">
          <option value="">{{ modulesFlat.length ? '全部' : '尚未加载' }}</option>
          <option v-for="m in modulesFlat" :key="m.id" :value="m.id">
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

    <!-- 用例表 -->
    <div class="ds-ms-toolbar">
      <span class="ds-ms-toolbar-title">MeterSphere 用例</span>
      <span class="ds-ms-toolbar-meta" v-if="caseTotal">共 {{ caseTotal }} 条, 第 {{ casePage }} 页 / {{ Math.max(1, Math.ceil(caseTotal / casePageSize)) }}</span>
    </div>
    <div class="ds-ms-table-wrap">
      <table class="ds-ms-table">
        <thead>
          <tr>
            <th style="width: 56px">#</th>
            <th style="width: 30%">名称</th>
            <th style="width: 12%">类型</th>
            <th>Tags</th>
            <th style="width: 14%">创建人</th>
            <th style="width: 18%">创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in cases" :key="row.id">
            <td>{{ row.num }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.caseEditType }}</td>
            <td>
              <span v-for="t in (row.tags ?? [])" :key="t" class="ds-ms-tag">{{ t }}</span>
            </td>
            <td>{{ row.createUserName ?? row.createUser ?? '—' }}</td>
            <td>{{ formatTs(row.createTime) }}</td>
          </tr>
          <tr v-if="!cases.length">
            <td colspan="6" class="ds-ms-empty">{{ loading.cases ? '加载中…' : '尚未拉取或无数据' }}</td>
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
import { ref } from 'vue'
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

// AK/SK 走通用浏览器缓存, 刷新后自动恢复; 清空输入即从 localStorage 移除.
const ak = useBrowserCache<string>('metersphere.ak', '')
const sk = useBrowserCache<string>('metersphere.sk', '')
const projectId = ref('')
const moduleId = ref('')

const projects = ref<MsProject[]>([])
const modulesFlat = ref<MsFlatModule[]>([])
const cases = ref<MsCase[]>([])
const caseTotal = ref(0)
const casePage = ref(1)
const casePageSize = ref(20)

const loading = ref({ projects: false, modules: false, cases: false })
const error = ref('')

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
  return json as T
}

async function loadProjects() {
  error.value = ''
  loading.value.projects = true
  try {
    // organizationId 由 Worker 经 /is-login 自动发现, 前端不传.
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
    })
    const list: MsCase[] = res?.data?.list ?? []
    cases.value = list
    caseTotal.value = Number(res?.data?.total ?? 0)
    casePage.value = page
  } catch (e: any) {
    error.value = `拉用例失败: ${e?.message ?? e}`
  } finally {
    loading.value.cases = false
  }
}

function formatTs(ts?: number) {
  if (!ts) return '—'
  try { return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) } catch { return String(ts) }
}
</script>
