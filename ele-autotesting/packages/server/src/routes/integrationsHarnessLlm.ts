import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import { resolveOwner } from '../middleware/auth.ts'

/**
 * /api/integrations/harness-llm — 集成中心 ele-harness Tab 的 LLM 凭证存储.
 *
 * 字段对齐 ele-harness v0.6.0 ProviderCredentials 四元组 + 三个可选覆盖参数:
 *   { provider, model, apiKey, baseUrl, maxTurns?, maxTokens?, temperature? }
 *
 * 存储: D1 storage 表, owner-scoped (c.var.ownerId), key = 'integration:harness-llm'.
 * 与通用 /api/sync 走同一张表, 但走专用路由避免浏览器侧缓存敏感的 apiKey.
 *
 * GET 默认返掩码; GET ?raw=1 返明文 (供编辑表单回填).
 * PUT body apiKey 为空字符串 = 复用已存 apiKey, 用户改其他字段时无需重输 key.
 * DELETE 整条清除.
 */

type LlmEnv = {
  Bindings: HonoEnv['Bindings']
  Variables: HonoEnv['Variables'] & { ownerId: string }
}

const router = new Hono<LlmEnv>()
router.use('*', resolveOwner)

const STORAGE_KEY = 'integration:harness-llm'
const PROVIDERS = ['openai', 'google', 'ollama', 'lmstudio', 'llamacpp'] as const
type Provider = (typeof PROVIDERS)[number]

interface HarnessLlmConfig {
  provider: Provider
  model: string
  apiKey: string
  baseUrl: string
  maxTurns?: number
  maxTokens?: number
  temperature?: number
}

function maskApiKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '*'.repeat(key.length)
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`
}

async function readConfig(c: Context<LlmEnv>): Promise<HarnessLlmConfig | null> {
  const row = await c.env.DB.prepare(
    'SELECT value FROM storage WHERE owner_id = ? AND key = ?',
  )
    .bind(c.var.ownerId, STORAGE_KEY)
    .first<{ value: string }>()
  if (!row?.value) return null
  try {
    return JSON.parse(row.value) as HarnessLlmConfig
  } catch {
    return null
  }
}

async function writeConfig(c: Context<LlmEnv>, cfg: HarnessLlmConfig): Promise<void> {
  await c.env.DB.prepare(
    'INSERT INTO storage (owner_id, key, value, updated_at) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  )
    .bind(c.var.ownerId, STORAGE_KEY, JSON.stringify(cfg), Date.now())
    .run()
}

async function deleteConfig(c: Context<LlmEnv>): Promise<void> {
  await c.env.DB.prepare('DELETE FROM storage WHERE owner_id = ? AND key = ?')
    .bind(c.var.ownerId, STORAGE_KEY)
    .run()
}

function validate(
  body: any,
  existing: HarnessLlmConfig | null,
): { cfg: HarnessLlmConfig } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'body must be object' }

  const provider = body.provider
  if (typeof provider !== 'string' || !(PROVIDERS as readonly string[]).includes(provider)) {
    return { error: `provider must be one of ${PROVIDERS.join(', ')}` }
  }
  const model = typeof body.model === 'string' ? body.model.trim() : ''
  if (!model) return { error: 'model required (non-empty string)' }

  const apiKeyRaw = typeof body.apiKey === 'string' ? body.apiKey : ''
  const apiKey = apiKeyRaw === '' ? (existing?.apiKey ?? '') : apiKeyRaw
  if (!apiKey) return { error: 'apiKey required (non-empty string)' }

  const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : ''
  if (!baseUrl) return { error: 'baseUrl required (non-empty string)' }
  if (!/^https?:\/\//i.test(baseUrl)) return { error: 'baseUrl must start with http(s)://' }

  const cfg: HarnessLlmConfig = {
    provider: provider as Provider,
    model,
    apiKey,
    baseUrl,
  }
  if (body.maxTurns !== undefined && body.maxTurns !== null && body.maxTurns !== '') {
    const n = Number(body.maxTurns)
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      return { error: 'maxTurns must be integer >= 1' }
    }
    cfg.maxTurns = n
  }
  if (body.maxTokens !== undefined && body.maxTokens !== null && body.maxTokens !== '') {
    const n = Number(body.maxTokens)
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      return { error: 'maxTokens must be integer >= 1' }
    }
    cfg.maxTokens = n
  }
  if (body.temperature !== undefined && body.temperature !== null && body.temperature !== '') {
    const n = Number(body.temperature)
    if (!Number.isFinite(n) || n < 0 || n > 2) {
      return { error: 'temperature must be number in [0, 2]' }
    }
    cfg.temperature = n
  }
  return { cfg }
}

router.get('/', async (c: Context<LlmEnv>) => {
  const cfg = await readConfig(c)
  if (!cfg) return c.json({ configured: false })

  const raw = c.req.query('raw') === '1'
  return c.json({
    configured: true,
    provider: cfg.provider,
    model: cfg.model,
    apiKey: raw ? cfg.apiKey : maskApiKey(cfg.apiKey),
    baseUrl: cfg.baseUrl,
    maxTurns: cfg.maxTurns,
    maxTokens: cfg.maxTokens,
    temperature: cfg.temperature,
  })
})

router.put('/', async (c: Context<LlmEnv>) => {
  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid json body' }, 400)
  }
  const existing = await readConfig(c)
  const v = validate(body, existing)
  if ('error' in v) return c.json({ error: v.error }, 422)
  try {
    await writeConfig(c, v.cfg)
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('integrations-harness-llm put error:', e?.message || e)
    return c.json({ error: 'storage write failed' }, 500)
  }
})

router.delete('/', async (c: Context<LlmEnv>) => {
  try {
    await deleteConfig(c)
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('integrations-harness-llm delete error:', e?.message || e)
    return c.json({ error: 'storage delete failed' }, 500)
  }
})

export default router
export { readConfig as readHarnessLlmConfig, STORAGE_KEY as HARNESS_LLM_STORAGE_KEY }
export type { HarnessLlmConfig, Provider as HarnessProvider }
