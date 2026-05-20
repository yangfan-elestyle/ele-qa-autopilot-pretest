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
 * 本地 dev (wrangler dev :8787, 不经 gateway / Access):
 *   - 缺 cf-access-jwt-assertion → 看 `c.env.DEV_FALLBACK_EMAIL` (经 `ele-autotesting/.env` +
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

export async function resolveOwner(c: Context<HonoEnv>, next: Next) {
  const token = c.req.header('cf-access-jwt-assertion')

  if (token) {
    if (!c.env.TEAM_DOMAIN || !c.env.POLICY_AUD) {
      console.error('auth: TEAM_DOMAIN / POLICY_AUD 未配置, 无法校验 CF Access JWT')
      return c.json({ error: 'cf access misconfigured' }, 500)
    }
    try {
      const { payload }: { payload: JWTPayload } = await jwtVerify(
        token,
        getJwks(c.env.TEAM_DOMAIN),
        { issuer: c.env.TEAM_DOMAIN, audience: c.env.POLICY_AUD },
      )
      const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
      if (!email) {
        return c.json({ error: 'cf access token missing email claim' }, 403)
      }
      c.set('ownerId', `google:${email}`)
      return next()
    } catch (e: any) {
      console.error('auth: cf access jwt verify failed:', e?.message || e)
      return c.json({ error: 'invalid cf access token' }, 403)
    }
  }

  const devEmail = c.env.DEV_FALLBACK_EMAIL?.trim().toLowerCase()
  if (devEmail) {
    c.set('ownerId', `google:${devEmail}`)
    return next()
  }

  return c.json({ error: 'missing cf access token' }, 401)
}
