import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import { resolveOwner } from '../middleware/auth.ts'
import { getDb } from '../lib/db.ts'

/**
 * /api/modules — 集成中心 模块 Tab 的 path 列表存储.
 *
 * 多行表 (区别于 integrations:* 的单 KV 形态): 一个 owner 可配置任意多个模块,
 * 每条模块本质是一条 path (例: `/a/b`), 生成测试用例时被多选并注入 LLM prompt 末尾.
 *
 * GET    /                返回当前 owner 的所有模块, 按 updated_at desc.
 * POST   /                新增一个模块; body = { path: string, name?: string }.
 *                         path 不可重复 (UNIQUE owner_id,path); 409 时返回已存在记录.
 * DELETE /:id             按 id 删除.
 *
 * 储存裸 path, 不做 schema 校验 (尾部斜杠 / 大小写差异由用户自负).
 * 这里只 trim 首尾空白避免肉眼不可见的差异破坏 UNIQUE 约束.
 */

type ModulesEnv = {
  Bindings: HonoEnv['Bindings']
  Variables: HonoEnv['Variables'] & { ownerId: string }
}

const router = new Hono<ModulesEnv>()
router.use('*', resolveOwner)

export interface ModuleRow {
  id: string
  path: string
  name: string | null
  created_at: number
  updated_at: number
}

function genId(): string {
  // 16 字节随机十六进制 id; 不依赖 ULID, D1 worker 运行时无该 package.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

router.get('/', async (c: Context<ModulesEnv>) => {
  try {
    const rs = await getDb(c).prepare(
      'SELECT id, path, name, created_at, updated_at FROM modules WHERE owner_id = ? ORDER BY updated_at DESC',
    )
      .bind(c.var.ownerId)
      .all<ModuleRow>()
    return c.json({ modules: rs.results ?? [] })
  } catch (e: any) {
    console.error('modules list error:', e?.message || e)
    return c.json({ error: 'storage read failed' }, 500)
  }
})

router.post('/', async (c: Context<ModulesEnv>) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid json body' }, 400)
  }
  if (!body || typeof body !== 'object') return c.json({ error: 'body must be object' }, 400)
  const path = typeof body.path === 'string' ? body.path.trim() : ''
  if (!path) return c.json({ error: 'path required (non-empty string)' }, 422)
  const name =
    typeof body.name === 'string' && body.name.trim() !== '' ? body.name.trim() : null

  const id = genId()
  const now = Date.now()
  try {
    await getDb(c).prepare(
      'INSERT INTO modules (owner_id, id, path, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(c.var.ownerId, id, path, name, now, now)
      .run()
    return c.json({ module: { id, path, name, created_at: now, updated_at: now } satisfies ModuleRow })
  } catch (e: any) {
    const msg = String(e?.message || e)
    // D1 UNIQUE 冲突: SQLITE_CONSTRAINT_UNIQUE / "UNIQUE constraint failed"
    if (/UNIQUE/i.test(msg)) {
      const existing = await getDb(c).prepare(
        'SELECT id, path, name, created_at, updated_at FROM modules WHERE owner_id = ? AND path = ?',
      )
        .bind(c.var.ownerId, path)
        .first<ModuleRow>()
      return c.json({ error: 'path already exists', module: existing }, 409)
    }
    console.error('modules insert error:', msg)
    return c.json({ error: 'storage write failed' }, 500)
  }
})

router.delete('/:id', async (c: Context<ModulesEnv>) => {
  const id = c.req.param('id')
  if (!id) return c.json({ error: 'id required' }, 400)
  try {
    const r = await getDb(c).prepare('DELETE FROM modules WHERE owner_id = ? AND id = ?')
      .bind(c.var.ownerId, id)
      .run()
    if (!r.meta?.changes) return c.json({ error: 'not found' }, 404)
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('modules delete error:', e?.message || e)
    return c.json({ error: 'storage delete failed' }, 500)
  }
})

export default router
