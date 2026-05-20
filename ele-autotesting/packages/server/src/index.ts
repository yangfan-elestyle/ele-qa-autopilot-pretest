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
 * Worker 入口. 经 gateway service binding 进来的请求绕过平台层 ASSETS, 所以 Hono 未命中
 * 时手动 fallback 到 `env.ASSETS.fetch` 让 binding 处理 SPA + 静态文件.
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
