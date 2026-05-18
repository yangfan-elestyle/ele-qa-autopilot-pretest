# ele-autopilot

React Router v7 (Framework mode) Web 应用 — QA 任务管理后台. 文件夹层级组织任务, **Cloudflare D1** 持久化 (prepared statement, async), **Cloudflare R2** 存截图, Ant Design + Tailwind UI. Node 20+ + Bun (`bun.lock`). 运行时 Cloudflare Workers (V8 isolate).

> 改完代码 → `CHANGELOG.md` 顶部新增版本段 → 按根 [deploy.md](../deploy.md) 发布. **版本号校验**: `package.json#version` 必须与 git tag 一致 (Actions 校验). 全局 lockstep 与 AI-only 工程声明见根 `AGENTS.md`.

## Project Structure

- `app/`: RR7 应用根. `app/root.tsx` HTML shell; `app/entry.server.tsx` SSR 入口 (Workers `renderToReadableStream` + antd cssinjs 抽取); `app/entry.client.tsx` 客户端 hydrate.
- `app/routes.ts`: 显式路由总表 — 一处定义所有 URL → 文件映射, 不用 `flatRoutes`.
- `app/routes/`: 所有路由文件 (页面 + REST resource routes). 命名 `dot.separated.tsx`, `$param` 表动态段.
- `app/admin/`: 管理后台 UI 模块 (`_components/` / `_data/` / `_hooks/` / `_services/` / `_utils/` / `_theme/`).
- `app/lib/api-shared.ts`: 资源路由通用 helper (`jsonResponse` / `parseListParams` / `withContentRange` / `mapDbErrorToStatus`).
- `lib/db/`: D1 数据访问层 (异步 prepared statement, 仅在 loader/action 内调用; 客户端必须通过 fetch API 访问).
- `lib/bindings.ts`: `AsyncLocalStorage<{DB, SCREENSHOTS, RELEASES}>` 容器, 请求级别注入 Cloudflare bindings.
- `lib/screenshots.ts`: R2 截图读写 (base64 解码 → R2.put, key = `<jobTaskId>/<i>.png`).
- `workers/app.ts`: Workers fetch handler 入口, `runWithBindings()` wrap + RR7 `createRequestHandler`.
- `migrations/`: D1 SQL 迁移 (`NNNN_description.sql`, `wrangler d1 migrations apply` 顺序执行).

## Key Files

- `wrangler.jsonc`: Workers 配置 — `main: ./workers/app.ts`, `compatibility_flags: ["nodejs_compat"]`, d1 binding `DB`, r2 bindings `SCREENSHOTS` + `RELEASES`.
- `react-router.config.ts`: `ssr: true`, `appDirectory: 'app'`, `future.v8_viteEnvironmentApi: true` (与 `@cloudflare/vite-plugin` 集成必需).
- `vite.config.ts`: `cloudflare({ viteEnvironment: { name: 'ssr' } })` + `tailwindcss()` + `reactRouter()`.
- `worker-configuration.d.ts`: `wrangler types` 生成. **不要手编辑**, 改 `wrangler.jsonc` 后跑 `bun run typegen`.
- `app/routes.ts`: 路由总表 (新增页面 / API 必须同步登记).
- `lib/db/{index,connection,utils}.ts`: db 公共导出聚合 / `getDb()` 从 ALS 取 D1 / `queryAll/queryGet/queryRun` async 包装.

## API Conventions

- 路由形态: `/api/admin/{resource}` 与 `/api/admin/{resource}/:id`, 资源: `folders` / `tasks` / `jobs` / `settings`.
- 文件位于 `app/routes/api.*.tsx`, 仅导出 `loader` (GET) 与 `action` (POST/PUT/PATCH/DELETE), 无 `default export` = resource route.
- `action` 内通过 `request.method` 分发 PUT/PATCH/DELETE.
- 列表参数 (JSON 字符串): `sort` / `range` / `filter`. 分页用响应头 `Content-Range` (`Access-Control-Expose-Headers: Content-Range`).
- 新增接口: 1) 写 `app/routes/api.xxx.tsx`, 2) 在 `app/routes.ts` `route()` 登记.
- 所有 db 函数 async, loader/action 内必须 `await`.

## Database (D1)

- 表: `folders` (`parent_id` 层级) / `tasks` (关联 `folders`, `sub_ids` JSON 表子任务链) / `jobs` + `job_tasks` (执行记录) / `settings`.
- Schema 改动: `migrations/` 下新建 `NNNN_description.sql` (`wrangler d1 migrations create ele-autopilot <desc>`). **必须向后兼容**: `ALTER TABLE ... ADD COLUMN`, 禁止 `DROP` / `RENAME` 已有列.
- 部署自动跑 `wrangler d1 migrations apply --remote`. 本地用 `--local` 同步 miniflare D1.
- prepared statement: `db.prepare(sql).bind(...).all()/first()/run()`, 仅 `?` 位置绑定, 不支持命名参数.

## Storage (R2)

- `ele-autopilot-screenshots` (binding `SCREENSHOTS`), key 格式 `<jobTaskId>/<stepIndex>.png`.
  - 写: callback base64 → `lib/screenshots.ts#externalizeScreenshots` → `R2.put`, DB 存路径 `/screenshots/<jobTaskId>/<i>.png`.
  - 读: `/screenshots/*` 路由 → `R2.get(key).body` → Response (1y immutable cache).
  - 路径越狱防护: `r2KeyFromRelPath()` 校验 `..` / 控制字符 / 非法字符.
- `ele-autopilot-releases` (binding `RELEASES`): 存 ele-autopilot-local 发布产物, 路径 `local/<ver>/<file>` + `local/latest.txt`. `/releases/local/*` 路由代理只读; 写入由 ele-autopilot-local workflow.

## Build & Development

```bash
bun install
bun dev                # Vite + cloudflare 插件 + miniflare (本地 D1 / R2 模拟)
bun run build          # 输出 build/client + build/server (含 wrangler.json)
bun run preview        # wrangler dev (生产模拟, 走 build 产物)
bun run typecheck      # wrangler types + react-router typegen + tsc
bun run typegen        # 仅生成 worker-configuration.d.ts (改 wrangler.jsonc 后必跑)
bun run deploy         # 直接 wrangler deploy (常规走 Actions, 仅紧急情况)
bun run lint
bun run format         # prettier --write .
```

首次本地: `bunx wrangler d1 migrations apply ele-autopilot --local` 把 schema 写到 miniflare 本地 D1.

## Coding Style

- TypeScript `strict: true`. 优先 `@/*` 路径别名.
- Prettier (含 `prettier-plugin-tailwindcss`) 为准, 不要手工对齐.
- React 组件 `PascalCase` + 导出; 文件名 `kebab-case.tsx`.
- 路由文件 RR7 显式登记约定 `app/routes/dot.separated.$param.tsx`.

## Testing

未配置测试框架. 改 D1 schema / API 形态时通过 `bun run build` + `bunx wrangler deploy --dry-run` 验证产物 + bindings.

## Release

- 触发: push `v*` tag (三子项目 lockstep, 见根 `AGENTS.md`). workflow: 根 `.github/workflows/autopilot.yml`.
- 流程: 校验 tag 版本号 = `package.json#version` → bun install → build → `wrangler d1 migrations apply ele-autopilot --remote` → `wrangler deploy`.
- D1 (`ele-autopilot`) / R2 (`ele-autopilot-screenshots` + `ele-autopilot-releases`) 由人工预先创建, workflow 不再创建.
- 完整步骤 / amend 场景: 根 [deploy.md](../deploy.md).

## Security & Configuration

- 不提交 `.env*` / `data/` / `build/` / `.react-router/` / `node_modules/` / `*.sqlite*` / `.wrangler/`. 敏感配置放 `.dev.vars` (gitignored).
- 必备 GitHub Secrets: `CLOUDFLARE_API_TOKEN` (Workers/D1/R2 编辑权限), `CLOUDFLARE_ACCOUNT_ID`.
- Workers env 非 secret 写 `wrangler.jsonc#vars`; secret 用 `wrangler secret put <name>`.
- D1 备份: `bunx wrangler d1 export ele-autopilot --remote --output backup.sql`.

## Boundary

- Workers 单文件大小限制 (gzip): Free 3 MiB / Paid 10 MiB. 当前 server bundle ~900 KiB gzip, 安全.
- D1 单库上限 10 GB (Paid). 单查询行数 / 字节有上限, 详见 Cloudflare D1 文档.
