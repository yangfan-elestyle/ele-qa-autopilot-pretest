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
 * 静态资源由 Workers Static Assets binding 服务，平台层默认在 worker 之前先查 ASSETS
 * (`run_worker_first` 列表内的 API 路径才优先走 Worker)。但当请求经 gateway (`qa`) Worker
 * 通过 service binding 转发进来时，请求直接进入本 fetch handler，**绕过**平台层 ASSETS 处理，
 * 所以需要在 Worker 末尾对 Hono 未命中的请求手动 fallback 到 `env.ASSETS.fetch(request)`，
 * 让 ASSETS binding 处理静态文件 + SPA fallback (`not_found_handling = "single-page-application"`)。
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (matchesMarkitdownPath(url.pathname)) {
      return handleMarkitdownProxy(request, env)
    }

    const resp = await app.fetch(request, env, ctx)
    return resp.status === 404 ? env.ASSETS.fetch(request) : resp
  },
} satisfies ExportedHandler<Env>
