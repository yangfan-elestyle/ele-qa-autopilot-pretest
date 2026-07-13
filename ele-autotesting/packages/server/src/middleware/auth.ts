import type { Context, Next } from 'hono'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import type { HonoEnv } from '../types/env.ts'

/**
 * resolveOwner — 把请求映射成一个稳定的 ownerId 字符串.
 *
 * 身份链路:
 *   1. 用户经 gateway (`qa.<sub>.workers.dev`) 访问, Cloudflare Access 在边缘校验
 *      Google Workspace SSO cookie 后注入 `cf-access-jwt-assertion` header.
 *   2. gateway 经 service binding 转发到 autotesting, header 原样透传.
 *   3. 本中间件用 jose 远程 JWKS 二次校验 (深度防御), 拿 email 后写入 `c.set('ownerId', 'google:<email>')`.
 *
 * Token 来源 (按顺序, 与 ele-autopilot/lib/access-auth.ts 同构):
 *   1. `cf-access-jwt-assertion` header — Allow App 路径下由 CF Access 注入
 *   2. `CF_Authorization` cookie — 当前所有挂 resolveOwner 的路径都走 Allow App, header 必有;
 *      cookie 回退是为与 autopilot 参考实现对齐, 同时为未来可能新增的 Bypass 路径预留兜底.
 *
 * 本地 dev (wrangler dev :8787, 不经 gateway / Access):
 *   - 缺 token → 看 `c.env.DEV_FALLBACK_EMAIL` (经 `ele-autotesting/.env` +
 *     `wrangler dev --env-file ../../.env` 注入)
 *   - 生产 wrangler.jsonc 不设 DEV_FALLBACK_EMAIL, 缺 token 必 401, 保留兜底拦截.
 *
 * ownerId 前缀化 (`google:` / `device:`) 是身份来源标记, 不要去掉. D1 schema 见
 * `packages/server/migrations/0001_init.sql`.
 */

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks(teamDomain: string) {
  if (!cachedJwks) {
    cachedJwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`))
  }
  return cachedJwks
}

function extractCookie(c: Context<HonoEnv>, name: string): string | null {
  const cookieHeader = c.req.header('cookie')
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const k = part.slice(0, eq).trim()
    if (k === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim())
      } catch {
        return part.slice(eq + 1).trim()
      }
    }
  }
  return null
}

/**
 * 迁移前置 (A4): 身份来源 seam.
 *
 * CF 实现 = CF Access JWT (jose 校验). 迁移日换成读 gateway 注入的 `X-Auth-User-Email`
 * header (统一收口后下游荣誉制信任). verify 返回三态, resolveOwner 保持 dev 兜底 +
 * ownerId 前缀 + 401 策略不变. 迁移日只换 getAuthProvider 返回实现.
 */
export type VerifyOutcome =
  | { status: 'ok'; email: string }
  | { status: 'none' } // 无凭据 (交由 resolveOwner 走 dev 兜底 / 401)
  | { status: 'error'; message: string; code: 403 | 500 }

export interface AuthProvider {
  verify(c: Context<HonoEnv>): Promise<VerifyOutcome>
}

async function verifyCfAccess(c: Context<HonoEnv>): Promise<VerifyOutcome> {
  const token = c.req.header('cf-access-jwt-assertion') ?? extractCookie(c, 'CF_Authorization')
  if (!token) return { status: 'none' }

  if (!c.env.TEAM_DOMAIN || !c.env.POLICY_AUD) {
    console.error('auth: TEAM_DOMAIN / POLICY_AUD 未配置, 无法校验 CF Access JWT')
    return { status: 'error', message: 'cf access misconfigured', code: 500 }
  }
  try {
    const { payload }: { payload: JWTPayload } = await jwtVerify(
      token,
      getJwks(c.env.TEAM_DOMAIN),
      { issuer: c.env.TEAM_DOMAIN, audience: c.env.POLICY_AUD },
    )
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
    if (!email) {
      return { status: 'error', message: 'cf access token missing email claim', code: 403 }
    }
    return { status: 'ok', email }
  } catch (e: any) {
    console.error('auth: cf access jwt verify failed:', e?.message || e)
    return { status: 'error', message: 'invalid cf access token', code: 403 }
  }
}

export function getAuthProvider(): AuthProvider {
  return { verify: verifyCfAccess }
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

  return c.json({ error: 'missing cf access token' }, 401)
}
