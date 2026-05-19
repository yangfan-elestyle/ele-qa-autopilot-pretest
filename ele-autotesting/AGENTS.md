# ele-autotesting

AI 测试用例生成工具。React Router v7 framework mode (SSR) + `@cloudflare/vite-plugin` + React 19, Bun 包管, Cloudflare Worker + D1 + Container (`MarkitdownContainer`).

版本与发布遵从根 `AGENTS.md` / `deploy.md`: `package.json#version` 必须等于 git tag 去 `v`; 发布记录写 `CHANGELOGS`.

## 结构 (扁平化单包, 自 v1.6.0)

- `app/root.tsx`, `app/routes.ts`, `app/entry.server.tsx`: RR7 入口与路由表.
- `app/routes/`: 6 个页面路由 (`_index.tsx` 主流程, `models.tsx` / `templates.tsx` / `history.tsx` / `data.tsx` / `settings.tsx`).
- `app/routes/api/`: 10 个 resource routes (sync / proxy / parse / research / healthz).
- `app/lib/`: TS 业务逻辑 (template / history / llm / model / storage / prompt / compare / data / preference); 纯 lib, 无框架依赖.
- `app/server/`: 服务端模块 (auth / config / services / plugins / utils); 由 resource routes 调用.
- `app/hooks/`: React hooks (usePromptOptimizer / useModels / useTemplates / useHistory / useClipboard).
- `app/providers/`: Context Provider (Services / Theme / Toast).
- `app/components/`: UI 组件 (Header).
- `app/styles/`: theme.css (988 行) + common.css + scrollbar.css.
- `workers/app.ts`: Worker fetch 入口; `/mcps/markitdown/*` 旁路转发到 Container, 其余进 RR7 handler.
- `migrations/0001_init.sql`: D1 schema (storage 表, PK=owner_id+key).
- `containers/markitdown/`: Cloudflare Container 镜像.

## Cloudflare

- `wrangler.jsonc`: `name=ele-autotesting`, `workers_dev=false`, `main=./workers/app.ts`, D1 binding `DB`, Container binding `MARKITDOWN`. Static Assets 由 `@cloudflare/vite-plugin` 在 build 阶段自动注入 (`build/server/wrangler.json`).
- 公开入口只能经 gateway `/autotest/*`; 不暴露 `*.workers.dev`.
- service binding 调用直接进入 worker fetch handler; RR7 自身处理静态资源与 404, 不需要 ASSETS fallback.
- 本地 OrbStack 与 wrangler container sidecar 不兼容时可设 `MARKITDOWN_DEV_URL` 反代; 生产禁设.

## API / Auth

- V1 身份模型固定 `device:shared-owner-v1`, 所有请求共享 owner; 仅用于端到端验证, 禁止接真实生产数据.
- V2 预留 Google `id_token` -> `google:<sub>` 分支, 见 `app/server/auth.ts`.
- 生产路径前缀是 `/autotest`; ServicesProvider 通过 `setProxyBasePath("/autotest")` 同步; LLM proxy 路径 `/stream-proxy` / `/http-proxy` 也必须带前缀, 否则 gateway 会转给 AUTOPILOT.

## 命令

```bash
bun install --frozen-lockfile
bun run typegen              # wrangler types + react-router typegen, 改 wrangler.jsonc 后必跑
bun run typecheck            # typegen + tsc -b
bun run build                # 产物到 build/{client,server}
bunx wrangler dev            # 本地起 (Container 走 OrbStack/Docker)
bunx wrangler deploy --dry-run
bunx wrangler d1 migrations apply DB --local
```

本项目用 Bun (与 gateway 一致), 不用 pnpm/npm/yarn.

## 迁移 / 发布

- D1 schema 位于 `migrations/*.sql`; 新 migration 按 `0002_xxx.sql` 递增.
- CI 在 deploy 前跑 `wrangler d1 migrations apply DB --remote`, 幂等.
- workflow: 根 `.github/workflows/autotesting.yml`.
- 触发: push `v*` tag; 与 gateway / autopilot / local lockstep.
- Deploy: `bun install --frozen-lockfile` -> `bun run build` -> remote D1 migrations -> `wrangler deploy`.
