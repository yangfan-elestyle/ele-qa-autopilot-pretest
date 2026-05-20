# ele-autotesting

AI 测试用例生成工具。pnpm 10 monorepo, Vue 3 前端, Hono Worker, Cloudflare D1 + Static Assets + Container (`MarkitdownContainer`).

版本 / 发布等通用规则见根 [AGENTS.md](../AGENTS.md) 与 [deploy.md](../deploy.md).

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

- V1 身份模型固定 `device:shared-owner-v1`, 所有请求共享 owner; 仅用于端到端验证, 禁止接真实生产数据.
- V2 预留 Google `id_token` -> `google:<sub>` 分支, 见 `packages/server/src/middleware/auth.ts`.
- 生产路径前缀是 `/autotest`; web `BASE_URL`, UI `apiBase`, core `setProxyBasePath()` 必须保持同步.
- LLM proxy 路径 `/stream-proxy` / `/http-proxy` 也必须带 `/autotest` 前缀, 否则 gateway 会转给 AUTOPILOT.

## 命令

日常开发 / smoke / migration 命令见 [README.md](./README.md#本地开发); 发布前验证见 [deploy.md §本地验证](../deploy.md#2-本地验证).

子包测试:

```bash
pnpm -F @prompt-optimizer/core test
pnpm -F @prompt-optimizer/ui test
pnpm -F @prompt-optimizer/web test
```

本项目只用 pnpm; 不用 npm / yarn 安装依赖。根 `package.json#engines.node` 要求 Node >= 24.

## 迁移

- D1 schema 位于 `packages/server/migrations/*.sql`; 新 migration 按 `0002_xxx.sql` 递增.
- CI 在 deploy 前跑 `wrangler d1 migrations apply DB --remote`, 幂等.
