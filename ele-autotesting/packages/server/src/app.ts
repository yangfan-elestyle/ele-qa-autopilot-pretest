import { Hono, Context, Next } from 'hono'
import { loadServerConfig } from './config/env.ts'
import imageResearchRouter from './routes/imageResearch.ts'
import httpProxyRouter from './routes/httpProxy.ts'
import streamProxyRouter from './routes/streamProxy.ts'
import confluenceParseRouter from './routes/confluenceParse.ts'
import markdownResearchRouter from './routes/markdownResearch.ts'
import figmaParseRouter from './routes/figmaParse.ts'
import syncRouter from './routes/sync.ts'
import metersphereRouter from './routes/metersphere.ts'
import harnessRouter from './routes/harness.ts'
import integrationsHarnessLlmRouter from './routes/integrationsHarnessLlm.ts'
import autopilotRouter from './routes/autopilot.ts'
import { resolveOwner } from './middleware/auth.ts'
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

// 凭据敏感路由统一过 resolveOwner: 校验 gateway 透传的 `cf-access-jwt-assertion` JWT,
// 取 email 写 ownerId=`google:<email>`; 缺 token 时 401, 校验失败 403. 防止任意访客
// 让 Worker 用服务端 Atlassian token 或 LLM API key 跑任务; ownerId 维度给后端日志 /
// 速率限制 / 滥用排查留口子. 本地 dev 由 `DEV_FALLBACK_EMAIL` 兜底.
// `/stream-proxy` / `/http-proxy` / `/mcps/markitdown/*` 由 LLM SDK 内部 fetch 发起,
// SDK 无法注入业务自定义头, 走 `proxyGuard` SSRF 黑名单兜底.
app.use('/image-research/*', resolveOwner)
app.use('/markdown-research', resolveOwner)
app.use('/markdown-research/*', resolveOwner)
app.use('/confluence-parse', resolveOwner)
app.use('/confluence-parse/*', resolveOwner)
app.use('/figma-parse', resolveOwner)
app.use('/figma-parse/*', resolveOwner)
// AK/SK 走 X-MS-AK / X-MS-SK header, 服务端不持久化; ownerId 仅作访问审计, 与 D1 无耦合.
app.use('/api/ms/*', resolveOwner)
// harness / autopilot 代理: 仅 google SSO 用户可触发; ownerId 既作审计锚点, 也用于查 harness BYOK 凭证.
app.use('/api/harness/*', resolveOwner)
app.use('/api/autopilot/*', resolveOwner)

app.route('/image-research', imageResearchRouter)
app.route('/http-proxy', httpProxyRouter)
app.route('/stream-proxy', streamProxyRouter)
app.route('/confluence-parse', confluenceParseRouter)
app.route('/markdown-research', markdownResearchRouter)
app.route('/figma-parse', figmaParseRouter)
app.route('/api/sync', syncRouter)
app.route('/api/ms', metersphereRouter)
app.route('/api/harness', harnessRouter)
app.route('/api/integrations/harness-llm', integrationsHarnessLlmRouter)
app.route('/api/autopilot', autopilotRouter)

// API 范围 404 (静态 SPA fallback 由平台层 ASSETS `not_found_handling` 接管, 见 index.ts).
app.notFound((c: Context<HonoEnv>) =>
  c.json({ error: 'Not Found', path: c.req.path }, 404),
)

// 业务异常统一结构化 JSON, 避免栈泄漏到客户端; 详情写 wrangler tail.
app.onError((err, c: Context<HonoEnv>) => {
  console.error(`unhandled error on ${c.req.method} ${c.req.path}:`, err?.message || err)
  return c.json({ error: 'Internal Server Error', path: c.req.path }, 500)
})
