# gateway

Cloudflare Worker `qa`: 三个业务子项目的唯一公网入口. React Router v7 (framework mode, SSR) + `@cloudflare/vite-plugin` + React 19, Bun 包管, 无 D1 / R2 / DO / secret.

## 路径分发 (worker 处理顺序)

<!-- prettier-ignore -->
| Path | Target | Notes |
|---|---|---|
| `/healthz` | gateway | 返回 `ok`, 不进 RR |
| `/autotest`, `/autotest/*` | `env.AUTOTEST.fetch` | strip `/autotest` 后转发到 `ele-autotesting` |
| `/`, `/index.html` | RR SSR (`app/routes/home.tsx`) | landing 页 (品牌 + 双卡片 + 安装区) |
| 其他 | `env.AUTOPILOT.fetch` | 原样透传到 `ele-autopilot` (含 `/autopilot*` / `/api/*` / `/screenshots/*` / `/releases/*` / `/install.sh` / `/favicon.ico`) |

RR 客户端 hydration bundle (`/assets/*`) 由 wrangler `assets` binding 优先命中, 命中即返回; 未命中再 fall through 到 worker. landing loader 经 `env.AUTOPILOT.fetch("/releases/local/latest.txt")` 服务端拿版本号, 失败兜底客户端 fetch.

## 关键文件

- `workers/app.ts`: Worker fetch 入口 (路径分发 + RR `createRequestHandler` fallback).
- `app/root.tsx`: HTML shell + ErrorBoundary (404 + dev stack).
- `app/routes.ts`: 路由表; 当前仅 `index("routes/home.tsx")`.
- `app/routes/home.tsx`: landing 页 + SSR loader (拿版本号) + 客户端复制按钮.
- `app/entry.server.tsx`: SSR 入口 (`renderToReadableStream`, isbot 适配).
- `app/app.css`: 设计 token (浅 / 深 `prefers-color-scheme`) + 全局样式; 不引 Tailwind.
- `react-router.config.ts`: `ssr: true`, `future.v8_viteEnvironmentApi: true`.
- `vite.config.ts`: `cloudflare({ viteEnvironment: { name: "ssr" } })` + `reactRouter()`.
- `wrangler.jsonc`: `name=qa`, `main=./workers/app.ts`, `workers_dev=true`, service bindings `AUTOPILOT` / `AUTOTEST`. `assets` 由 vite plugin 构建时自动注入 (`build/server/wrangler.json`).
- `worker-configuration.d.ts`: `wrangler types` 生成, 不手改; 改 `wrangler.jsonc` 后跑 `bun run typegen`.

## 命令

```bash
bun install
bun run dev                  # react-router dev (Vite HMR, Workers runtime)
bun run typegen              # wrangler types + react-router typegen, 改 wrangler.jsonc 后必跑
bun run typecheck            # typegen + tsc -b
bun run build                # 产物到 build/{client,server}
bunx wrangler deploy --dry-run  # 验证 service bindings + 体积
bunx wrangler deploy         # 常规走 Actions
```

## Release

- workflow: 根 `.github/workflows/gateway.yml`.
- 触发: push `v*` tag; 版本与三业务 lockstep, 见根 `AGENTS.md` / `deploy.md`.
- 流程: 校验 tag = `package.json#version` -> `bun install --frozen-lockfile` -> `wrangler deploy` (`@cloudflare/vite-plugin` 触发 `react-router build`, wrangler 读 `build/server/wrangler.json` 部署).

## 边界

- 不在 gateway 放业务状态、数据库、R2、Container 或业务 API; RR loader 只允许通过 service binding 调下游 Worker.
- 业务 Worker `workers_dev:false`; 公网只能经 gateway 访问.
- public/ 目录刻意不创建; `/favicon.ico` 维持转发到 AUTOPILOT, 避免 assets binding 抢占路由.
- 互调 `autopilot <-> autotest` 暂未启用; 需要时在业务项目各自 `wrangler.jsonc` 加 service binding.
