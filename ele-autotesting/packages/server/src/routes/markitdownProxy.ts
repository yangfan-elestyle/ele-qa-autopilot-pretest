import { getContainer } from '@cloudflare/containers'
import type { Env } from '../types/env.ts'

/**
 * `/mcps/markitdown/<sub>` → markitdown 服务.
 *
 * 寻址优先级 (迁移前置 A5):
 *   1. `MARKITDOWN_URL` — 内网 Docker compose 同 image 的 HTTP 端点 (迁移日设);
 *   2. `MARKITDOWN_DEV_URL` — 本地 dev 兜底 (OrbStack sidecar 兼容问题时用);
 *   3. 均未设 → `env.MARKITDOWN` Cloudflare Container (CF 默认).
 * 迁移日设 MARKITDOWN_URL 后, DO/Container 分支自然沉为 dead code.
 *
 * Starlette `Mount("/mcp")` 会把 `/mcp` 307 → `/mcp/`, Location 裸 http:// 在
 * Worker edge 断链, 故入口 path 显式补斜杠.
 */
const SUBPATH_PREFIX = '/mcps/markitdown'

export async function handleMarkitdownProxy(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const sub = url.pathname.slice(SUBPATH_PREFIX.length) || '/'
  const httpUrl = env.MARKITDOWN_URL?.trim() || env.MARKITDOWN_DEV_URL?.trim()
  const target = httpUrl ? `http(${httpUrl})` : 'container'
  const start = Date.now()
  console.log(`markitdown-proxy → ${request.method} ${url.pathname} sub=${normalizeSub(sub)} target=${target}`)

  try {
    let response: Response
    if (httpUrl) {
      const targetUrl = new URL(httpUrl.replace(/\/+$/, '') + normalizeSub(sub))
      targetUrl.search = url.search
      response = await fetch(new Request(targetUrl.toString(), request))
    } else {
      const upstreamUrl = new URL(url)
      upstreamUrl.pathname = normalizeSub(sub)
      const upstreamRequest = new Request(upstreamUrl.toString(), request)
      const container = getContainer(env.MARKITDOWN, 'singleton')
      response = await container.fetch(upstreamRequest)
    }

    const duration = Date.now() - start
    const len = response.headers.get('content-length') ?? '?'
    const ct = response.headers.get('content-type') ?? '?'

    if (response.status >= 400) {
      // 失败时采样前 500 字节 body 辅助定位；clone 避免消费原 stream。
      const sample = await response.clone().text().then((t) => t.slice(0, 500)).catch(() => '<unreadable>')
      console.error(
        `markitdown-proxy ✗ ${response.status} ${request.method} ${url.pathname} ${duration}ms ` +
          `ct=${ct} bytes=${len} body=${JSON.stringify(sample)}`,
      )
    } else {
      console.log(
        `markitdown-proxy ← ${response.status} ${request.method} ${url.pathname} ${duration}ms ` +
          `ct=${ct} bytes=${len}`,
      )
    }
    return response
  } catch (err: unknown) {
    const duration = Date.now() - start
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `markitdown-proxy ✗ throw ${request.method} ${url.pathname} ${duration}ms target=${target}: ${message}`,
    )
    return new Response(
      JSON.stringify({ error: 'markitdown upstream unavailable', detail: message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

function normalizeSub(sub: string): string {
  // Starlette Mount 307: /mcp → /mcp/、/sse → /sse/
  return sub === '/mcp' || sub === '/sse' ? `${sub}/` : sub
}

export function matchesMarkitdownPath(pathname: string): boolean {
  return pathname === SUBPATH_PREFIX || pathname.startsWith(`${SUBPATH_PREFIX}/`)
}
