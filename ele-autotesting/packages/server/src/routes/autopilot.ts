import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'

/**
 * /api/autopilot/ingest — 透传到 ele-autopilot `/api/v1/ingest/tasks`.
 *
 * 契约: ele-autopilot/docs/ingest-api.md (公网 Bypass, 无鉴权, 无幂等).
 * 入参: { source, folder_path[], tasks?[], chain? }
 * 出参: 透传上游 status + body. 成功 201 / 失败 4xx-5xx.
 *
 * 走公网 gateway 而非 service binding, 原因:
 *   - gateway 已对 `/api/*` 配置 CF Access Bypass, 公网可达
 *   - service binding 在 wrangler dev 默认 local mode 下要求被绑定 Worker 本地起,
 *     增加开发心智; 公网 fetch 两端都一致
 */

const router = new Hono<HonoEnv>()

router.post('/ingest', async (c: Context<HonoEnv>) => {
  const base = (c.env.QA_AUTOPILOT_INGEST_BASE ?? '').trim()
  if (!base) {
    return c.json({ error: 'QA_AUTOPILOT_INGEST_BASE not configured' }, 500)
  }

  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid json body' }, 400)
  }

  // 调用方 (autotesting Worker) 总以 source=`autotesting` 上报, 无视客户端传入.
  // 上游 ingest 用 source 在 web UI 做色 hash 标识, 这里强制保证统一.
  const payload = { ...body, source: 'autotesting' }

  const url = `${base.replace(/\/+$/, '')}/api/v1/ingest/tasks`
  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e: any) {
    console.error('autopilot ingest fetch failed:', e?.message || e)
    return c.json({ error: `autopilot fetch failed: ${e?.message ?? e}` }, 502)
  }

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
})

export default router
