import type { Env } from '../types/env.ts'

/**
 * 下游寻址 (内网 HTTP).
 *
 * `<NAME>_URL` (含 scheme) 直连 global fetch.
 *   - AUTOPILOT_URL / AGENTIC_LOOP_URL: compose service (如 http://autopilot:8080).
 *   - METERSPHERE_URL: 内网可达域名 https://bi.elepay.link (出站上游, 可 https).
 *
 * `path` 必须以 `/` 开头 (可含 query).
 */

export type UpstreamName = 'AUTOPILOT' | 'METERSPHERE' | 'AGENTIC_LOOP'

function baseUrl(env: Env, name: UpstreamName): string | undefined {
  const raw =
    name === 'AUTOPILOT'
      ? env.AUTOPILOT_URL
      : name === 'METERSPHERE'
        ? env.METERSPHERE_URL
        : env.AGENTIC_LOOP_URL
  const trimmed = raw?.trim()
  return trimmed ? trimmed.replace(/\/+$/, '') : undefined
}

export function upstreamFetch(
  env: Env,
  name: UpstreamName,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = baseUrl(env, name)
  if (!base) {
    return Promise.reject(new Error(`upstream ${name}_URL 未配置`))
  }
  return fetch(base + path, init)
}
