import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import { resolveOwner } from '../middleware/auth.ts'
import { getDb } from '../lib/db.ts'

/**
 * /api/integrations/figma — 集成中心 Figma Tab 的 PAT 存储.
 *
 * 字段: { token: string }. 不存任何回显字段, Worker 在 /figma-parse 内部读 token
 * 调用 https://api.figma.com, 浏览器侧不再持有明文.
 *
 * 存储: D1 storage 表, owner-scoped (c.var.ownerId), key = 'integration:figma'.
 * 与通用 /api/sync 走同一张表, 但走专用路由避免明文 token 命中浏览器掩码逻辑.
 *
 * GET 默认返掩码; GET ?raw=1 不开放 (前端用不到, 也避免明文落浏览器).
 * PUT body token 为空字符串 = 复用已存 token, 与 harness-llm 同语义.
 * DELETE 整条清除.
 */

type FigmaEnv = {
  Bindings: HonoEnv['Bindings']
  Variables: HonoEnv['Variables'] & { ownerId: string }
}

const router = new Hono<FigmaEnv>()
router.use('*', resolveOwner)

export const FIGMA_STORAGE_KEY = 'integration:figma'

export interface FigmaIntegrationConfig {
  token: string
}

function maskToken(token: string): string {
  if (!token) return ''
  if (token.length <= 8) return '*'.repeat(token.length)
  return `${token.slice(0, 4)}${'*'.repeat(token.length - 8)}${token.slice(-4)}`
}

export async function readFigmaConfig(
  c: Context<{ Bindings: HonoEnv['Bindings']; Variables: HonoEnv['Variables'] & { ownerId: string } }>,
): Promise<FigmaIntegrationConfig | null> {
  const row = await getDb(c).prepare(
    'SELECT value FROM storage WHERE owner_id = ? AND key = ?',
  )
    .bind(c.var.ownerId, FIGMA_STORAGE_KEY)
    .first<{ value: string }>()
  if (!row?.value) return null
  try {
    const parsed = JSON.parse(row.value) as FigmaIntegrationConfig
    if (!parsed?.token) return null
    return parsed
  } catch {
    return null
  }
}

async function writeConfig(c: Context<FigmaEnv>, cfg: FigmaIntegrationConfig): Promise<void> {
  await getDb(c).prepare(
    'INSERT INTO storage (owner_id, key, value, updated_at) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  )
    .bind(c.var.ownerId, FIGMA_STORAGE_KEY, JSON.stringify(cfg), Date.now())
    .run()
}

async function deleteConfig(c: Context<FigmaEnv>): Promise<void> {
  await getDb(c).prepare('DELETE FROM storage WHERE owner_id = ? AND key = ?')
    .bind(c.var.ownerId, FIGMA_STORAGE_KEY)
    .run()
}

router.get('/', async (c: Context<FigmaEnv>) => {
  const cfg = await readFigmaConfig(c)
  if (!cfg) return c.json({ configured: false })
  return c.json({ configured: true, token: maskToken(cfg.token) })
})

router.put('/', async (c: Context<FigmaEnv>) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid json body' }, 400)
  }
  if (!body || typeof body !== 'object') return c.json({ error: 'body must be object' }, 400)
  const tokenRaw = typeof body.token === 'string' ? body.token.trim() : ''
  const existing = await readFigmaConfig(c)
  const token = tokenRaw === '' ? (existing?.token ?? '') : tokenRaw
  if (!token) return c.json({ error: 'token required (non-empty string)' }, 422)
  try {
    await writeConfig(c, { token })
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('integrations-figma put error:', e?.message || e)
    return c.json({ error: 'storage write failed' }, 500)
  }
})

router.delete('/', async (c: Context<FigmaEnv>) => {
  try {
    await deleteConfig(c)
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('integrations-figma delete error:', e?.message || e)
    return c.json({ error: 'storage delete failed' }, 500)
  }
})

export default router
