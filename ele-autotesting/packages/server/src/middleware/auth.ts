import type { Context, Next } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import { AUTH_HEADER } from '../lib/constants.ts'

/**
 * resolveOwner — 把请求映射成一个稳定的 ownerId 字符串.
 *
 * 身份链路 (Phase B):
 *   1. 用户经 gateway 访问; gateway 统一收口鉴权 (cookie / 荣誉制 header) 后, 转发到
 *      autotesting 时注入 `X-Auth-User-Email` header.
 *   2. 本中间件读该 header 拿 email, 写入 `c.set('ownerId', 'google:<email>')`.
 *
 * 本地 dev (直连 :8787, 不经 gateway):
 *   - 缺 header → 看 `c.env.DEV_FALLBACK_EMAIL` (经 .env 注入), 否则 401.
 *
 * ownerId 前缀化 (`google:`) 是身份来源标记, 不要去掉. schema 见 migrations/0001_init.sql.
 */

export type VerifyOutcome =
  | { status: 'ok'; email: string }
  | { status: 'none' } // 无凭据 (交由 resolveOwner 走 dev 兜底 / 401)
  | { status: 'error'; message: string; code: 403 | 500 }

export interface AuthProvider {
  verify(c: Context<HonoEnv>): Promise<VerifyOutcome>
}

/**
 * 身份来源 seam (A4 → Phase B header 实现). gateway 收口后注入 X-Auth-User-Email;
 * 下游荣誉制信任, 读一次 email.
 */
function verifyHeader(c: Context<HonoEnv>): VerifyOutcome {
  const email = c.req.header(AUTH_HEADER)?.trim().toLowerCase()
  if (!email) return { status: 'none' }
  return { status: 'ok', email }
}

export function getAuthProvider(): AuthProvider {
  return { verify: (c) => Promise.resolve(verifyHeader(c)) }
}

export async function resolveOwner(c: Context<HonoEnv>, next: Next) {
  const outcome = await getAuthProvider().verify(c)

  if (outcome.status === 'ok') {
    c.set('ownerId', `google:${outcome.email}`)
    return next()
  }
  if (outcome.status === 'error') {
    return c.json({ error: outcome.message }, outcome.code)
  }

  // outcome.status === 'none': 无凭据. 本地 dev 兜底, 否则 401.
  const devEmail = c.env.DEV_FALLBACK_EMAIL?.trim().toLowerCase()
  if (devEmail) {
    c.set('ownerId', `google:${devEmail}`)
    return next()
  }

  return c.json({ error: 'missing identity header' }, 401)
}
