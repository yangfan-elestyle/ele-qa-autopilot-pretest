import type { Context, Next } from 'hono'
import type { HonoEnv } from '../types/env.ts'

/**
 * resolveOwner — 把请求映射成一个稳定的 ownerId 字符串。
 *
 * V1 (当前): 从 X-Device-Id 头读 UUID, 返回 'device:<uuid>'.
 *           前端首次启动用 crypto.randomUUID() 生成并持久化到 localStorage.
 *
 * V2 (Google 登录上线后): 打开下面 verifyGoogleIdToken 分支, 返回 'google:<sub>'.
 *           届时若同请求同时带 X-Device-Id, 可以触发一次性数据迁移
 *           (UPDATE storage SET owner_id='google:<sub>' WHERE owner_id='device:<uuid>')
 *           入口在 /api/migrate-owner.
 *
 * 注意: owner_id 前缀化是为了区分身份来源, 不要去掉.
 */
export async function resolveOwner(c: Context<HonoEnv>, next: Next) {
  // V2 留口子: 优先尝试 Google id_token
  // const auth = c.req.header('Authorization')
  // if (auth?.startsWith('Bearer ')) {
  //   try {
  //     const sub = await verifyGoogleIdToken(auth.slice(7), c.env.GOOGLE_CLIENT_ID)
  //     c.set('ownerId', `google:${sub}`)
  //     return next()
  //   } catch (e) {
  //     return c.json({ error: 'invalid google id_token' }, 401)
  //   }
  // }

  const deviceId = c.req.header('X-Device-Id')?.trim()
  if (!deviceId) {
    return c.json({ error: 'missing X-Device-Id header' }, 401)
  }

  // 简单合法性校验, 避免 SQL 注入或路径穿越
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(deviceId)) {
    return c.json({ error: 'invalid X-Device-Id format' }, 400)
  }

  c.set('ownerId', `device:${deviceId}`)
  await next()
}
