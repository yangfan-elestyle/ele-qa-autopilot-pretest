# gateway

内网唯一入口 (Phase B: 原 CF Worker → Bun Node server). 部署形态见根 [AGENTS.md](../AGENTS.md#部署形态-phase-b-已抛弃-cloudflare).

## 运行

- `server.ts`: Bun.serve 入口. 路由分发 + 身份收口 + 下游转发 + 静态托管. 无 `workers/`.
- 下游寻址走 `AUTOPILOT_URL` / `AUTOTEST_URL` (compose service, HTTP fetch); 无 service binding.
- `build/server/index.js` 由 `bun run build` (RR7) 产出, `server.ts` 运行时动态 import; `build/client` 静态托管 (缺失则透传 AUTOPILOT).

## 边界

- gateway 不放业务状态 / DB / 对象存储 / 业务 API; RR 只渲染 landing (`app/routes/home.tsx`).
- 下游容器不对外暴露端口, 只经 gateway 访问 (compose 硬前提).
- 不创建 `public/` 目录; `/favicon.ico` 与全套 PWA icon 由 `ele-autopilot/public/` 单一供给, 经 gateway 透传下游 — 三 web 工程共用同一品牌资产.

## 身份收口 (lib/auth.ts)

- 无 CF Access / OIDC. 浏览器: 明文 cookie `ele_auth_email` (`/login` 输公司邮箱签发, `Max-Age` 400 天); 脚本/CLI: 直接带 `X-Auth-User-Email` header (荣誉制).
- 校验优先级: 有效 `@elestyle.jp` cookie > 入站 header > 302 `/login` (Accept html) / 401. 转发下游时删入站 header 再注入解析出的 email (防伪造透传).
- **bypass** (`server.ts#isBypass`, 免鉴权): `/healthz` + `/login` + `/logout` + `/install.sh` + `/releases/*` + `/api/v1/ingest/*` + `/api/jobs/*/callback/*` (机器消费, 天生无浏览器身份; 内网边界是真实防线).
- header 名 `X-Auth-User-Email` (`lib/constants.ts`) 与两下游锁同值.

## 配置

- 运行时 env 见 `.env.example` (`AUTOPILOT_URL` / `AUTOTEST_URL` / `ALLOWED_EMAIL_DOMAIN` / `COOKIE_MAX_AGE` / `PORT`).
