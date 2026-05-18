import { Hono, Context, Next } from 'hono'
import { loadServerConfig } from './config/env.ts'
import imageResearchRouter from './routes/imageResearch.ts'
import httpProxyRouter from './routes/httpProxy.ts'
import streamProxyRouter from './routes/streamProxy.ts'
import confluenceParseRouter from './routes/confluenceParse.ts'
import markdownResearchRouter from './routes/markdownResearch.ts'
import figmaParseRouter from './routes/figmaParse.ts'
import syncRouter from './routes/sync.ts'
import type { HonoEnv } from './types/env.ts'

export const app = new Hono<HonoEnv>()

app.use('*', async (c: Context<HonoEnv>, next: Next) => {
  c.set('config', loadServerConfig(c.env))
  await next()
})

app.use('*', async (c: Context<HonoEnv>, next: Next) => {
  console.log(`${c.req.method} ${c.req.path}`)
  await next()
})

app.get('/healthz', (c: Context<HonoEnv>) => c.text('ok'))

app.route('/image-research', imageResearchRouter)
app.route('/http-proxy', httpProxyRouter)
app.route('/stream-proxy', streamProxyRouter)
app.route('/confluence-parse', confluenceParseRouter)
app.route('/markdown-research', markdownResearchRouter)
app.route('/figma-parse', figmaParseRouter)
app.route('/api/sync', syncRouter)

// 兜底 404：未匹配到任何 API 路由时返回结构化 JSON，避免 Hono 默认裸文本响应。
// 静态资源 (SPA fallback) 由 Workers Static Assets `not_found_handling` 直接接管，
// 不会走到 Worker，所以此处只服务 API 范围内的 404。
app.notFound((c: Context<HonoEnv>) =>
  c.json({ error: 'Not Found', path: c.req.path }, 404),
)

// 全局错误兜底：业务路由内若抛出未捕获异常，统一输出结构化 JSON，
// 避免栈信息直接泄漏到客户端；同时把详情打到 wrangler tail 便于排障。
app.onError((err, c: Context<HonoEnv>) => {
  console.error(`unhandled error on ${c.req.method} ${c.req.path}:`, err?.message || err)
  return c.json({ error: 'Internal Server Error', path: c.req.path }, 500)
})
