import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import {
  mergeIncomingQuery,
  shouldStripResponseHeader,
  validateProxyTarget,
} from '../utils/proxyGuard.ts'

const router = new Hono<HonoEnv>()

router.all('/', async (c: Context<HonoEnv>) => {
  const targetUrl = c.req.query('targetUrl')
  if (!targetUrl) return c.json({ error: '缺少目标URL参数' }, 400)

  const guard = validateProxyTarget(targetUrl)
  if ('error' in guard) return c.json({ error: guard.error }, guard.status)
  const validTargetUrl = mergeIncomingQuery(guard.url, c.req.raw.url)

  const headers: Record<string, string> = {}
  c.req.raw.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (!['host', 'connection', 'content-length', 'accept-encoding'].includes(lowerKey)) {
      headers[key] = value
    }
  })
  headers['Accept-Encoding'] = 'gzip, deflate, br'

  let body: string | undefined
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    try {
      body = JSON.stringify(await c.req.json())
    } catch {
      body = await c.req.text()
    }
  }

  try {
    const fetchResponse = await fetch(validTargetUrl, {
      method: c.req.method,
      headers,
      body,
    })

    const responseHeaders: Record<string, string> = {}
    fetchResponse.headers.forEach((value, key) => {
      if (!shouldStripResponseHeader(key)) {
        responseHeaders[key] = value
      }
    })

    // 直接把上游 body 流式回传, 不要 .text() 把整个响应缓存到 Worker 内存:
    // CF Workers 单实例 128MB 上限, 上游返回大附件 (PDF/图床) 会直接 OOM 502.
    return new Response(fetchResponse.body, {
      status: fetchResponse.status,
      headers: responseHeaders,
    })
  } catch (error: any) {
    console.error('代理请求失败:', error?.message || error)
    return c.json({ error: `代理请求失败: ${error?.message || error}` }, 500)
  }
})

export default router
