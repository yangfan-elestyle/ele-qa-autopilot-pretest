import { Hono, Context } from 'hono'
import type { HonoEnv } from '../types/env.ts'
import { buildMsSignedHeaders } from '../lib/metersphere/sign.ts'
import { readMeterSphereConfig } from './integrationsMetersphere.ts'
import { upstreamFetch } from '../lib/upstream.ts'

/**
 * /api/ms — MeterSphere 反向代理.
 *
 * 链路: 浏览器 -> gateway -> autotesting server -> METERSPHERE_URL 内网直连 https://qa.elepay.link
 *
 * AK/SK 由 server 按 ownerId 从 libSQL (集成中心 MeterSphere Tab) 读出后做 AES-CBC 签名,
 * 浏览器侧不持有明文; 旧 X-MS-AK / X-MS-SK header 入参已废弃.
 *
 * 路由:
 *   GET  /api/ms/_smoke                  链路烟雾, 不需 AK/SK
 *   POST /api/ms/projects                项目分页
 *   GET  /api/ms/modules                 功能用例模块树
 *   POST /api/ms/cases                   功能用例分页
 *   GET  /api/ms/case/:id                单条用例详情 (prerequisite/steps/expectedResult/description)
 *   GET  /api/ms/default-template/:pid   项目默认模板 (从 data.id 取 templateId)
 *   POST /api/ms/module/add              新建模块 ({projectId, parentId='NONE', name})
 *   POST /api/ms/case/add                新建用例 (multipart, server 内封 FormData)
 */

type MsRouteEnv = {
  Bindings: HonoEnv['Bindings']
  Variables: HonoEnv['Variables'] & { ownerId: string }
}

const router = new Hono<MsRouteEnv>()

// MeterSphere 寻址 (METERSPHERE_URL 内网直连) 收口到 lib/upstream.ts;
// 这里只组 path + query, 由 upstreamFetch 决定 base.

interface MsCallInit {
  method: string
  path: string
  ak: string
  sk: string
  body?: unknown
  query?: Record<string, string | undefined>
}

async function callMeterSphere(
  c: Context<MsRouteEnv>,
  init: MsCallInit,
): Promise<Response> {
  const { accessKey, signature } = await buildMsSignedHeaders(init.ak, init.sk)

  let path = init.path
  if (init.query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
    }
    const q = qs.toString()
    if (q) path += `?${q}`
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

  const upstream = await upstreamFetch(c.env, 'METERSPHERE', path, { method: init.method, headers, body })
  // MeterSphere v3 正常返 HTTP 200 + body { code: 100200 (MsHttpResultCode.SUCCESS), data, message };
  // 错误时 code 为 1004xx / 1005xx, 后三位 == HTTP status. 本 server 不校验 code,
  // 直接透传 status + body 给前端. 透传时去掉 set-cookie 等敏感 header, 留 content-type 即可.
  const respBody = await upstream.text()
  return new Response(respBody, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

/**
 * 解析当前请求的 AK/SK: 按 ownerId 从 libSQL 集成中心配置读. 未配置时返 412 引导前端
 * 提示用户去「集成中心 → MeterSphere」填写, 与 figma-parse 同口径; 前端不再透传 header.
 */
async function getAkSk(c: Context<MsRouteEnv>): Promise<{ ak: string; sk: string } | Response> {
  const cfg = await readMeterSphereConfig(c)
  if (!cfg) {
    return c.json(
      { error: 'MeterSphere 集成未配置, 请到「集成中心 → MeterSphere」填写 AK / SK' },
      412,
    )
  }
  return { ak: cfg.ak, sk: cfg.sk }
}

router.get('/_smoke', async (c: Context<MsRouteEnv>) => {
  // 不签名, 仅探链路. MeterSphere 根目录通常返登录页 200 或 401, 任一非 502 即证明内网直连通.
  try {
    const upstream = await upstreamFetch(c.env, 'METERSPHERE', '/', { method: 'GET' })
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

/**
 * `/api/ms/projects` — 列出 AK 用户可见的项目, 前端 **无需** 传 organizationId.
 *
 * MS v3 的 `/organization/project/page` 必须带 organizationId, 但私有部署 + 单组织
 * (即本部署形态) 下用户感知不到 "组织" 概念. 服务端先调
 * `/system/user/get/organization` 拿当前 AK 用户可见的组织 list, 取第一个 id,
 * 再走 `/organization/project/page` 翻页. 整条链路对 UI 透明.
 */
router.post('/projects', async (c: Context<MsRouteEnv>) => {
  const ak = await getAkSk(c)
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
 * 调 MeterSphere `/system/user/get/organization` 拿当前 AK 用户可见的组织 list,
 * 取第一个 id. 本期私有部署单组织 (默认 `100001`), 后续多组织部署再加 UI 切换.
 *
 * (尝试过 `/is-login` 自动发现 — MS v3 `ApiKeyFilter` 不拦截该路径, 返回
 * `{code:100401}`; 而 `/system/user/get/organization` 在 AK/SK 模式下 200, 内含
 * `id, name` 足够定位组织.)
 */
async function discoverOrganizationId(
  c: Context<MsRouteEnv>,
  ak: string,
  sk: string,
): Promise<string | null> {
  const { accessKey, signature } = await buildMsSignedHeaders(ak, sk)
  const resp = await upstreamFetch(c.env, 'METERSPHERE', '/system/user/get/organization', {
    method: 'GET',
    headers: { accept: 'application/json', accessKey, signature },
  })
  if (!resp.ok) {
    throw new Error(`/system/user/get/organization HTTP ${resp.status}`)
  }
  const json: any = await resp.json().catch(() => ({}))
  const list: any[] = Array.isArray(json?.data) ? json.data : []
  for (const item of list) {
    if (item?.id && typeof item.id === 'string') return item.id
  }
  return null
}

router.get('/modules', async (c: Context<MsRouteEnv>) => {
  const ak = await getAkSk(c)
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

router.post('/cases', async (c: Context<MsRouteEnv>) => {
  const ak = await getAkSk(c)
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
  const pageSize = Math.min(500, Math.max(1, Number(body?.pageSize ?? 100)))
  // keyword: 上游 FunctionalCasePageRequest 支持的模糊搜索字段 (name / num / id / tag),
  // 仅在非空时透传, 空串等同未传, 上游兼容.
  const keyword = typeof body?.keyword === 'string' ? body.keyword.trim() : ''
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
        ...(keyword ? { keyword } : {}),
      },
    })
  } catch (e: any) {
    console.error('ms cases error:', e?.message || e)
    return c.json({ error: String(e?.message || e) }, 500)
  }
})

router.get('/case/:id', async (c: Context<MsRouteEnv>) => {
  const ak = await getAkSk(c)
  if (ak instanceof Response) return ak
  const id = (c.req.param('id') ?? '').trim()
  if (!id) return c.json({ error: 'id required' }, 400)
  try {
    return callMeterSphere(c, {
      method: 'GET',
      path: `/functional/case/detail/${encodeURIComponent(id)}`,
      ak: ak.ak,
      sk: ak.sk,
    })
  } catch (e: any) {
    console.error('ms case detail error:', e?.message || e)
    return c.json({ error: String(e?.message || e) }, 500)
  }
})

router.get('/default-template/:projectId', async (c: Context<MsRouteEnv>) => {
  const ak = await getAkSk(c)
  if (ak instanceof Response) return ak
  const projectId = (c.req.param('projectId') ?? '').trim()
  if (!projectId) return c.json({ error: 'projectId required' }, 400)
  try {
    return callMeterSphere(c, {
      method: 'GET',
      path: `/functional/case/default/template/field/${encodeURIComponent(projectId)}`,
      ak: ak.ak,
      sk: ak.sk,
    })
  } catch (e: any) {
    console.error('ms default-template error:', e?.message || e)
    return c.json({ error: String(e?.message || e) }, 500)
  }
})

router.post('/module/add', async (c: Context<MsRouteEnv>) => {
  const ak = await getAkSk(c)
  if (ak instanceof Response) return ak
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'invalid json body' }, 400) }
  const projectId = String(body?.projectId ?? '').trim()
  const name = String(body?.name ?? '').trim()
  const parentId = String(body?.parentId ?? 'NONE').trim() || 'NONE'
  if (!projectId || !name) return c.json({ error: 'projectId/name required' }, 400)
  try {
    return callMeterSphere(c, {
      method: 'POST',
      path: '/functional/case/module/add',
      ak: ak.ak,
      sk: ak.sk,
      body: { projectId, parentId, name },
    })
  } catch (e: any) {
    console.error('ms module/add error:', e?.message || e)
    return c.json({ error: String(e?.message || e) }, 500)
  }
})

/**
 * POST /api/ms/case/add — 新建用例.
 *
 * 上游 `POST /functional/case/add` 是 `multipart/form-data` (`request` part = JSON 串).
 * server 接 application/json (body 即上游 FunctionalCaseAddRequest 形状),
 * 内部构造 FormData 转发, runtime 自动生成 boundary.
 *
 * 不接受 / 不转发附件 (files / caseDetailFileIds), 后续需要再扩.
 */
router.post('/case/add', async (c: Context<MsRouteEnv>) => {
  const ak = await getAkSk(c)
  if (ak instanceof Response) return ak
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'invalid json body' }, 400) }
  const required = ['projectId', 'templateId', 'name', 'moduleId', 'caseEditType'] as const
  for (const k of required) {
    if (!body?.[k] || typeof body[k] !== 'string') {
      return c.json({ error: `${k} required (string)` }, 400)
    }
  }
  try {
    const { accessKey, signature } = await buildMsSignedHeaders(ak.ak, ak.sk)
    const fd = new FormData()
    fd.append(
      'request',
      new Blob([JSON.stringify(body)], { type: 'application/json' }),
      'request.json',
    )
    const upstream = await upstreamFetch(c.env, 'METERSPHERE', '/functional/case/add', {
      method: 'POST',
      headers: { accept: 'application/json', accessKey, signature },
      body: fd,
    })
    const respBody = await upstream.text()
    return new Response(respBody, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    })
  } catch (e: any) {
    console.error('ms case/add error:', e?.message || e)
    return c.json({ error: String(e?.message || e) }, 500)
  }
})

export default router
