import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'

/**
 * /api/autopilot/ingest — 透传到 ele-autopilot `/api/v1/ingest/tasks`.
 *
 * 契约: ele-autopilot/docs/ingest-api.md (公网 Bypass, 无鉴权, 无幂等).
 * 入参: { source, folder_path[], tasks?[], chain? }
 * 出参: 透传上游 status + body. 成功 201 / 失败 4xx-5xx.
 *
 * 走 service binding 而非公网 fetch:
 *   - autotesting Worker 自身经 gateway 暴露在 `qa.<sub>.workers.dev` 后,
 *     Worker fetch 同域会触发 Cloudflare 1101 (self-subrequest cycle).
 *   - service binding 直接 worker-to-worker, 不走边缘, 不会循环.
 *   - ele-autopilot `workers_dev: false`, 公网只能经 gateway, binding 跳过 gateway hop.
 */

const router = new Hono<HonoEnv>()

router.post('/ingest', async (c: Context<HonoEnv>) => {
  if (!c.env.AUTOPILOT) {
    return c.json({ error: 'AUTOPILOT service binding not configured' }, 500)
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

  let upstream: Response
  try {
    upstream = await c.env.AUTOPILOT.fetch('http://autopilot/api/v1/ingest/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e: any) {
    console.error('autopilot ingest fetch failed:', e?.message || e)
    return c.json({ error: `autopilot binding fetch failed: ${e?.message ?? e}` }, 502)
  }

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
})

export default router
