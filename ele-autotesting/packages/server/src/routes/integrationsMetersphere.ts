import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import { resolveOwner } from '../middleware/auth.ts'
import { getDb } from '../lib/db.ts'

/**
 * /api/integrations/metersphere — 集成中心 MeterSphere Tab 的 AK/SK 存储.
 *
 * 字段: { ak: string, sk: string }. /api/ms/* 在 Worker 内读 D1 取出 AK/SK,
 * 签名调用上游, 浏览器侧不再透传任何凭证 header.
 *
 * 存储: D1 storage 表, owner-scoped (c.var.ownerId), key = 'integration:metersphere'.
 *
 * GET 返 { configured, ak: masked, sk: masked }; 不开放 raw.
 * PUT body ak/sk 为空字符串 = 复用已存值, 与 harness-llm / figma 同语义,
 * 用户改其中一项时无需重输另一项.
 * DELETE 整条清除.
 */

type MsEnv = {
  Bindings: HonoEnv['Bindings']
  Variables: HonoEnv['Variables'] & { ownerId: string }
}

const router = new Hono<MsEnv>()
router.use('*', resolveOwner)

export const METERSPHERE_STORAGE_KEY = 'integration:metersphere'

export interface MeterSphereIntegrationConfig {
  ak: string
  sk: string
}

function maskSecret(value: string): string {
  if (!value) return ''
  if (value.length <= 8) return '*'.repeat(value.length)
  return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`
}

export async function readMeterSphereConfig(
  c: Context<{ Bindings: HonoEnv['Bindings']; Variables: HonoEnv['Variables'] & { ownerId: string } }>,
): Promise<MeterSphereIntegrationConfig | null> {
  const row = await getDb(c).prepare(
    'SELECT value FROM storage WHERE owner_id = ? AND key = ?',
  )
    .bind(c.var.ownerId, METERSPHERE_STORAGE_KEY)
    .first<{ value: string }>()
  if (!row?.value) return null
  try {
    const parsed = JSON.parse(row.value) as MeterSphereIntegrationConfig
    if (!parsed?.ak || !parsed?.sk) return null
    return parsed
  } catch {
    return null
  }
}

async function writeConfig(c: Context<MsEnv>, cfg: MeterSphereIntegrationConfig): Promise<void> {
  await getDb(c).prepare(
    'INSERT INTO storage (owner_id, key, value, updated_at) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  )
    .bind(c.var.ownerId, METERSPHERE_STORAGE_KEY, JSON.stringify(cfg), Date.now())
    .run()
}

async function deleteConfig(c: Context<MsEnv>): Promise<void> {
  await getDb(c).prepare('DELETE FROM storage WHERE owner_id = ? AND key = ?')
    .bind(c.var.ownerId, METERSPHERE_STORAGE_KEY)
    .run()
}

router.get('/', async (c: Context<MsEnv>) => {
  const cfg = await readMeterSphereConfig(c)
  if (!cfg) return c.json({ configured: false })
  return c.json({ configured: true, ak: maskSecret(cfg.ak), sk: maskSecret(cfg.sk) })
})

router.put('/', async (c: Context<MsEnv>) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid json body' }, 400)
  }
  if (!body || typeof body !== 'object') return c.json({ error: 'body must be object' }, 400)
  const akRaw = typeof body.ak === 'string' ? body.ak.trim() : ''
  const skRaw = typeof body.sk === 'string' ? body.sk.trim() : ''
  const existing = await readMeterSphereConfig(c)
  const ak = akRaw === '' ? (existing?.ak ?? '') : akRaw
  const sk = skRaw === '' ? (existing?.sk ?? '') : skRaw
  if (!ak) return c.json({ error: 'ak required (non-empty string)' }, 422)
  if (!sk) return c.json({ error: 'sk required (non-empty string)' }, 422)
  try {
    await writeConfig(c, { ak, sk })
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('integrations-metersphere put error:', e?.message || e)
    return c.json({ error: 'storage write failed' }, 500)
  }
})

router.delete('/', async (c: Context<MsEnv>) => {
  try {
    await deleteConfig(c)
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('integrations-metersphere delete error:', e?.message || e)
    return c.json({ error: 'storage delete failed' }, 500)
  }
})

export default router
