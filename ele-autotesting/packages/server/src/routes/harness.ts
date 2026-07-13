import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import { readHarnessLlmConfig } from './integrationsHarnessLlm.ts'
import { upstreamFetch } from '../lib/upstream.ts'

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
 * 出参: { text, sessionId?, events } — text 为 harness 聚合的最终文本.
 *
 * 传输: 用 SSE (accept: text/event-stream) + quiet 模式调 harness. harness 全程
 * 只发 15s 一次的 `: keepalive` 保活 + 末尾一个 final 事件, 既避免长 turn (数分钟)
 * 期间 VPC/Tunnel 因连接零数据 (connection_read_timeout) 约 5min 断开, 又省去中间
 * 事件的回传带宽. Worker 只转发, 不做长循环 (上限是 cpu_ms 而非 wall-clock).
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

/**
 * 读 harness SSE 流, 累积 oneshot 事件.
 *
 * - 跳过 `: keepalive` 注释行 (harness streamSSE 每 15s 一次, 用于持续重置 CF
 *   VPC/Tunnel 的 connection_read_timeout, 避免长 turn 期间连接被判 idle).
 * - quiet 模式 (本路由默认开): harness 末尾只发一个 `{ type:'final', text, sessionId }`,
 *   中间事件不传输; 识别后经 final 返回, 调用方直接取 text.
 * - harness 内部异常以 `{ type:'error', message }` 事件下发, 提取为 error, 由调用方转 502.
 */
async function readSseEvents(
  body: ReadableStream<Uint8Array>,
): Promise<{ events: OneshotEvent[]; error?: string; final?: { text: string; sessionId?: string } }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const events: OneshotEvent[] = []
  let error: string | undefined
  let final: { text: string; sessionId?: string } | undefined
  let buf = ''
  for (;;) {
    // 不解构: 保留 discriminated union, 让 chunk.value 在 !done 分支 narrow 为 Uint8Array.
    const chunk = await reader.read()
    if (chunk.done) break
    buf += decoder.decode(chunk.value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue // 跳过 `: keepalive` 注释行
        const raw = line.slice(5).trim()
        if (!raw) continue
        let ev: OneshotEvent
        try {
          ev = JSON.parse(raw) as OneshotEvent
        } catch {
          continue
        }
        if (ev?.type === 'error') error = (ev as any).message ?? 'harness stream error'
        else if (ev?.type === 'final') final = { text: ev.text ?? '', sessionId: ev.sessionId }
        else events.push(ev)
      }
    }
  }
  return { events, error, final }
}

router.post('/oneshot', async (c: Context<HarnessHonoEnv>) => {
  if (!c.env.AGENTIC_LOOP_URL?.trim()) {
    return c.json({ error: 'AGENTIC_LOOP_URL not configured' }, 500)
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
  //
  // 用 SSE 流式 (accept: text/event-stream) 走 harness streamSSE 分支: 它每 15s 发
  // `: keepalive`, 让连接持续有字节流动, 从而不断重置 CF VPC/Tunnel 的
  // connection_read_timeout. 否则非流式时整个 turn (可能数分钟) 期间连接零数据,
  // 约 5min 被判 idle, Worker 侧 fetch 抛 "Network connection lost".
  let upstream: Response
  try {
    upstream = await upstreamFetch(c.env, 'AGENTIC_LOOP', '/v1/oneshot', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify(upstreamBody),
    })
  } catch (e: any) {
    console.error('harness vpc fetch failed:', e?.message || e)
    return c.json({ error: `harness vpc fetch failed: ${e?.message ?? e}` }, 502)
  }

  // 校验失败 (400/412/500) harness 在进入 SSE 前就以 JSON 返回, 原样透传.
  if (!upstream.ok) {
    const errText = await upstream.text()
    console.error(`harness ${upstream.status}:`, errText.slice(0, 500))
    return c.json({ error: `harness ${upstream.status}`, detail: errText.slice(0, 1000) }, 502)
  }

  let events: OneshotEvent[] = []
  let final: { text: string; sessionId?: string } | undefined
  const ctype = upstream.headers.get('content-type') ?? ''
  if (ctype.includes('text/event-stream') && upstream.body) {
    const parsed = await readSseEvents(upstream.body)
    if (parsed.error) {
      console.error('harness stream error:', parsed.error)
      return c.json({ error: `harness stream error: ${parsed.error}` }, 502)
    }
    events = parsed.events
    final = parsed.final
  } else {
    // 兜底: 旧 harness 未识别 accept 时退回一次性 JSON (长任务仍会触发 read timeout).
    const text = await upstream.text()
    try {
      const payload = JSON.parse(text)
      events = Array.isArray(payload?.events) ? payload.events : []
    } catch {
      return c.json({ error: 'harness returned non-JSON', raw: text.slice(0, 500) }, 502)
    }
  }

  // quiet 模式下 harness 已聚合好最终结果 (final), 直接用; 否则从完整 events 提取
  // (非 quiet / 旧 harness 回退). sessionId 仅用于排错时去 harness sessions 库捞.
  if (!final && !events.length) {
    return c.json({ error: 'harness returned no events' }, 502)
  }
  const text = final ? final.text : extractLastAssistantText(events)
  const sessionId = final
    ? final.sessionId
    : events.find((e) => e?.type === 'request_start')?.sessionId

  if (!text.trim()) {
    return c.json({ error: 'harness returned no assistant text', sessionId }, 502)
  }

  return c.json({ text, sessionId, events })
})

export default router
