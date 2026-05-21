import { Hono, Context } from 'hono'
import { stream } from 'hono/streaming'
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

  let fetchResponse: Response
  try {
    fetchResponse = await fetch(validTargetUrl, {
      method: c.req.method,
      headers,
      body,
    })
  } catch (error: any) {
    console.error('流式代理请求失败:', error?.message || error)
    return c.json({ error: `流式代理请求失败: ${error?.message || error}` }, 500)
  }

  const responseHeaders: Record<string, string> = {}
  fetchResponse.headers.forEach((value, key) => {
    if (!shouldStripResponseHeader(key)) {
      responseHeaders[key] = value
    }
  })

  const contentType = fetchResponse.headers.get('content-type') || ''
  const isEventStream = contentType.includes('text/event-stream')

  if (isEventStream) {
    responseHeaders['Content-Type'] = 'text/event-stream'
    responseHeaders['Cache-Control'] = 'no-cache'
    responseHeaders['Connection'] = 'keep-alive'
    responseHeaders['X-Accel-Buffering'] = 'no'

    return stream(c, async (s) => {
      if (!fetchResponse.body) return
      const reader = fetchResponse.body.getReader()
      // 客户端断开 / s.write throw 时, 上游 reader 必须显式 cancel,
      // 否则 fetchResponse 这边的 ReadableStream 仍处于 reading 状态, Worker 实例里
      // 会留下半开连接, 长跑会耗尽 fetch outbound 配额. abort signal 这里没有
      // (Hono stream 内部不暴露), 用 try/finally 兜底.
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await s.write(value)
        }
      } catch (error) {
        console.error('流式传输错误:', (error as Error)?.message || error)
        throw error
      } finally {
        try {
          await reader.cancel()
        } catch {
          /* reader 已结束, 忽略 */
        }
      }
    })
  }

  return new Response(fetchResponse.body, {
    status: fetchResponse.status,
    headers: responseHeaders,
  })
})

export default router
