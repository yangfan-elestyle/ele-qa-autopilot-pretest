# ele-autotesting

AI 测试用例生成工具. [产品说明书](https://elestyle.atlassian.net/wiki/spaces/teammobile/pages/3357310978).

## 架构

```
[Cloudflare Worker] (单一部署单元)
 ├─ Hono API: /healthz /config.js /confluence-parse /http-proxy /stream-proxy
 │            /image-research/analyze /markdown-research /figma-parse /api/sync/*
 ├─ Static Assets (binding) → packages/web/dist (SPA, 未命中走 SPA fallback)
 ├─ D1 (binding=DB) → 远程 KV (models/templates/history/prefs), schema 见 packages/server/migrations
 └─ /mcps/markitdown/* → MarkitdownContainer (Durable Object, on-demand)
```

子包:

- `packages/core`: 核心算法与通用工具
- `packages/ui`: 通用 UI 组件、业务逻辑、`McpService` (浏览器端 Streamable HTTP MCP 客户端)
- `packages/web`: 前端应用 (Vite + Vue3)
- `packages/server`: Cloudflare Worker 入口 (Hono) + `MarkitdownContainer` Durable Object
- `containers/markitdown`: markitdown-mcp 容器镜像 (Dockerfile)

## 本地开发

```bash
cp env.local.example .env       # 按需填 QA_* secrets
pnpm install
pnpm --filter @prompt-optimizer/server exec wrangler d1 migrations apply DB --local   # 首次建表
pnpm run dev
```

`pnpm run dev` 顺序 `clean:dist → build:core → build:ui`, 然后并行启动:

- `@prompt-optimizer/ui`: watch 构建 (增量打包到 `packages/ui/dist`)
- `@prompt-optimizer/web`: Vite dev server (`:18181`), 同源 API 由 vite proxy 转发到 `127.0.0.1:8787`
- `@prompt-optimizer/server`: `wrangler dev` (`:8787`, 自动拉起 markitdown Container; 启动前兜底创建空 `packages/web/dist` 避免 wrangler 报错)

浏览器访问 <http://127.0.0.1:18181>. 只跑 Worker: `pnpm --filter @prompt-optimizer/server dev`.

## 环境变量

<!-- prettier-ignore -->
| 变量 | 用途 | 注入方式 |
| --- | --- | --- |
| `QA_ALTASSIAN_API_KEY` | Confluence Basic Token | `wrangler secret put` |
| `QA_ALTASSIAN_EMAIL` | Confluence 邮箱 | `wrangler secret put` |
| `QA_IMAGE_RESEARCH_OPENAI_API_KEY` | OpenAI Vision Key | `wrangler secret put` |
| `QA_IMAGE_RESEARCH_OPENAI_VISION_MODEL` | OpenAI Vision Model | `wrangler.jsonc#vars` |
| `QA_IMAGE_RESEARCH_GEMINI_API_KEY` | Gemini Vision Key | `wrangler secret put` |
| `QA_IMAGE_RESEARCH_GEMINI_VISION_MODEL` | Gemini Vision Model | `wrangler.jsonc#vars` |

本地 `wrangler dev` 通过 `--env-file ../../.env` 加载仓库根 `.env` (脚本在 `packages/server/package.json`). 生产 secrets 用 `wrangler secret put <NAME>`.

可选 `MARKITDOWN_DEV_URL`: 详见 `packages/server/src/types/env.ts`.

## 后端路由

- `GET /healthz`: 存活检查
- `GET /config.js`: 前端运行时配置脚本 (白名单 `VITE_*` 变量, 注入 `window.__RUNTIME_CONFIG__`)
- `GET /confluence-parse?page_id=...`: 拉取 Confluence 页面 HTML
- `ALL /http-proxy?targetUrl=...`: HTTP 代理
- `ALL /stream-proxy?targetUrl=...`: SSE/流式代理
- `POST /image-research/analyze`: 图像理解
- `POST /markdown-research`: Markdown 中图片批量识别
- `POST /figma-parse`: Figma 节点 SVG 渲染 + Vision OCR
- `* /mcps/markitdown/*`: 反代到 markitdown Container (dev 下若 `MARKITDOWN_DEV_URL`, 反代到该 URL)
- `/api/sync/*`: D1 远程 KV; owner 由 `resolveOwner` 解析 `cf-access-jwt-assertion` JWT 取 email 决定. 路由清单见 `packages/server/src/routes/sync.ts` JSDoc

## 烟雾测试 / 监控

```bash
pnpm --filter @prompt-optimizer/server smoke                          # 本地
ENDPOINT=https://ele-autotesting.example.workers.dev pnpm --filter @prompt-optimizer/server smoke   # 线上
pnpm --filter @prompt-optimizer/server tail                           # 实时日志
```

`packages/server/scripts/smoke.mjs` 覆盖 11 条用例: 静态 SPA、SPA fallback、`/healthz`、`/config.js`、API 入参校验、markitdown `tools/list` 与 `tools/call(data: URI)`.
