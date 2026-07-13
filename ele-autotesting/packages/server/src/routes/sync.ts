import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import { resolveOwner } from '../middleware/auth.ts'
import { getDb } from '../lib/db.ts'

/**
 * /api/sync — libSQL 远程 KV 存储。语义与浏览器侧 IStorageProvider 一一对应:
 *   GET    /api/sync/items          -> 列出当前 owner 的所有 (key,value), 给迁移/导出用
 *   GET    /api/sync/items/:key     -> 单 key 读
 *   PUT    /api/sync/items/:key     -> 单 key 写, body { value: string }
 *   DELETE /api/sync/items/:key     -> 单 key 删
 *   POST   /api/sync/batch          -> 批量 { ops: [{key, op:'set'|'remove', value?}] }
 *   DELETE /api/sync/items          -> 清空当前 owner 的所有数据
 *
 * 所有路由依赖 resolveOwner 中间件注入的 c.var.ownerId.
 * libSQL 单表 storage(owner_id, key, value, updated_at), 见 migrations/0001_init.sql.
 */

// 子路由对 ownerId 有强依赖, 用本地类型把可选字段收紧成必填,
// 避免每个 handler 里都要 ! 断言.
type SyncEnv = {
  Bindings: HonoEnv['Bindings']
  Variables: HonoEnv['Variables'] & { ownerId: string }
}

const router = new Hono<SyncEnv>()

router.use('*', resolveOwner)

const MAX_KEY_LEN = 256
// 单值大小上限 (防超大 value 撑高内存 / 撑爆行). 按 UTF-8 字节数算, 而不是 string.length —
// 后者对中文等多字节字符会严重低估实际占用.
const MAX_VALUE_BYTES = 900 * 1024
const VALUE_BYTE_COUNTER = new TextEncoder()

function validateKey(key: string): string | null {
  if (!key) return 'key required'
  if (key.length > MAX_KEY_LEN) return `key too long (max ${MAX_KEY_LEN})`
  if (/[\x00-\x1f\x7f]/.test(key)) return 'key contains control chars'
  return null
}

function validateValue(value: unknown): string | null {
  if (typeof value !== 'string') return 'value must be string'
  const bytes = VALUE_BYTE_COUNTER.encode(value).byteLength
  if (bytes > MAX_VALUE_BYTES) return `value too large (${bytes} bytes, max ${MAX_VALUE_BYTES})`
  return null
}

router.get('/items', async (c: Context<SyncEnv>) => {
  const ownerId = c.var.ownerId
  try {
    const { results } = await getDb(c).prepare(
      'SELECT key, value FROM storage WHERE owner_id = ?',
    )
      .bind(ownerId)
      .all<{ key: string; value: string }>()

    const entries: Record<string, string> = {}
    for (const row of results ?? []) {
      entries[row.key] = row.value
    }
    return c.json({ entries })
  } catch (e: any) {
    console.error('sync list error:', e?.message || e)
    return c.json({ error: 'storage read failed' }, 500)
  }
})

router.get('/items/:key', async (c: Context<SyncEnv>) => {
  const ownerId = c.var.ownerId
  const key = c.req.param('key')
  const keyErr = validateKey(key)
  if (keyErr) return c.json({ error: keyErr }, 400)

  try {
    const row = await getDb(c).prepare(
      'SELECT value FROM storage WHERE owner_id = ? AND key = ?',
    )
      .bind(ownerId, key)
      .first<{ value: string }>()

    return c.json({ value: row?.value ?? null })
  } catch (e: any) {
    console.error('sync get error:', e?.message || e)
    return c.json({ error: 'storage read failed' }, 500)
  }
})

router.put('/items/:key', async (c: Context<SyncEnv>) => {
  const ownerId = c.var.ownerId
  const key = c.req.param('key')
  const keyErr = validateKey(key)
  if (keyErr) return c.json({ error: keyErr }, 400)

  let body: { value?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid json body' }, 400)
  }

  const valueErr = validateValue(body.value)
  if (valueErr) return c.json({ error: valueErr }, 400)

  try {
    await getDb(c).prepare(
      'INSERT INTO storage (owner_id, key, value, updated_at) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    )
      .bind(ownerId, key, body.value as string, Date.now())
      .run()
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('sync put error:', e?.message || e)
    return c.json({ error: 'storage write failed' }, 500)
  }
})

router.delete('/items/:key', async (c: Context<SyncEnv>) => {
  const ownerId = c.var.ownerId
  const key = c.req.param('key')
  const keyErr = validateKey(key)
  if (keyErr) return c.json({ error: keyErr }, 400)

  try {
    await getDb(c).prepare('DELETE FROM storage WHERE owner_id = ? AND key = ?')
      .bind(ownerId, key)
      .run()
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('sync delete error:', e?.message || e)
    return c.json({ error: 'storage delete failed' }, 500)
  }
})

router.delete('/items', async (c: Context<SyncEnv>) => {
  const ownerId = c.var.ownerId
  try {
    await getDb(c).prepare('DELETE FROM storage WHERE owner_id = ?').bind(ownerId).run()
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('sync clear error:', e?.message || e)
    return c.json({ error: 'storage clear failed' }, 500)
  }
})

interface BatchOp {
  key: string
  op: 'set' | 'remove'
  value?: unknown
}

router.post('/batch', async (c: Context<SyncEnv>) => {
  const ownerId = c.var.ownerId

  let body: { ops?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid json body' }, 400)
  }

  if (!Array.isArray(body.ops)) return c.json({ error: 'ops must be array' }, 400)
  const ops = body.ops as BatchOp[]
  if (ops.length === 0) return c.json({ ok: true, count: 0 })
  if (ops.length > 500) return c.json({ error: 'too many ops (max 500)' }, 400)

  const stmts: any[] = []
  const now = Date.now()
  for (const op of ops) {
    const keyErr = validateKey(op.key)
    if (keyErr) return c.json({ error: `op[${op.key}]: ${keyErr}` }, 400)

    if (op.op === 'set') {
      const valueErr = validateValue(op.value)
      if (valueErr) return c.json({ error: `op[${op.key}]: ${valueErr}` }, 400)
      stmts.push(
        getDb(c).prepare(
          'INSERT INTO storage (owner_id, key, value, updated_at) VALUES (?, ?, ?, ?) ' +
            'ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
        ).bind(ownerId, op.key, op.value as string, now),
      )
    } else if (op.op === 'remove') {
      stmts.push(
        getDb(c).prepare('DELETE FROM storage WHERE owner_id = ? AND key = ?').bind(ownerId, op.key),
      )
    } else {
      return c.json({ error: `op[${op.key}]: unknown op ${op.op}` }, 400)
    }
  }

  try {
    await getDb(c).batch(stmts)
    return c.json({ ok: true, count: ops.length })
  } catch (e: any) {
    console.error('sync batch error:', e?.message || e)
    return c.json({ error: 'storage batch failed' }, 500)
  }
})

export default router
