/**
 * AutoTest 用例历史: 把生成结果手动同步到云 D1 (KV 表), 用以跨设备 / 跨会话还原.
 *
 * - 默认不持久化: 仅当用户点【同步到云】按钮才上传当前 rawText + 同步当时的全量生成上下文.
 * - 云端 schema 仿 /api/sync 现有 KV 语义 (单表 storage(owner_id,key,value)).
 *   - 索引:  autotest:cases-snapshot:__index__ -> JSON { items: SnapshotMeta[] }
 *   - 单条:  autotest:cases-snapshot:<id>      -> JSON Snapshot
 *   拆 index/item 是因为 D1 单 value 上限 900KB; 索引轻量可一次拉全, item 按需取.
 * - 模块级单例 ref, 多组件共享同一份 list.
 * - meta 字段刻意精简 (index 拉全用), addedItems / 完整 prompt 等大对象只放单条 item.
 */

import { ref, computed } from 'vue'
import type { Template, PromptRecord } from '@prompt-optimizer/core'
import { getApiBasePath } from '@prompt-optimizer/core'
import { parseTestCases } from '../utils/parseTestCases'

const INDEX_KEY = 'autotest:cases-snapshot:__index__'
const ITEM_KEY_PREFIX = 'autotest:cases-snapshot:'

export type AutotestCaseSnapshotMeta = {
  id: string
  savedAt: number
  casesCount: number
  title: string
  modelName: string
  sceneMark: string
  bytes: number
}

// 模板 / 上下文记录的内嵌快照: 原始对象可能在同步后被用户删除 / 改名,
// 还原时直接读 snapshot 副本, 不查 services.templateManager / promptHistory.
export type AddedItemSnapshot = {
  id: string
  type: 'template' | 'history'
  name: string
  data: Template | PromptRecord
}

export type AutotestCaseSnapshot = AutotestCaseSnapshotMeta & {
  rawText: string
  optimizedPrompt?: string
  originalPrompt?: string
  // 数据源 chips (模板 + 上下文记录) 整体回填, 不依赖外部存储.
  addedItems?: AddedItemSnapshot[]
  // 模块多选: id 是 D1 真值, path 是显示 / 兜底 (id 失效时仍能让用户知道当时选了什么).
  selectedModuleIds?: string[]
  selectedModulePaths?: string[]
  // 生成模型 key (modelManager.selectedTestModel 用以重选). modelName 仅显示名.
  selectedModelKey?: string
  // sync 当时的优化模式 (现仅 verify, 写下来便于未来 context 模式扩展).
  selectedOptimizationMode?: string
}

type IndexEnvelope = { items: AutotestCaseSnapshotMeta[] }

const list = ref<AutotestCaseSnapshotMeta[]>([])
const loading = ref(false)
const loaded = ref(false)
const error = ref<string>('')

function itemKey(id: string): string {
  return `${ITEM_KEY_PREFIX}${id}`
}

function apiUrl(key: string): string {
  return `${getApiBasePath()}/api/sync/items/${encodeURIComponent(key)}`
}

function batchUrl(): string {
  return `${getApiBasePath()}/api/sync/batch`
}

function genId(): string {
  // 兼容老浏览器: 优先 crypto.randomUUID, 否则降级到 timestamp+random.
  const c: any = typeof crypto !== 'undefined' ? (crypto as any) : null
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function bytesOf(text: string): number {
  try {
    return new TextEncoder().encode(text).byteLength
  } catch {
    return text.length
  }
}

function deriveTitle(rawText: string, parsedCount: number, originalPrompt?: string): string {
  // 优先用用户原始 prompt: 用户最容易记住自己输入了什么, 历史抽屉一眼能认出.
  const op = (originalPrompt ?? '').replace(/\s+/g, ' ').trim()
  if (op) return op.slice(0, 80)
  // 兜底: 老逻辑取首个用例名 / "N 条用例" / 前 40 字 / "空用例".
  const m = rawText.match(/(?:^|\n)\s*(?:用例名称|用例名|标题|用例标题)\s*[:：]\s*([^\n]+)/)
  if (m && m[1]) return m[1].trim().slice(0, 80)
  if (parsedCount === 0) return rawText.trim().slice(0, 40) || '空用例'
  return `${parsedCount} 条用例`
}

async function fetchValue(key: string): Promise<string | null> {
  const res = await fetch(apiUrl(key), { credentials: 'include' })
  if (!res.ok) throw new Error(`sync GET ${res.status}`)
  const data = (await res.json()) as { value: string | null }
  return data.value ?? null
}

async function putValue(key: string, value: string): Promise<void> {
  const res = await fetch(apiUrl(key), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  if (!res.ok) throw new Error(`sync PUT ${res.status}`)
}

async function deleteValue(key: string): Promise<void> {
  const res = await fetch(apiUrl(key), { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new Error(`sync DELETE ${res.status}`)
}

async function postBatch(ops: { op: 'set' | 'remove'; key: string; value?: string }[]): Promise<void> {
  if (ops.length === 0) return
  const res = await fetch(batchUrl(), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ops }),
  })
  if (!res.ok) throw new Error(`sync BATCH ${res.status}`)
}

function parseIndex(text: string | null): AutotestCaseSnapshotMeta[] {
  if (!text) return []
  try {
    const data = JSON.parse(text) as IndexEnvelope
    if (!data || !Array.isArray(data.items)) return []
    return data.items
  } catch {
    return []
  }
}

async function writeIndex(items: AutotestCaseSnapshotMeta[]): Promise<void> {
  const envelope: IndexEnvelope = { items }
  await putValue(INDEX_KEY, JSON.stringify(envelope))
}

async function loadList(force = false): Promise<void> {
  if (loading.value) return
  if (loaded.value && !force) return
  loading.value = true
  error.value = ''
  try {
    const raw = await fetchValue(INDEX_KEY)
    const items = parseIndex(raw).sort((a, b) => b.savedAt - a.savedAt)
    list.value = items
    loaded.value = true
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

export type SaveSnapshotInput = {
  rawText: string
  modelName?: string
  sceneMark?: string
  optimizedPrompt?: string
  originalPrompt?: string
  title?: string
  // 同步当时的生成上下文 (全部可选, 缺省视作未选).
  addedItems?: AddedItemSnapshot[]
  selectedModuleIds?: string[]
  selectedModulePaths?: string[]
  selectedModelKey?: string
  selectedOptimizationMode?: string
}

async function saveSnapshot(input: SaveSnapshotInput): Promise<AutotestCaseSnapshotMeta> {
  // 直接原文持久化, 不做任何解析 / 剥围栏 / 格式化, 还原时 1:1 还原用户当时看到的内容.
  const rawText = input.rawText ?? ''
  if (!rawText.trim()) throw new Error('rawText 为空, 无法同步')

  // 同步前确保 index 是最新 (避免并发同步导致 index 覆盖丢条目).
  await loadList(true)

  const parsed = parseTestCases(rawText)
  const meta: AutotestCaseSnapshotMeta = {
    id: genId(),
    savedAt: Date.now(),
    casesCount: parsed.length,
    title: (input.title ?? deriveTitle(rawText, parsed.length, input.originalPrompt)).trim(),
    modelName: (input.modelName ?? '').trim(),
    sceneMark: (input.sceneMark ?? '').trim(),
    bytes: bytesOf(rawText),
  }
  const snapshot: AutotestCaseSnapshot = {
    ...meta,
    rawText,
    optimizedPrompt: input.optimizedPrompt,
    originalPrompt: input.originalPrompt,
    addedItems: input.addedItems,
    selectedModuleIds: input.selectedModuleIds,
    selectedModulePaths: input.selectedModulePaths,
    selectedModelKey: input.selectedModelKey,
    selectedOptimizationMode: input.selectedOptimizationMode,
  }

  const nextItems = [meta, ...list.value]
  // 内容 + 索引一次性提交, batch 内任一失败 D1 整体回滚, 避免出现 index 有条目但 item 缺失.
  await postBatch([
    { op: 'set', key: itemKey(meta.id), value: JSON.stringify(snapshot) },
    { op: 'set', key: INDEX_KEY, value: JSON.stringify({ items: nextItems } satisfies IndexEnvelope) },
  ])
  list.value = nextItems
  loaded.value = true
  return meta
}

async function getSnapshot(id: string): Promise<AutotestCaseSnapshot | null> {
  const raw = await fetchValue(itemKey(id))
  if (!raw) return null
  try {
    return JSON.parse(raw) as AutotestCaseSnapshot
  } catch {
    return null
  }
}

async function deleteSnapshot(id: string): Promise<void> {
  const next = list.value.filter((s) => s.id !== id)
  await postBatch([
    { op: 'remove', key: itemKey(id) },
    { op: 'set', key: INDEX_KEY, value: JSON.stringify({ items: next } satisfies IndexEnvelope) },
  ])
  list.value = next
}

async function clearAll(): Promise<void> {
  if (list.value.length === 0) {
    await deleteValue(INDEX_KEY).catch(() => undefined)
    return
  }
  const ops: { op: 'set' | 'remove'; key: string; value?: string }[] = list.value.map((s) => ({
    op: 'remove',
    key: itemKey(s.id),
  }))
  ops.push({ op: 'remove', key: INDEX_KEY })
  await postBatch(ops)
  list.value = []
}

export function useAutotestCasesHistory() {
  const hasItems = computed(() => list.value.length > 0)
  return {
    list,
    hasItems,
    loading,
    loaded,
    error,
    loadList,
    saveSnapshot,
    getSnapshot,
    deleteSnapshot,
    clearAll,
  }
}
