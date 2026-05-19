# ele-autotesting

AI 测试用例生成工具。pnpm 10 monorepo, Vue 3 前端, Hono Worker, Cloudflare D1 + Static Assets + Container (`MarkitdownContainer`).

版本与发布遵从根 `AGENTS.md` / `deploy.md`: 根 `package.json#version` 必须等于 git tag 去 `v`; 发布记录写 `CHANGELOGS`.

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
- 本地 OrbStack 与 wrangler container sidecar 不兼容时可设 `MARKITDOWN_DEV_URL` 反代; 生产禁设.

## API / Auth

- V1 身份模型固定 `device:shared-owner-v1`, 所有请求共享 owner; 仅用于端到端验证, 禁止接真实生产数据.
- V2 预留 Google `id_token` -> `google:<sub>` 分支, 见 `packages/server/src/middleware/auth.ts`.
- 生产路径前缀是 `/autotest`; web `BASE_URL`, UI `apiBase`, core `setProxyBasePath()` 必须保持同步.
- LLM proxy 路径 `/stream-proxy` / `/http-proxy` 也必须带 `/autotest` 前缀, 否则 gateway 会转给 AUTOPILOT.

## 命令

```bash
pnpm install --frozen-lockfile
pnpm run build:cf
pnpm -F @prompt-optimizer/core test
pnpm -F @prompt-optimizer/ui test
pnpm -F @prompt-optimizer/web test
pnpm --filter @prompt-optimizer/server exec wrangler d1 migrations apply DB --local
pnpm --filter @prompt-optimizer/server smoke
```

本项目只用 pnpm; 不用 npm / yarn 安装依赖。根 `package.json#engines.node` 要求 Node >= 24.

## 迁移 / 发布

- D1 schema 位于 `packages/server/migrations/*.sql`; 新 migration 按 `0002_xxx.sql` 递增.
- CI 在 deploy 前跑 `wrangler d1 migrations apply DB --remote`, 幂等.
- workflow: 根 `.github/workflows/autotesting.yml`.
- 触发: push `v*` tag; 与 gateway / autopilot / local lockstep.
- Deploy: `pnpm install --frozen-lockfile` -> `pnpm run build:cf` -> remote D1 migrations -> `wrangler deploy`.
