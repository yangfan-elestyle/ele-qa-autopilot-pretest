import { Container } from '@cloudflare/containers'
import { app } from './app.ts'
import { handleMarkitdownProxy, matchesMarkitdownPath } from './routes/markitdownProxy.ts'
import type { Env } from './types/env.ts'

export class MarkitdownContainer extends Container {
  defaultPort = 8080
  sleepAfter = '10m'
  enableInternet = true
}

/**
 * Worker 入口。
 *
 * 静态资源由 Workers Static Assets binding 直接服务 (wrangler.jsonc `[assets]`)，
 * `run_worker_first` 已经显式列出所有 API 路径前缀，未列出的请求会被
 * Cloudflare 优先转给 ASSETS，未命中则触发 `not_found_handling = "single-page-application"`
 * 自动返回 index.html，无需在 Worker 内部手动 fallback。
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (matchesMarkitdownPath(url.pathname)) {
      return handleMarkitdownProxy(request, env)
    }

    return app.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<Env>
