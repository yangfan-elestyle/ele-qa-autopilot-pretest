# ele-autotesting

pnpm monorepo + Cloudflare Workers (Hono + D1 + Container). 改完代码 → 按根 [deploy.md](../deploy.md) 发布.

> **版本号校验**: `package.json#version` 与 git tag 一致 (tag 含 `v`, version 不含). 全局 lockstep 与 AI-only 工程声明见根 `AGENTS.md`. workflow: 根 `.github/workflows/autotesting.yml`.

## 工程关键字段

派生 / 切环境时必改:

- `package.json#name` / `#version`
- `packages/server/wrangler.jsonc`: `name`、`d1_databases[0].database_id` (用 `npx wrangler d1 create <name>` 输出回填)、`assets.run_worker_first` 路径白名单
- `packages/server/migrations/*.sql`: D1 schema, 新增 migration 走 `0002_xxx.sql` 递增
- 根 `.github/workflows/autotesting.yml`: 需要 secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`

## 边界

- 仅生产部署到 Cloudflare (Workers + D1 + Container). 不维护其它平台部署路径.
- D1 schema 由 `packages/server/migrations/*.sql` 维护, deploy 前 CI 跑 `wrangler d1 migrations apply DB --remote` (幂等).
- V1 身份模型: 所有请求共享 `device:shared-owner-v1` owner, 无隔离, 仅供端到端验证, 禁塞真实生产数据. V2 接入 Google `id_token` 后切 `google:<sub>` (`packages/server/src/middleware/auth.ts` 已留分支).
- 本地 dev 若 OrbStack 与 wrangler container sidecar 不兼容, 设 `MARKITDOWN_DEV_URL` 反代 (仅本地, 生产禁设).
