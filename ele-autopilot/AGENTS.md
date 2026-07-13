# ele-autopilot

## Runtime (Phase B: 原 CF Worker → Bun Node server)

- `server.ts`: Bun.serve 入口; 启动建 libSQL client + S3(MinIO) store, 跑 migrations, 每请求 `runWithBindings()` 注入后交 RR7 `createRequestHandler`; 静态托管 `build/client`. 无 `workers/`.
- `lib/bindings.ts`: `AsyncLocalStorage<{DB, SCREENSHOTS, RELEASES}>` 容器 (用全局符号注册表, 让 server.ts 与 RR bundle 副本共享同一 ALS); 仅服务端 loader/action 使用.
- `lib/env.ts`: 运行时 env (DATABASE_URL / S3_* / bucket / 域); 见 `.env.example`.
- `app/entry.server.tsx`: `renderToReadableStream` SSR + Ant Design cssinjs 抽取.
- 客户端不可直连 DB/对象存储; 只能 fetch resource route.

## 目录

- `app/root.tsx`: HTML shell.
- `app/routes.ts`: 显式路由总表; 新页面 / API 必须登记, 不用 `flatRoutes`.
- `app/routes/`: 页面与 resource routes; 文件名 `dot.separated.tsx`, `$param` 表动态段.
- `app/admin/`: 后台 UI 模块 (`_components` / `_data` / `_hooks` / `_services` / `_utils` / `_theme`).
- `app/lib/api-shared.ts`: API helper (`jsonResponse`, `parseListParams`, `withContentRange`, `mapDbErrorToStatus`).
- `lib/db/`: 数据访问层; `getDb()` 从 ALS 取 libSQL adapter (`connection.ts#createLibsqlDb`), `queryAll/queryGet/queryRun` 全 async. `migrate.ts` = 启动 migration runner.
- `lib/object-store.ts`: `ObjectStore` seam + `createS3Store` (aws-sdk-v3 → MinIO). `lib/screenshots.ts`: base64 截图写对象存储, DB 存 `/screenshots/<jobTaskId>/<i>.png`.
- `migrations/`: `NNNN_description.sql` (纯 SQLite 方言); server 首启幂等 apply.

## API

- 路由形态: `/api/admin/{resource}` 与 `/api/admin/{resource}/:id`; 资源含 `folders` / `tasks` / `jobs` / `settings`.
- `settings/llm-key`: 单独路由, GET 默认 mask (前4...后4), `?raw=1` 返明文供 dispatch 内部用; PUT `{value}` 写入, 空字符串视作清除. loader / action 内部深度防御强制 `requireAccessUser` (读 gateway 注入的 `X-Auth-User-Email` header) + `@elestyle.jp` email 校验; 未登录 401.
- 文件位于 `app/routes/api.*.tsx`; resource route 只导出 `loader` / `action`, 无 `default export`.
- `action` 内按 `request.method` 分发 POST / PUT / PATCH / DELETE.
- 列表参数为 JSON 字符串: `sort` / `range` / `filter`; 分页响应头 `Content-Range`, 并暴露 `Access-Control-Expose-Headers`.
- 新增 API: 写 `app/routes/api.xxx.tsx` 后同步登记 `app/routes.ts`.
- 外部 ingest: `POST /api/v1/ingest/tasks` 内网可达 (gateway bypass), 无鉴权, 无幂等, 单次 ≤1000 task. 契约见 [docs/ingest-api.md](./docs/ingest-api.md).

## Data

- 表: `folders` (`parent_id` 层级), `tasks` (`sub_ids` JSON 子任务链), `jobs`, `job_tasks`, `settings`. FK: `jobs.task_id`→tasks, `job_tasks.job_id`→jobs 均 CASCADE (libSQL 需 `PRAGMA foreign_keys=ON`, server 启动已设).
- Schema 只做向后兼容迁移: `ALTER TABLE ... ADD COLUMN`; 禁止 `DROP` / `RENAME` 已有列. 新增按 `NNNN_desc.sql` 递增, server 首启幂等 apply.
- prepared statement 只支持 `?` 位置绑定: `db.prepare(sql).bind(...).all()/first()/run()`; `batch()` = 原子写事务 (createJob 依赖, `bun run smoke` 回归).
- 对象存储 bucket 名见 `.env.example` (`SCREENSHOTS_BUCKET` / `RELEASES_BUCKET`).
- `/screenshots/*` 只读代理对象存储, 1 年 immutable cache; `r2KeyFromRelPath()` 必须防 `..` / 控制字符 / 非法字符.

## 编码

- TypeScript `strict: true`; 优先 `@/*` alias.
- Prettier + `prettier-plugin-tailwindcss` 为准, 不手工对齐.
- React 组件 `PascalCase`; 文件名 `kebab-case.tsx`.
- 未配置测试框架; 改 DB schema / API / server 绑定时至少跑 `bun run build` + `bun run typecheck` + `bun run smoke`.

## 安全边界

- 不提交 `.env*`, `data/`, `build/`, `.react-router/`, `node_modules/`, `*.db`, `*.sqlite*`.
- Secret 经 `deploy/.env` (compose) 注入; 运行时 env 见 `.env.example`.
- `/api/admin/*` 经 gateway 统一鉴权 (注入 `X-Auth-User-Email`); 返敏感数据/写库的 admin 路由额外在 loader/action 内自验 `requireAccessUser` (`lib/access-auth.ts`) 做深度防御.
