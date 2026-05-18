# ele-autotesting

Web 版自动化测试用例生成工具, [产品使用说明书](https://elestyle.atlassian.net/wiki/spaces/teammobile/pages/3357310978).

> 工程口径见 [CLAUDE.md](./CLAUDE.md), 发布流程见 [Deploy.md](./Deploy.md).

## 架构

```
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Worker (单一部署单元)                        │
│  ├─ Hono API: /healthz /config.js                       │
│  │            /confluence-parse /http-proxy /stream-proxy│
│  │            /image-research/analyze /markdown-research │
│  │            /figma-parse /api/sync/*                  │
│  ├─ Static Assets binding → packages/web/dist (SPA)     │
│  ├─ D1 (binding=DB) → 远程 KV 存储 (models/templates/    │
│  │   history/prefs), schema 见 packages/server/migrations│
│  └─ /mcps/markitdown/* → MarkitdownContainer            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Container (Durable Object, on-demand)        │
│  markitdown-mcp (Python), port 8080                      │
└─────────────────────────────────────────────────────────┘
```

业务数据全部存 Cloudflare D1, 浏览器侧通过 `RemoteStorageProvider` 经 `/api/sync/*` 读写. V1 身份是固定常量 `device:shared-owner-v1` (单租户验证用, 所有浏览器/会话共享同一份云端数据), V2 接入 Google 登录后切换为 `google:<sub>`. 详见 `packages/server/src/middleware/auth.ts` 与 `packages/ui/src/composables/useAppInitializer.ts`.

`wrangler.jsonc#assets.run_worker_first` 是路径数组, 仅 API 前缀走 Worker; 其余请求由 Cloudflare CDN 直接服务 ASSETS, 未命中按 `not_found_handling = "single-page-application"` 自动回落到 `index.html`.

- `packages/core`: 核心算法与通用工具
- `packages/ui`: 通用 UI 组件、业务逻辑、`McpService` (浏览器端 Streamable HTTP MCP 客户端)
- `packages/web`: 前端应用 (Vite + Vue3)
- `packages/server`: Cloudflare Worker 入口 (Hono) + `MarkitdownContainer` Durable Object
- `containers/markitdown`: markitdown-mcp 容器镜像 (Dockerfile)

## 本地开发

```bash
cp env.local.example .env
# 按需在根目录 .env 填入 QA_* 等 secrets
pnpm install

# 首次启动前一次性建表 (本地 D1)
pnpm --filter @prompt-optimizer/server exec wrangler d1 migrations apply DB --local

pnpm run dev
```

`pnpm run dev` 顺序执行 `clean:dist → build:core → build:ui`, 然后并行启动:

- `@prompt-optimizer/ui`: watch 构建 (变更触发增量重新打包到 `packages/ui/dist`)
- `@prompt-optimizer/web`: Vite dev server (端口 18181), 同源 API 请求由 `vite proxy` 转发到 `127.0.0.1:8787`
- `@prompt-optimizer/server`: `wrangler dev` (端口 8787, 自动拉起 markitdown Container; 启动前会兜底创建空 `packages/web/dist` 目录避免 wrangler 报错)

浏览器访问 <http://127.0.0.1:18181>. 只跑 Worker: `pnpm --filter @prompt-optimizer/server dev`.

## 环境变量

| 变量 | 用途 | 注入方式 |
| --- | --- | --- |
| `QA_ALTASSIAN_API_KEY` | Confluence Basic Token | `wrangler secret put` |
| `QA_ALTASSIAN_EMAIL` | Confluence 邮箱 | `wrangler secret put` |
| `QA_IMAGE_RESEARCH_OPENAI_API_KEY` | OpenAI Vision Key | `wrangler secret put` |
| `QA_IMAGE_RESEARCH_OPENAI_VISION_MODEL` | OpenAI Vision Model | `wrangler.jsonc#vars` |
| `QA_IMAGE_RESEARCH_GEMINI_API_KEY` | Gemini Vision Key | `wrangler secret put` |
| `QA_IMAGE_RESEARCH_GEMINI_VISION_MODEL` | Gemini Vision Model | `wrangler.jsonc#vars` |

本地 `wrangler dev` 通过 `--env-file ../../.env` 显式加载仓库根目录的 `.env` (脚本写在 `packages/server/package.json`). 生产 secrets 通过 `wrangler secret put <NAME>` 写入 Cloudflare.

可选: `MARKITDOWN_DEV_URL` — OrbStack 上 wrangler container sidecar 与本地 Docker 网络栈存在 `setsockoptint` 兼容性问题 (参考 [cloudflare/workerd issues](https://github.com/cloudflare/workerd/issues)), 可能导致本地 dev 无法直接启动 markitdown Container. 设置此变量后 `/mcps/markitdown/*` 改为反代到该 URL (如 `https://markitdown-mcp.fan-yang2019.workers.dev`), 仅影响本地开发, 生产环境不应设置.

## 后端路由

- `GET /healthz`: 存活检查
- `GET /config.js`: 前端运行时配置脚本 (白名单 `VITE_*` 变量, 注入 `window.__RUNTIME_CONFIG__`)
- `GET /confluence-parse?page_id=...`: 拉取 Confluence 页面 HTML
- `ALL /http-proxy?targetUrl=...`: HTTP 代理
- `ALL /stream-proxy?targetUrl=...`: SSE/流式代理
- `POST /image-research/analyze`: 图像理解
- `POST /markdown-research`: Markdown 中图片批量识别
- `POST /figma-parse`: Figma 节点 SVG 渲染 + Vision OCR
- `* /mcps/markitdown/*`: 反代到 markitdown Container (dev 模式下若设置 `MARKITDOWN_DEV_URL`, 则反代到该 URL)
- `/api/sync/*`: D1 远程 KV 存储, 所有请求需带 `X-Device-Id` 头
  - `GET    /api/sync/items` — 列出当前 owner 的所有 (key,value)
  - `GET    /api/sync/items/:key` — 单 key 读
  - `PUT    /api/sync/items/:key` — 单 key 写 `{ value: string }`
  - `DELETE /api/sync/items/:key` — 单 key 删
  - `DELETE /api/sync/items` — 清空当前 owner 全部数据
  - `POST   /api/sync/batch` — 批量 `{ ops: [{key, op:'set'|'remove', value?}] }`

## 数据存储与身份模型

V1 (当前):

- 所有业务数据 (`models` / `user-templates` / `prompt_history` / `pref:*`) 存 Cloudflare D1.
- 身份载体是**固定常量** `shared-owner-v1` (`useAppInitializer.ts` 顶部 `SHARED_OWNER_ID`). 所有浏览器/会话发请求时都带 `X-Device-Id: shared-owner-v1`, 数据落在 D1 `owner_id = 'device:shared-owner-v1'` 这一行下面.
- 首次刷新会自动把本地 Dexie 中的存量数据搬到云端 (见 `useAppInitializer.ts`).

V1 已知限制 (取舍后接受):

- **共享 owner 没有数据隔离**: 任何能访问站点的人都能读到这份数据. V1 只用于端到端验证, 不要塞真实生产数据.
- 模型 `apiKey` 明文存 D1. 内部工具妥协, V2 加 AES-GCM 加密.
- 离线不可用: 所有读写都走 Worker.

V2 (Google 登录上线后):

- 打开 `packages/server/src/middleware/auth.ts` 中预留的 Google `id_token` 验证分支, owner 切换为 `google:<sub>`.
- 浏览器侧 `useAppInitializer.ts` 把 `SHARED_OWNER_ID` 那段装配替换成读 Google `id_token`, `getAuthHeader` 改用 `Authorization: Bearer <id_token>`.
- 业务层 (`ModelManager` / `HistoryManager` / ...) 一行都不改.

## 烟雾测试 / 监控

```bash
pnpm --filter @prompt-optimizer/server smoke                          # 本地
ENDPOINT=https://ele-autotesting.example.workers.dev pnpm --filter @prompt-optimizer/server smoke   # 线上
pnpm --filter @prompt-optimizer/server tail                           # 实时日志 (或 Cloudflare Dashboard → Workers → Logs)
```

`packages/server/scripts/smoke.mjs` 覆盖 11 条用例: 静态 SPA、SPA fallback、`/healthz`、`/config.js`、API 入参校验、markitdown `tools/list` 与 `tools/call(data: URI)`.
