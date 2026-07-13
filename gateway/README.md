# gateway

内网唯一入口 (Phase B: 原 CF Worker → Bun Node server). React Router v7 (framework mode, SSR) + React 19, Bun. 无 DB / 对象存储 / secret; 只渲染 landing + 路由分发 + 身份收口. 部署形态见根 [AGENTS.md](../AGENTS.md#部署形态-phase-b-已抛弃-cloudflare) / [deploy/](../deploy).

## 身份收口 (荣誉制, 仅 `@elestyle.jp`)

无 CF Access / OIDC. gateway 自签明文 cookie 收口 (`lib/auth.ts`):

- **浏览器**: `/login` 输公司邮箱 → 写 cookie `ele_auth_email` (`Max-Age` 400 天, `SameSite=Lax; HttpOnly`); `/logout` 清除.
- **脚本 / CLI**: 直接带 `X-Auth-User-Email: <email>` header (荣誉制, 内网边界是唯一防线).
- **校验优先级**: 有效 `@elestyle.jp` cookie > 入站 header > 302 `/login` (Accept html) / 401. 转发下游时删入站 header 再注入解析出的 email (防伪造透传).
- landing 顶栏读 `context.user.email` 渲染身份 + 登出链 `/logout`; 未登录不渲染用户区.

## 路径分发 (server 处理顺序)

<!-- prettier-ignore -->
| Path | Target | Notes |
|---|---|---|
| `/healthz` | gateway | 返回 `ok` |
| `/login` `/logout` | gateway | 登录页 (inline HTML) / 登出, 免鉴权 |
| 静态命中 `build/client/*` | gateway | landing hydration bundle (`/assets/*`); 未命中 fall through |
| `/autotest`, `/autotest/*` | `AUTOTEST_URL` | strip `/autotest` 后 HTTP 转发到 `ele-autotesting`, 注入 email |
| `/index.html` | gateway | 301 → `/` |
| `/` | RR SSR (`app/routes/home.tsx`) | landing 页 (品牌 + 双卡片 + 安装区) |
| bypass (`/install.sh` `/releases/*` `/api/v1/ingest/*` `/api/jobs/*/callback/*`) | `AUTOPILOT_URL` | 机器消费, 免鉴权透传 |
| 其他 | `AUTOPILOT_URL` | 鉴权后 HTTP 转发到 `ele-autopilot`, 注入 email |

landing loader 经 `fetch(AUTOPILOT_URL + "/releases/local/latest.txt")` 服务端拿版本号 + `new URL(request.url).origin` 拿真实入口 origin, 失败兜底客户端 fetch. favicon / PWA icon 由 autopilot `public/` 经 gateway 透传.

## 关键文件

- `server.ts`: Bun.serve 入口 (路径分发 + 身份收口 + 转发 + 静态托管; 运行时动态 import `build/server/index.js`).
- `lib/auth.ts` / `lib/env.ts` / `lib/constants.ts`: 身份 / env / `X-Auth-User-Email` header 名.
- `app/routes/home.tsx`: landing 页 + SSR loader; install 命令 SSR 阶段固化真实 URL.
- `app/entry.server.tsx`: SSR 入口 (`renderToReadableStream`, isbot 适配).
- `Dockerfile`: `oven/bun:1`, `bun run build` → `bun server.ts`.

## 命令

```bash
bun install
bun run dev        # react-router dev (仅 landing 页 HMR; 完整代理行为看构建后 server.ts)
bun run build      # 产物 build/{server,client}
bun run typecheck
bun run start      # bun server.ts (需 AUTOPILOT_URL / AUTOTEST_URL, 见 .env.example)
```

发布前验证 / 部署见 [deploy.md](../deploy.md) 与 [deploy/README.md](../deploy/README.md).
