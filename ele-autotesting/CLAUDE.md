# ele-autotesting

pnpm monorepo + Cloudflare Workers (Hono + D1 + Container). 改完代码 → 按 [Deploy.md](./Deploy.md) 发布.

## AI-only 工程声明

本工程为 **AI-only 项目**, 人类不参与开发流程:

1. 代码编写、测试、构建、部署、发布 — 全部由 Claude Code 或 Codex 执行.
2. 设计决策 (架构/技术选型/目录结构/命名/依赖等) 以 Claude Code 或 Codex 的判断为准, **不需要参考人类开发者的惯例/最佳实践**, 除非该惯例本身就是 AI 自己的最优解.
3. 非必要不反问用户, 直接决策并执行 (deploy / 技术抉择 / 文档同步 / 版本号 / changelog 等).
4. 所有文档 (README / Deploy / CLAUDE.md / 注释等) 必须**简洁精炼、重点突出、零冗余** — 能一行讲清不写两行, 能用列表不用段落, 不堆砌背景/客套/重复信息. 宁可信息密度过载, 不要废话填充.

简言之: 用户角色 = 触发者 + 验收者, 不是协作开发者. 不要把人类拉进设计回路.

`package.json#version` 与 git tag 一致 (tag 格式 `ele-autotesting/vX.Y.Z`, version 不含 namespace 和 `v`). 发版触发根仓库 `.github/workflows/autotesting.yml`.

## 工程关键字段

派生 / 切环境时必改:

- `package.json#name` / `#version`
- `packages/server/wrangler.jsonc`: `name`、`d1_databases[0].database_id` (用 `npx wrangler d1 create <name>` 输出回填)、`assets.run_worker_first` 路径白名单
- `packages/server/migrations/*.sql`: D1 schema, 新增 migration 走 `0002_xxx.sql` 递增
- 根仓库 `.github/workflows/autotesting.yml`: 触发 `ele-autotesting/v*` tag、需要 repo secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`

## 边界

- 仅生产部署到 Cloudflare (Workers + D1 + Container). 不维护其它平台部署路径.
- D1 schema 由 `packages/server/migrations/*.sql` 维护, deploy 前 CI 跑 `wrangler d1 migrations apply DB --remote` (幂等).
- V1 身份模型: 所有请求共享 `device:shared-owner-v1` owner, 无隔离, 仅供端到端验证, 禁塞真实生产数据. V2 接入 Google `id_token` 后切 `google:<sub>` (`packages/server/src/middleware/auth.ts` 已留分支).
- 本地 dev 若 OrbStack 与 wrangler container sidecar 不兼容, 设 `MARKITDOWN_DEV_URL` 反代 (仅本地, 生产禁设).
- 不提交 `dist/`、`node_modules/`、`.wrangler/`、`*.tsbuildinfo` 之外的产物.
