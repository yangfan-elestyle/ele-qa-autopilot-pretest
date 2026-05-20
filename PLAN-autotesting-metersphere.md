# autotesting ⇄ MeterSphere 数据联动面板 (P1)

> [PLAN.md](./PLAN.md) §M1 第一阶段切片. **只做两 tab 用例展示**: 左 mock AutoTest 自有用例, 右 MeterSphere 拉取. 暂不做回写 / 选择推送 / 同步.

## 1. 范围

✅ 本期:

- autotesting 顶栏新增"联动"按钮 → 弹出 `DataLinkagePanel` (modal).
- 面板含两 tab:
  1. **AutoTest 用例** — mock JSON 用例列表 + 表格渲染.
  2. **MeterSphere 数据** — AK/SK 输入 + 组织 / 项目 / 模块 选择 + 用例表.
- Worker 经 VPC service `METERSPHERE` 反代到 `qa.elepay.link`, 完成 AES-CBC 签名鉴权.
- 本地 dev + 生产 deploy 双链路打通.

❌ 本期不做:

- AutoTest 用例 → MS 写回 (upsert 用例).
- MS → 推 autopilot ingest.
- harness 任务生成.
- AK/SK 持久化与加密 at rest (输入仅 session 内, 关 panel 即丢; **未来阶段** 走 [PLAN-vpc.md §5](./PLAN-vpc.md) 的 D1 KV owner 隔离).

## 2. 端到端

```
浏览器 Vue UI
  │  ① 用户输入 AK/SK (临时 sessionStorage / Pinia, 不入 D1)
  │  ② 选 organization → project → module
  │  ③ 拉用例
  ▼ HTTPS gateway (/autotest/api/ms/*)
ele-autotesting Worker
  │  ④ /api/ms/{projects|modules|cases}
  │  ⑤ 读 header X-MS-AK / X-MS-SK, AES-CBC 签名生成 (accessKey, signature)
  ▼ env.METERSPHERE.fetch('https://backend/{ms-path}')
VPC service metersphere-backend (019e45a0-...)
  ▼
cloudflared (ele-fly, tunnel ele-server)
  ▼
qa.elepay.link:443 / MeterSphere REST API
```

## 3. MeterSphere API 选型

依据 metersphere/metersphere @ `56069df` 源码 (2026-05 检索).

<!-- prettier-ignore -->
| 调用 | Method + Path | Body / Query | 返回字段 (按需用) |
|---|---|---|---|
| 当前用户组织 | `GET /user/key/info` 或 `GET /organization/list/options` | — | `id, name` (待 dev 验证) |
| 项目列表 | `POST /organization/project/page` | `{organizationId, current:1, pageSize:50}` | `list[].id, name, organizationId` |
| 模块树 | `GET /functional/case/module/tree/{projectId}` | — | 递归 `BaseTreeNode[]` (`id, name, parentId, children`) |
| 用例分页 | `POST /functional/case/page` | `{projectId, moduleIds:[mid], current:1, pageSize:50}` | `list[].id, num, name, caseEditType, tags, createTime, createUserName` |

**注意**: `/functional/case/page` 不返回 steps; 本期表格仅展示概览, 不读详情. 未来回写时再调 `GET /functional/case/detail/{id}`.

## 4. AK/SK 签名

MeterSphere v3 是 **非标 HMAC**, 用 **AES-CBC 加密** 签名字符串.

- **header**: `accessKey: <AK>` + `signature: base64(ciphertext)`
- **签名字符串**: `${AK}|${uuid}|${Date.now()}`
- **加密**: `AES/CBC/PKCS7Padding`, key = `utf8(SK)` (16B → AES-128), iv = `utf8(AK)` (16B)
- **时效**: 服务端校验 `|now - ts| < 30min`

`.env` 里 `# qa.elepay.link / AK=a8ULBWtHrdWhQN8v (16B) / SK=4eFMyzMJcqYhbNOt (16B)`, AK 16B 满足 AES-CBC iv, SK 16B 满足 AES-128 key, 直接可用. **不写入 wrangler secret**, 只供本地 dev 手动复制到 UI form 测试.

WebCrypto 实现:

```ts
async function buildSignHeaders(ak: string, sk: string) {
  const sign = `${ak}|${crypto.randomUUID()}|${Date.now()}`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(sk), { name: 'AES-CBC' }, false, ['encrypt'])
  const ct = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: enc.encode(ak) }, key, enc.encode(sign))
  return { accessKey: ak, signature: btoa(String.fromCharCode(...new Uint8Array(ct))) }
}
```

## 5. Worker 路由 (`packages/server`)

`/api/ms/*` 全部经 `resolveOwner` (CF Access JWT) + 透传 AK/SK header:

<!-- prettier-ignore -->
| Endpoint | 用途 | 入参 | 备注 |
|---|---|---|---|
| `GET /api/ms/_smoke` | 链路烟雾 | — | 直接 `env.METERSPHERE.fetch('https://backend/')`, 期望非 502 |
| `POST /api/ms/orgs` | 组织 (可选, 看 MS 返回结构再定) | — | 先用 `/user/key/info` 探 |
| `POST /api/ms/projects` | 项目分页 | `{organizationId}` 或空 | 调 `/organization/project/page` |
| `GET /api/ms/modules` | 模块树 | `?projectId=` | 调 `/functional/case/module/tree/{projectId}` |
| `POST /api/ms/cases` | 用例分页 | `{projectId, moduleIds, current, pageSize}` | 调 `/functional/case/page` |

请求约定:

- 浏览器 → Worker: `X-MS-AK` / `X-MS-SK` header (不放 body, 避免被 langfuse 之类日志命中).
- Worker → MS: 改写为 `accessKey` / `signature`, 透传 body / query.
- 缺 AK/SK: 返回 `400 { error: "missing X-MS-AK / X-MS-SK" }`.
- MS 非 2xx: 透传 status + `{ error, upstream }`.

## 6. wrangler 接入

`packages/server/wrangler.jsonc` 增:

```jsonc
"vpc_services": [
  { "binding": "METERSPHERE", "service_id": "019e45a0-58be-7323-b61d-72d7a2ed27e6", "remote": true }
],
"assets": {
  "run_worker_first": ["…既有…", "/api/ms/*"]
}
```

类型: `pnpm -F @prompt-optimizer/server typegen`.

## 7. UI / Web

新增 `packages/ui/src/components/`:

<!-- prettier-ignore -->
| 组件 | 责任 |
|---|---|
| `DataLinkagePanel.vue` | Modal 容器, 双 tab 切换 (autotest / metersphere), 状态隔离 |
| `AutotestCasesPanel.vue` | mock 用例数组 → 表格 (复用现有 ds 风格 class) |
| `MeterSphereDataPanel.vue` | AK/SK form + project Select + module Tree + 用例 Table; AK/SK 仅 reactive ref, 不 persist |

`packages/web/src/App.vue`:

- actions slot 加 `ActionButtonUI` "联动" → `showDataLinkage = true`.
- 顶层 `<DataLinkagePanelUI :show="showDataLinkage" @close="showDataLinkage = false" />`.

Mock 数据放 `packages/ui/src/components/_mock/autotest-cases.ts`, 6-10 条样例, 字段贴近 MS 用例: `{id, num, name, module, priority, steps[], expected}`.

## 8. 实施步骤 (jjplan 内)

1. server wrangler.jsonc + typegen.
2. `src/lib/metersphere/sign.ts` (AES-CBC, 单元测试可选).
3. `src/routes/metersphere.ts` (5 路由).
4. `app.ts` 挂载.
5. `AutotestCasesPanel.vue` + mock.
6. `MeterSphereDataPanel.vue` (先 projects, 再 modules, 再 cases).
7. `DataLinkagePanel.vue` 容器 + tab.
8. `App.vue` 入口.
9. `pnpm run dev` 手测两 tab.
10. typegen + dry-run + smoke.
11. 同步四 manifest 版本 + CHANGELOG → release commit → tag → push → 等四 workflow.

## 9. 验收

本地:

```bash
cd ele-autotesting && pnpm run dev
# 浏览器开 http://127.0.0.1:18181, 顶栏点 "联动":
# - 左 tab 看到 mock 表格.
# - 右 tab 输入 .env 里的 AK/SK, 选 organization/project/module, 看到真实 MS 用例分页.
```

线上 (gateway):

```bash
ENDPOINT=https://qa.<account>.workers.dev pnpm -F @prompt-optimizer/server smoke
curl -fsS "$ENDPOINT/autotest/api/ms/_smoke"   # 非 502 即链路通
```

## 10. 风险 / 未决

- **MS 用例 schema 字段名细节**: 以 dev 期实拉为准, 可能与源码 DTO 有差异.
- **organizationId 取值**: 若 `/user/key/info` 不返回, 改用 `GET /organization/list/options/user`; dev 期确认.
- **AK/SK 不入 D1**: 本期 session-only; 关 modal 后丢失. 用户每次开 panel 重输. M1 阶段再做 D1 KV 持久化 + 加密策略.
- **CORS**: `/api/ms/*` 与 `/api/sync/*` 同源 (经 gateway), 不涉及.
- **AES key 长度**: 仅支持 AK/SK 都是 16B (AES-128) 的情况; 若 MS 后续生成 24/32B SK, 需按长度切 AES-192/256, 加保护性校验.
