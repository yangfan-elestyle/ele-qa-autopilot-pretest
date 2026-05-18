import { Hono, Context } from 'hono'
import { stream } from 'hono/streaming'
import type { HonoEnv } from '../types/env.ts'

const router = new Hono<HonoEnv>()

router.all('/', async (c: Context<HonoEnv>) => {
  const targetUrl = c.req.query('targetUrl')
  if (!targetUrl) return c.json({ error: '缺少目标URL参数' }, 400)

  let validTargetUrl: string
  try {
    validTargetUrl = new URL(decodeURIComponent(targetUrl)).toString()
  } catch (error: any) {
    return c.json({ error: `无效的目标URL: ${error.message}` }, 400)
  }

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
    const lowerKey = key.toLowerCase()
    if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(lowerKey)) {
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
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await s.write(value)
        }
      } catch (error) {
        console.error('流式传输错误:', (error as Error)?.message || error)
        throw error
      }
    })
  }

  return new Response(fetchResponse.body, {
    status: fetchResponse.status,
    headers: responseHeaders,
  })
})

export default router
