# ele-autotesting

AI 测试用例生成工具. [产品说明书](https://elestyle.atlassian.net/wiki/spaces/teammobile/pages/3357310978).

## 架构 (Node 容器)

```
[Node 容器 @hono/node-server] (esbuild bundle → dist/server.mjs)
 ├─ Hono API: /healthz /confluence-parse /http-proxy /stream-proxy
 │            /image-research/analyze /markdown-research /figma-parse /api/*
 ├─ 静态 serve → packages/web/dist (SPA, 未命中走 SPA index 兜底; 见 lib/static.ts)
 ├─ libSQL embedded (DATABASE_URL=file:/data/…) → 远程 KV (models/templates/history/prefs)
 └─ /mcps/markitdown/* → markitdown HTTP sidecar (MARKITDOWN_URL)
```

子包:

- `packages/core`: 核心算法与通用工具
- `packages/ui`: 通用 UI 组件、业务逻辑、`McpService` (浏览器端 Streamable HTTP MCP 客户端)
- `packages/web`: 前端应用 (Vite + Vue3)
- `packages/server`: Node server 入口 (Hono, `src/index.ts`), libSQL, esbuild bundle
- `containers/markitdown`: markitdown-mcp 容器镜像 (compose sidecar)

## 本地开发

```bash
cp .env.example .env             # 按需填 QA_* / DEV_FALLBACK_EMAIL
pnpm install
pnpm run build:core && pnpm run build:ui && pnpm run build:server

# 起后端 (首启自建表; DEV_FALLBACK_EMAIL 兜底 owner; PORT 对齐 web 代理目标 8787)
DATABASE_URL=file:./data/autotesting.db DEV_FALLBACK_EMAIL=you@elestyle.jp PORT=8787 \
  node packages/server/dist/server.mjs
# 另一终端起前端 (Vite :18181, /api 等经 vite proxy 转发到 127.0.0.1:8787)
pnpm -F @prompt-optimizer/web dev
```

浏览器访问 <http://127.0.0.1:18181>. 整栈容器化起法见 [deploy/README.md](../deploy/README.md).

## 环境变量

运行时 env 见 [`.env.example`](./.env.example); 生产由 `deploy/.env` (compose) 注入.

<!-- prettier-ignore -->
| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | libSQL 库路径 (`file:/data/autotesting.db`) |
| `AUTOPILOT_URL` / `METERSPHERE_URL` / `AGENTIC_LOOP_URL` | 下游内网 HTTP |
| `MARKITDOWN_URL` / `MARKITDOWN_DEV_URL` | markitdown sidecar 端点 |
| `QA_ALTASSIAN_API_KEY` / `QA_ALTASSIAN_EMAIL` | Confluence Basic Token / 邮箱 |
| `QA_IMAGE_RESEARCH_OPENAI_API_KEY` / `..._OPENAI_VISION_MODEL` | OpenAI Vision |
| `QA_IMAGE_RESEARCH_GEMINI_API_KEY` / `..._GEMINI_VISION_MODEL` | Gemini Vision |
| `DEV_FALLBACK_EMAIL` | 本地直连兜底 owner (生产不设) |

## 后端路由

- `GET /healthz`: 存活检查
- `GET /confluence-parse?page_id=...`: 拉取 Confluence 页面 HTML
- `ALL /http-proxy?targetUrl=...`: HTTP 代理
- `ALL /stream-proxy?targetUrl=...`: SSE/流式代理
- `POST /image-research/analyze`: 图像理解
- `POST /markdown-research`: Markdown 中图片批量识别
- `POST /figma-parse`: Figma 节点 SVG 渲染 (`@resvg/resvg-js` + 系统字体) + Vision OCR
- `* /mcps/markitdown/*`: 反代到 markitdown sidecar (`MARKITDOWN_URL` / `MARKITDOWN_DEV_URL`)
- `/api/sync/*`: libSQL 远程 KV; owner 由 `resolveOwner` 读 gateway 注入的 `X-Auth-User-Email` header 决定. 路由清单见 `packages/server/src/routes/sync.ts` JSDoc

## 烟雾测试

```bash
DEV_FALLBACK_EMAIL=you@elestyle.jp PORT=8787 node packages/server/dist/server.mjs &  # 起后端
pnpm --filter @prompt-optimizer/server smoke                                          # 默认 ENDPOINT=127.0.0.1:8787
```

`packages/server/scripts/smoke.mjs` 覆盖静态 SPA、SPA fallback、`/healthz`、API 入参校验、markitdown `tools/list` 与 `tools/call(data: URI)`.
