import type { Env } from '../types/env.ts'

/**
 * 迁移前置 (A1): 下游寻址 seam.
 *
 * `<NAME>_URL` 非空 → 内网 Docker HTTP 直连 (global fetch);
 * 空 / 未设 (CF 默认) → 原 service / VPC binding.fetch. 迁移日只设 env, 调用方不改.
 *
 * `path` 必须以 `/` 开头 (可含 query). CF 模式下拼到 BINDING_BASE 后由 binding 转发.
 */

export type UpstreamName = 'AUTOPILOT' | 'METERSPHERE' | 'AGENTIC_LOOP'

// CF binding 模式下 fetch URL 的 host:
// - AUTOPILOT / AGENTIC_LOOP: 纯 placeholder, service / VPC binding 忽略 host, 仅按 binding 路由.
// - METERSPHERE: 必须是真实域名 —— VPC binding 不改写 host, 它同时是 TLS SNI 与 Host header,
//   写错会让 ele-fly cloudflared / nginx 抛 TLSV1_ALERT_UNRECOGNIZED_NAME.
const BINDING_BASE: Record<UpstreamName, string> = {
  AUTOPILOT: 'http://autopilot',
  METERSPHERE: 'https://qa.elepay.link',
  AGENTIC_LOOP: 'http://backend',
}

function dockerBase(env: Env, name: UpstreamName): string | undefined {
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
  const base = dockerBase(env, name)
  if (base) {
    return fetch(base + path, init)
  }
  return env[name].fetch(BINDING_BASE[name] + path, init)
}
