import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import { readHarnessLlmConfig } from './integrationsHarnessLlm.ts'

/**
 * /api/harness/oneshot — 代理到 ele-harness agentic-loop `/v1/oneshot`.
 *
 * 链路: 浏览器 -> gateway -> autotesting Worker -> env.AGENTIC_LOOP (VPC) ->
 *       cloudflared tunnel `ele-server` -> ele-fly docker agentic-loop:3000
 *
 * VPC binding 不需要任何鉴权 (绕过了 harness Worker + CF Access). 仅作链路打通,
 * 后续要套权限层时再切公网 `harness.<account>.workers.dev` + service token.
 *
 * BYOK (ele-harness v0.6.0): 每个 oneshot 必须带 credentials = { provider, model,
 * apiKey, baseUrl } 四字段, 可选 maxTurns / maxTokens / temperature. 凭证不由调用方传入,
 * 而是服务端按 ownerId 从 autotesting 自家 D1 (集成中心 ele-harness Tab) 读取后
 * 注入 upstream body; 缺失则 412 + code=HARNESS_LLM_NOT_CONFIGURED 引导前端跳设置.
 *
 * 入参 (来自前端): { prompt, systemPrompt?, appendSystemPrompt?, source? }
 * 出参: { text, sessionId?, events } — text 取最后一个 `assistant_message` 的
 *       所有 text block 拼接, 等价 PLAN 中的 `lastAssistantText`.
 *
 * 注意: agentic-loop 一次性 (非流式) 调用同步 await 完整 turn 循环, 内含 LLM
 * 思考 + tool 调用; 单次可能耗时数十秒到数分钟. Worker 上限是 cpu_ms (wrangler 配),
 * 而非 wall-clock; 这里只做转发, 不在 Worker 上做长循环.
 */

type HarnessVars = HonoEnv['Variables'] & { ownerId: string }
type HarnessHonoEnv = { Bindings: HonoEnv['Bindings']; Variables: HarnessVars }

const router = new Hono<HarnessHonoEnv>()

interface OneshotEvent {
  type: string
  message?: {
    role?: string
    blocks?: Array<{ type: string; text?: string }>
  }
  text?: string
  sessionId?: string
}

function extractLastAssistantText(events: OneshotEvent[]): string {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i]
    if (ev?.type !== 'assistant_message') continue
    const blocks = Array.isArray(ev.message?.blocks) ? ev.message?.blocks : []
    const text = blocks
      .filter((b) => b?.type === 'text' && typeof b?.text === 'string')
      .map((b) => b.text as string)
      .join('')
    if (text.trim()) return text
  }
  // Fallback: 把所有 text_delta / assistant text 拼起来. 兼容 turn 提前结束的情况.
  return events
    .filter((e) => e?.type === 'text_delta' && typeof e?.text === 'string')
    .map((e) => e.text as string)
    .join('')
}

router.post('/oneshot', async (c: Context<HarnessHonoEnv>) => {
  if (!c.env.AGENTIC_LOOP) {
    return c.json({ error: 'AGENTIC_LOOP VPC binding not configured' }, 500)
  }

  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid json body' }, 400)
  }

  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) return c.json({ error: 'prompt required (non-empty string)' }, 400)

  const cfg = await readHarnessLlmConfig(c)
  if (!cfg) {
    return c.json(
      {
        error:
          'harness LLM 凭证未配置, 请在【集成中心 → ele-harness】Tab 填写 provider / model / apiKey / baseUrl 后再试',
        code: 'HARNESS_LLM_NOT_CONFIGURED',
      },
      412,
    )
  }

  const upstreamBody: Record<string, unknown> = {
    prompt,
    source: typeof body?.source === 'string' && body.source.trim() ? body.source.trim() : 'autotesting',
    credentials: {
      provider: cfg.provider,
      model: cfg.model,
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl,
    },
  }
  if (cfg.maxTurns !== undefined) upstreamBody.maxTurns = cfg.maxTurns
  if (cfg.maxTokens !== undefined) upstreamBody.maxTokens = cfg.maxTokens
  if (cfg.temperature !== undefined) upstreamBody.temperature = cfg.temperature
  if (typeof body?.systemPrompt === 'string' && body.systemPrompt.trim()) {
    upstreamBody.systemPrompt = body.systemPrompt
  }
  if (typeof body?.appendSystemPrompt === 'string' && body.appendSystemPrompt.trim()) {
    upstreamBody.appendSystemPrompt = body.appendSystemPrompt
  }

  // VPC binding 的 URL hostname 仅为 placeholder, VPC service 路由到 agentic-loop:3000.
  let upstream: Response
  try {
    upstream = await c.env.AGENTIC_LOOP.fetch('http://backend/v1/oneshot', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(upstreamBody),
    })
  } catch (e: any) {
    console.error('harness vpc fetch failed:', e?.message || e)
    return c.json({ error: `harness vpc fetch failed: ${e?.message ?? e}` }, 502)
  }

  const text = await upstream.text()
  if (!upstream.ok) {
    console.error(`harness ${upstream.status}:`, text.slice(0, 500))
    return c.json({ error: `harness ${upstream.status}`, detail: text.slice(0, 1000) }, 502)
  }

  let payload: any
  try {
    payload = JSON.parse(text)
  } catch {
    return c.json({ error: 'harness returned non-JSON', raw: text.slice(0, 500) }, 502)
  }

  const events: OneshotEvent[] = Array.isArray(payload?.events) ? payload.events : []
  if (!events.length) {
    return c.json({ error: 'harness returned no events', raw: payload }, 502)
  }

  // 取 request_start 第一个事件里的 sessionId, 便于排错时去 harness sessions 库捞.
  const requestStart = events.find((e) => e?.type === 'request_start')
  const sessionId = typeof requestStart?.sessionId === 'string' ? requestStart.sessionId : undefined

  const lastText = extractLastAssistantText(events)
  if (!lastText.trim()) {
    return c.json(
      { error: 'harness returned no assistant text', events: events.slice(-5), sessionId },
      502,
    )
  }

  return c.json({ text: lastText, sessionId, events })
})

export default router
