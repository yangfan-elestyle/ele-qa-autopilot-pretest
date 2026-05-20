# gateway

Cloudflare Worker `qa`: 三个业务子项目的唯一公网入口. React Router v7 (framework mode, SSR) + `@cloudflare/vite-plugin` + React 19, Bun 包管, 无 D1 / R2 / DO / secret.

LLM 约束见 [AGENTS.md](./AGENTS.md); 发布流程见根 [deploy.md](../deploy.md).

## Access (Google Workspace SSO)

公网入口套 Cloudflare Zero Trust Self-hosted Application + Google Workspace IdP, 仅 `@elestyle.jp` 员工可访问.

- **Team Domain**: `https://yigegongjiang.cloudflareaccess.com` (wrangler `vars.TEAM_DOMAIN`).
- **Application Audience (AUD)**: 在 wrangler `vars.POLICY_AUD`; CF 后台 `QA Gateway` → Overview 抄.
- **Allow App `QA Gateway`**: domain `qa.<sub>.workers.dev` 整域兜底, IdP 仅 Google, policy=Allow + `Emails ending in @elestyle.jp`.
- **Bypass App `QA Gateway Bypass`** (CF 单 App 最多 5 条 domain): `/api/*` `/install.sh` `/releases/*` `/assets/*` `/healthz`, policy=Bypass + Everyone.
  - 砍掉 `/screenshots/*` / PWA icons — 登录后浏览器带 cookie 仍能加载, 仅影响匿名 SEO / 分享卡片 / iOS 加桌面.
- worker `workers/app.ts` 用 `jose` 远程 JWKS (`<team>/cdn-cgi/access/certs`) 做深度防御; JWT 校验放行规则见代码 `verifyAccessJwt`.
- landing 顶栏读 `context.user.email` 渲染身份 + 登出链 `/cdn-cgi/access/logout`; 未登录态不渲染用户区.

## 路径分发 (worker 处理顺序)

<!-- prettier-ignore -->
| Path | Target | Notes |
|---|---|---|
| `/healthz` | gateway | 返回 `ok`, 不进 RR |
| `/autotest`, `/autotest/*` | `env.AUTOTEST.fetch` | strip `/autotest` 后转发到 `ele-autotesting` |
| `/index.html` | gateway | 301 重定向到 `/` (规范化, 避免 RR 路由表无 `/index.html` 渲染 404) |
| `/` | RR SSR (`app/routes/home.tsx`) | landing 页 (品牌 + 双卡片 + 安装区) |
| 其他 | `env.AUTOPILOT.fetch` | 原样透传到 `ele-autopilot` (含 `/autopilot*` / `/api/*` / `/screenshots/*` / `/releases/*` / `/install.sh` / `/favicon.ico`) |

RR 客户端 hydration bundle (`/assets/*`) 由 wrangler `assets` binding 优先命中, 命中即返回; 未命中再 fall through 到 worker. landing loader 经 `env.AUTOPILOT.fetch("/releases/local/latest.txt")` 服务端拿版本号 + 用 `new URL(request.url).origin` 拿真实 gateway origin, 失败兜底客户端 fetch.

## 关键文件

- `workers/app.ts`: Worker fetch 入口 (路径分发 + RR `createRequestHandler` fallback).
- `app/root.tsx`: HTML shell + ErrorBoundary (404 + dev stack).
- `app/routes.ts`: 路由表; 当前仅 `index("routes/home.tsx")`.
- `app/routes/home.tsx`: landing 页 + SSR loader (拿版本号 + gateway origin) + 客户端复制按钮; install 命令在 SSR 阶段已固化真实 URL, 不依赖 hydration.
- `app/entry.server.tsx`: SSR 入口 (`renderToReadableStream`, isbot 适配).
- `app/app.css`: 设计 token (浅 / 深 `prefers-color-scheme`) + 全局样式; 不引 Tailwind.
- `react-router.config.ts`: `ssr: true`, `future.v8_viteEnvironmentApi: true`.
- `vite.config.ts`: `cloudflare({ viteEnvironment: { name: "ssr" } })` + `reactRouter()`.
- `wrangler.jsonc`: `name=qa`, `main=./workers/app.ts`, `workers_dev=true`, service bindings `AUTOPILOT` / `AUTOTEST`.
- `worker-configuration.d.ts`: `wrangler types` 生成.

## 命令

```bash
bun install
bun run dev       # react-router dev (Vite HMR, Workers runtime)
bun run typegen   # wrangler types + react-router typegen
```

发布前验证 (typecheck / build / wrangler deploy --dry-run) 见 [deploy.md §本地验证](../deploy.md#2-本地验证); 生产部署走 Actions.
