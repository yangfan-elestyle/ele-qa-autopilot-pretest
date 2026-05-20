# ele-autotesting

## Workspace

- `packages/core`: prompt / LLM / 代理 URL 等核心逻辑, 构建为 CJS + ESM + d.ts.
- `packages/ui`: Vue 组件与组合式逻辑, 供 web 包使用.
- `packages/web`: Vite SPA; 生产 `base=/autotest/`, dev `base=/`.
- `packages/server`: Hono Worker, D1, Static Assets, Container binding.
- `containers/markitdown`: Cloudflare Container 镜像.

## Cloudflare

- `packages/server/wrangler.jsonc`: `name=ele-autotesting`, `workers_dev=false`, D1 binding `DB`, assets binding `ASSETS`, DO/Container binding `MARKITDOWN`.
- 公开入口只能经 gateway `/autotest/*`; 不暴露 `*.workers.dev`.
- `assets.run_worker_first` 必须覆盖所有 API / proxy / parse 路径; 否则请求会被 Static Assets 抢先处理.
- service binding 调用会绕过平台层 Static Assets fallback; Worker 内 Hono 404 末尾必须 `env.ASSETS.fetch(request)` 托底.
- `MARKITDOWN_DEV_URL`: 本地 OrbStack 兼容兜底, 见 `packages/server/src/types/env.ts`.

## API / Auth

- 身份链路: gateway 套 Cloudflare Access (Google Workspace SSO) → 边缘注入 `cf-access-jwt-assertion` → service binding 透传 → `packages/server/src/middleware/auth.ts` 用 `jose` + 远程 JWKS 校验 → `ownerId=google:<email>` 写入 `c.var.ownerId`.
- 校验依赖 `vars.TEAM_DOMAIN` / `vars.POLICY_AUD` (与 gateway 锁同值); 改 AUD 同步 CF 后台.
- 缺 token: 看 `env.DEV_FALLBACK_EMAIL` (仅本地经 `.env` 注入, 生产 wrangler.jsonc 不设); 都缺则 401. 校验失败 403.
- 生产路径前缀是 `/autotest`; web `BASE_URL`, UI `apiBase`, core `setProxyBasePath()` 必须保持同步.
- LLM proxy 路径 `/stream-proxy` / `/http-proxy` 也必须带 `/autotest` 前缀, 否则 gateway 会转给 AUTOPILOT.
- 历史 `device:shared-owner-v1` D1 数据已弃用 (本就明示只用于端到端验证); 用户切 google owner 后从空开始, 前端 `migrationFlagKey` 按 `cf-access` 占位隔离, 自然重走一次 Dexie→remote 迁移.

## 命令

只用 pnpm (`engines.node >= 24`); 不用 npm / yarn.

子包测试:

```bash
pnpm -F @prompt-optimizer/core test
pnpm -F @prompt-optimizer/ui test
pnpm -F @prompt-optimizer/web test
```

## 迁移

- D1 schema 位于 `packages/server/migrations/*.sql`; 新 migration 按 `0002_xxx.sql` 递增.
- CI 在 deploy 前跑 `wrangler d1 migrations apply DB --remote`, 幂等.
