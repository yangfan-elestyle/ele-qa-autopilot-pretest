# ele-autopilot

React Router v7 Framework mode Web 后台。React 19 + Ant Design + Tailwind, Bun, Cloudflare Workers (V8 isolate), D1 存业务数据, R2 存截图与本地 agent 发布产物.

版本 / 发布 / typegen 等通用规则见根 [AGENTS.md](../AGENTS.md) 与 [deploy.md](../deploy.md).

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
- 文件位于 `app/routes/api.*.tsx`; resource route 只导出 `loader` / `action`, 无 `default export`.
- `action` 内按 `request.method` 分发 POST / PUT / PATCH / DELETE.
- 列表参数为 JSON 字符串: `sort` / `range` / `filter`; 分页响应头 `Content-Range`, 并暴露 `Access-Control-Expose-Headers`.
- 新增 API: 写 `app/routes/api.xxx.tsx` 后同步登记 `app/routes.ts`.

## Data

- D1 表: `folders` (`parent_id` 层级), `tasks` (`sub_ids` JSON 子任务链), `jobs`, `job_tasks`, `settings`.
- Schema 只做向后兼容迁移: `ALTER TABLE ... ADD COLUMN`; 禁止 `DROP` / `RENAME` 已有列.
- 新迁移用 `wrangler d1 migrations create ele-autopilot <desc>`; deploy 自动 `wrangler d1 migrations apply ele-autopilot --remote`.
- D1 prepared statement 只支持 `?` 位置绑定: `db.prepare(sql).bind(...).all()/first()/run()`.
- R2 binding 名与 bucket 名见 `wrangler.jsonc`.
- `/screenshots/*` 只读代理 R2, 1 年 immutable cache; `r2KeyFromRelPath()` 必须防 `..` / 控制字符 / 非法字符.
- Job 状态机权威源在 `lib/db/jobs.ts#syncJobStatusFromTasks`; `ele-autopilot-local/autopilot/job.py#_update_status` 必须与之一致.

## 命令

日常开发命令见 [README.md](./README.md#开发); 发布前验证 (lint / typecheck / build / wrangler deploy --dry-run) 见 [deploy.md §本地验证](../deploy.md#2-本地验证).

## 编码

- TypeScript `strict: true`; 优先 `@/*` alias.
- Prettier + `prettier-plugin-tailwindcss` 为准, 不手工对齐.
- React 组件 `PascalCase`; 文件名 `kebab-case.tsx`.
- 未配置测试框架; 改 D1 schema / API / Worker 绑定时至少跑 `bun run build` + `wrangler deploy --dry-run`.

## 安全边界

- 不提交 `.env*`, `.dev.vars`, `data/`, `build/`, `.react-router/`, `node_modules/`, `*.sqlite*`, `.wrangler/`.
- Secret 放 Cloudflare / GitHub Secrets; Workers 非 secret env 放 `wrangler.jsonc#vars`.
- Cloudflare D1/R2 资源由人工预创建; workflow 不创建资源.
