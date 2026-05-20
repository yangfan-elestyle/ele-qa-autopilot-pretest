import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import { buildMsSignedHeaders } from '../lib/metersphere/sign.ts'

/**
 * /api/ms — MeterSphere 反向代理.
 *
 * 链路: 浏览器 -> gateway -> autotesting Worker -> env.METERSPHERE (VPC) ->
 *       tunnel `ele-server` -> ele-fly cloudflared -> qa.elepay.link
 *
 * AK/SK 从请求头 X-MS-AK / X-MS-SK 取 (浏览器侧 session-only, 不持久化, 不入 D1).
 * 本 Worker 仅 AES-CBC 签名 + 转发, 不缓存 / 不日志 AK/SK 明文.
 *
 * 本期 5 路由对应 PLAN-autotesting-metersphere.md §5:
 *   GET  /api/ms/_smoke           链路烟雾, 不需 AK/SK
 *   GET  /api/ms/orgs             当前 AK 关联用户的组织列表
 *   POST /api/ms/projects         项目分页
 *   GET  /api/ms/modules          功能用例模块树
 *   POST /api/ms/cases            功能用例分页
 */

const router = new Hono<HonoEnv>()

const BACKEND_BASE = 'https://backend' // VPC binding placeholder, 会被改写到 qa.elepay.link

interface MsCallInit {
  method: string
  path: string
  ak: string
  sk: string
  body?: unknown
  query?: Record<string, string | undefined>
}

async function callMeterSphere(
  c: Context<HonoEnv>,
  init: MsCallInit,
): Promise<Response> {
  const { accessKey, signature } = await buildMsSignedHeaders(init.ak, init.sk)

  let url = `${BACKEND_BASE}${init.path}`
  if (init.query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
    }
    const q = qs.toString()
    if (q) url += `?${q}`
  }

  const headers: Record<string, string> = {
    accept: 'application/json',
    accessKey,
    signature,
  }
  let body: BodyInit | undefined
  if (init.body !== undefined) {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(init.body)
  }

  const upstream = await c.env.METERSPHERE.fetch(url, { method: init.method, headers, body })
  // MeterSphere 正常返 200 + body { code: 0|200, data, message }.
  // 直接透传 status + body, 给前端展示能力. 透传时去掉 set-cookie 等敏感 header,
  // 留 content-type 即可.
  const respBody = await upstream.text()
  return new Response(respBody, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

function getAkSk(c: Context<HonoEnv>): { ak: string; sk: string } | Response {
  const ak = (c.req.header('x-ms-ak') ?? '').trim()
  const sk = (c.req.header('x-ms-sk') ?? '').trim()
  if (!ak || !sk) {
    return c.json({ error: 'missing X-MS-AK / X-MS-SK header' }, 400)
  }
  return { ak, sk }
}

router.get('/_smoke', async (c: Context<HonoEnv>) => {
  // 不签名, 仅探链路. MeterSphere 根目录通常返登录页 200 或 401, 任一非 502 即证明 VPC 通.
  try {
    const upstream = await c.env.METERSPHERE.fetch(`${BACKEND_BASE}/`, { method: 'GET' })
    const ct = upstream.headers.get('content-type') ?? ''
    return c.json({
      status: upstream.status,
      contentType: ct,
      ok: upstream.status < 500,
    })
  } catch (e: any) {
    console.error('ms smoke error:', e?.message || e)
    return c.json({ error: 'vpc fetch failed', detail: String(e?.message || e) }, 502)
  }
})

router.get('/orgs', async (c: Context<HonoEnv>) => {
  const ak = getAkSk(c)
  if (ak instanceof Response) return ak
  try {
    // GET /user/key/info: 返回当前 AK 对应用户基本信息 (含可访问组织); 字段以实际响应为准, 由前端解析.
    return callMeterSphere(c, { method: 'GET', path: '/user/key/info', ak: ak.ak, sk: ak.sk })
  } catch (e: any) {
    console.error('ms orgs error:', e?.message || e)
    return c.json({ error: String(e?.message || e) }, 500)
  }
})

/**
 * `/api/ms/projects` — 列出 AK 用户可见的项目, 前端 **无需** 传 organizationId.
 *
 * MS v3 的 `/organization/project/page` 必须带 organizationId, 但私有部署 + 单组织
 * (即本部署形态) 下用户感知不到 "组织" 概念. 服务端先调 `/is-login` (AK/SK 鉴权
 * 同样生效, 由 ApiKeyFilter 注入 SessionUser, `autoSwitch` 会修正过期 lastOrg),
 * 取出 `lastOrganizationId` 或退化到 `userRoleRelations[]` 第一个 organization id,
 * 再走 `/organization/project/page` 翻页. 整条链路对 UI 透明.
 */
router.post('/projects', async (c: Context<HonoEnv>) => {
  const ak = getAkSk(c)
  if (ak instanceof Response) return ak
  let body: any = {}
  try {
    body = await c.req.json()
  } catch {
    // body 可选, 不必强制 JSON.
    body = {}
  }
  const current = Number(body?.current ?? 1)
  const pageSize = Math.min(200, Math.max(1, Number(body?.pageSize ?? 50)))

  try {
    const orgId = await discoverOrganizationId(c, ak.ak, ak.sk)
    if (!orgId) {
      return c.json(
        { error: 'metersphere: unable to discover organizationId from AK (no lastOrganizationId / userRoleRelations)' },
        502,
      )
    }
    return callMeterSphere(c, {
      method: 'POST',
      path: '/organization/project/page',
      ak: ak.ak,
      sk: ak.sk,
      body: { organizationId: orgId, current, pageSize, keyword: body?.keyword ?? '' },
    })
  } catch (e: any) {
    console.error('ms projects error:', e?.message || e)
    return c.json({ error: String(e?.message || e) }, 500)
  }
})

/**
 * 调 MeterSphere `/is-login` 拿当前 AK 用户的 organization context.
 * 优先 `lastOrganizationId` (autoSwitch 已修正过期 id); 缺时回退到 `userRoleRelations`
 * 里第一个 sourceType=ORGANIZATION 的条目. 返回 null 表示彻底无法决定.
 */
async function discoverOrganizationId(
  c: Context<HonoEnv>,
  ak: string,
  sk: string,
): Promise<string | null> {
  const { accessKey, signature } = await buildMsSignedHeaders(ak, sk)
  const resp = await c.env.METERSPHERE.fetch(`${BACKEND_BASE}/is-login`, {
    method: 'GET',
    headers: { accept: 'application/json', accessKey, signature },
  })
  if (!resp.ok) {
    throw new Error(`/is-login HTTP ${resp.status}`)
  }
  const json: any = await resp.json().catch(() => ({}))
  const data = json?.data ?? json
  const lastOrg = typeof data?.lastOrganizationId === 'string' ? data.lastOrganizationId : null
  if (lastOrg) return lastOrg
  const relations: any[] = Array.isArray(data?.userRoleRelations) ? data.userRoleRelations : []
  for (const r of relations) {
    const orgId = r?.organizationId ?? (r?.type === 'ORGANIZATION' ? r?.sourceId : null)
    if (typeof orgId === 'string' && orgId) return orgId
  }
  return null
}

router.get('/modules', async (c: Context<HonoEnv>) => {
  const ak = getAkSk(c)
  if (ak instanceof Response) return ak
  const projectId = (c.req.query('projectId') ?? '').trim()
  if (!projectId) return c.json({ error: 'projectId required' }, 400)
  try {
    return callMeterSphere(c, {
      method: 'GET',
      path: `/functional/case/module/tree/${encodeURIComponent(projectId)}`,
      ak: ak.ak,
      sk: ak.sk,
    })
  } catch (e: any) {
    console.error('ms modules error:', e?.message || e)
    return c.json({ error: String(e?.message || e) }, 500)
  }
})

router.post('/cases', async (c: Context<HonoEnv>) => {
  const ak = getAkSk(c)
  if (ak instanceof Response) return ak
  let body: any = {}
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid json body' }, 400)
  }
  const projectId = body?.projectId
  if (!projectId || typeof projectId !== 'string') {
    return c.json({ error: 'projectId required (string)' }, 400)
  }
  const moduleIds = Array.isArray(body?.moduleIds) ? body.moduleIds.filter((x: any) => typeof x === 'string') : []
  const current = Number(body?.current ?? 1)
  const pageSize = Math.min(200, Math.max(1, Number(body?.pageSize ?? 50)))
  try {
    return callMeterSphere(c, {
      method: 'POST',
      path: '/functional/case/page',
      ak: ak.ak,
      sk: ak.sk,
      body: {
        projectId,
        moduleIds,
        current,
        pageSize,
        sort: body?.sort ?? { pos: 'desc' },
        excludeIds: [],
      },
    })
  } catch (e: any) {
    console.error('ms cases error:', e?.message || e)
    return c.json({ error: String(e?.message || e) }, 500)
  }
})

export default router
