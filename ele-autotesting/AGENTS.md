# ele-autotesting

## Workspace

- `packages/core`: prompt / LLM / 代理 URL 等核心逻辑, 构建为 CJS + ESM + d.ts.
- `packages/ui`: Vue 组件与组合式逻辑, 供 web 包使用.
- `packages/web`: Vite SPA; 生产 `base=/autotest/`, dev `base=/`.
- `packages/server`: Hono server (Node), libSQL, esbuild bundle. `containers/markitdown`: markitdown-mcp 镜像 (compose sidecar).

## Runtime (Node server)

- `packages/server/src/index.ts`: `@hono/node-server` 入口; 启动建 libSQL client + 跑 migrations, 注入 `env` (`types/env.ts`); markitdown → HTTP sidecar (`MARKITDOWN_URL`); Hono 404 → 静态 `web/dist` / SPA index 兜底 (`lib/static.ts`).
- server 经 esbuild bundle 到 `dist/server.mjs` (`pnpm -F @prompt-optimizer/server build`); native `@libsql/client` / `@resvg/resvg-js` external.
- 下游寻址 `lib/upstream.ts` 走 `AUTOPILOT_URL` / `METERSPHERE_URL` / `AGENTIC_LOOP_URL` (内网 HTTP).
- `svgRenderer.ts`: `@resvg/resvg-js` + 系统字体 (容器装 fonts-noto-cjk).

## API / Auth

- 身份: gateway 统一收口后注入 `X-Auth-User-Email` header → `middleware/auth.ts` 读得 email → `ownerId=google:<email>` 写 `c.var.ownerId`. 无第三方 IdP / JWT 校验.
- 缺 header: 看 `env.DEV_FALLBACK_EMAIL` (仅本地直连 dev 用, 生产不设); 缺则 401.
- 生产路径前缀 `/autotest` (gateway 转发时剥掉); web `BASE_URL`, UI `apiBase`, core `setProxyBasePath()` 必须同步. LLM proxy `/stream-proxy` / `/http-proxy` 也须带 `/autotest` 前缀, 否则 gateway 转给 AUTOPILOT.
- 前端 `migrationFlagKey` 用固定占位 `cf-access` (勿改值, 改了会触发存量用户本地→云端重同步).

## 命令

只用 pnpm (`engines.node >= 24`); 不用 npm / yarn.

```bash
pnpm run build       # core + ui + web + server bundle
pnpm run typecheck   # server tsc --noEmit
pnpm -F @prompt-optimizer/{core,ui,web} test
```

## Schema

- schema 在 `packages/server/migrations/*.sql` (纯 SQLite 方言); 新 migration 按 `0003_xxx.sql` 递增. server 首启 `lib/migrate.ts` 幂等 apply, 无需 CI. `sync.ts` /batch 依赖 libSQL `batch('write')` 原子性.
