# ele-autopilot

## Runtime

- `workers/app.ts`: Worker fetch 入口; 用 `runWithBindings()` 注入 Cloudflare bindings 后交给 RR7 `createRequestHandler`.
- `lib/bindings.ts`: `AsyncLocalStorage<{DB, SCREENSHOTS, RELEASES}>` 容器; 仅服务端 loader/action 使用.
- `app/entry.server.tsx`: Workers `renderToReadableStream` SSR + Ant Design cssinjs 抽取.
- `app/entry.client.tsx`: 客户端 hydrate.
- 客户端不可直连 D1/R2; 只能 fetch resource route.

## 目录

- `app/root.tsx`: HTML shell.
- `app/routes.ts`: 显式路由总表; 新页面 / API 必须登记, 不用 `flatRoutes`.
- `app/routes/`: 页面与 resource routes; 文件名 `dot.separated.tsx`, `$param` 表动态段.
- `app/admin/`: 后台 UI 模块 (`_components` / `_data` / `_hooks` / `_services` / `_utils` / `_theme`).
- `app/lib/api-shared.ts`: API helper (`jsonResponse`, `parseListParams`, `withContentRange`, `mapDbErrorToStatus`).
- `lib/db/`: D1 数据访问层; `getDb()` 从 ALS 取 binding, `queryAll/queryGet/queryRun` 全 async.
- `lib/screenshots.ts`: base64 截图写 R2, DB 存 `/screenshots/<jobTaskId>/<i>.png`.
- `migrations/`: D1 迁移, `NNNN_description.sql`.

## API

- 路由形态: `/api/admin/{resource}` 与 `/api/admin/{resource}/:id`; 资源含 `folders` / `tasks` / `jobs` / `settings`.
- `settings/llm-key`: 单独路由, GET 默认 mask (前4...后4), `?raw=1` 返明文供 dispatch 内部用 (走 `/api/admin/*` 由 Cloudflare Access 保护, 不进 gateway bypass); PUT `{value}` 写入, 空字符串视作清除.
- 文件位于 `app/routes/api.*.tsx`; resource route 只导出 `loader` / `action`, 无 `default export`.
- `action` 内按 `request.method` 分发 POST / PUT / PATCH / DELETE.
- 列表参数为 JSON 字符串: `sort` / `range` / `filter`; 分页响应头 `Content-Range`, 并暴露 `Access-Control-Expose-Headers`.
- 新增 API: 写 `app/routes/api.xxx.tsx` 后同步登记 `app/routes.ts`.
- 外部 ingest: `POST /api/v1/ingest/tasks` 公网可达, 无鉴权, 无幂等, 单次 ≤1000 task. 契约见 [docs/ingest-api.md](./docs/ingest-api.md).

## Data

- D1 表: `folders` (`parent_id` 层级), `tasks` (`sub_ids` JSON 子任务链), `jobs`, `job_tasks`, `settings`.
- Schema 只做向后兼容迁移: `ALTER TABLE ... ADD COLUMN`; 禁止 `DROP` / `RENAME` 已有列.
- 新迁移用 `wrangler d1 migrations create ele-autopilot <desc>`; deploy 自动 `wrangler d1 migrations apply ele-autopilot --remote`.
- D1 prepared statement 只支持 `?` 位置绑定: `db.prepare(sql).bind(...).all()/first()/run()`.
- R2 binding 名与 bucket 名见 `wrangler.jsonc`.
- `/screenshots/*` 只读代理 R2, 1 年 immutable cache; `r2KeyFromRelPath()` 必须防 `..` / 控制字符 / 非法字符.

## 编码

- TypeScript `strict: true`; 优先 `@/*` alias.
- Prettier + `prettier-plugin-tailwindcss` 为准, 不手工对齐.
- React 组件 `PascalCase`; 文件名 `kebab-case.tsx`.
- 未配置测试框架; 改 D1 schema / API / Worker 绑定时至少跑 `bun run build` + `wrangler deploy --dry-run`.

## 安全边界

- 不提交 `.env*`, `.dev.vars`, `data/`, `build/`, `.react-router/`, `node_modules/`, `*.sqlite*`, `.wrangler/`.
- Secret 放 Cloudflare / GitHub Secrets; Workers 非 secret env 放 `wrangler.jsonc#vars`.
- Cloudflare D1/R2 资源由人工预创建; workflow 不创建资源.
