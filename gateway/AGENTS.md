# gateway

## 边界

- gateway 不放业务状态 / 数据库 / R2 / Container / 业务 API; RR loader 只允许通过 service binding 调下游 Worker.
- 业务 Worker `workers_dev:false`; 公网只能经 gateway 访问.
- 不创建 `public/` 目录; `/favicon.ico` 与全套 PWA icon (favicon.svg / apple-touch-icon.png / icon-*.png / site.webmanifest) 由 `ele-autopilot/public/` 单一供给, 经 gateway 透传 — 避免 assets binding 抢路由, 让三个 web 工程共用同一品牌资产.
- 互调 `autopilot <-> autotest` 暂未启用; 需要时在业务项目各自 `wrangler.jsonc` 加 service binding.

## Access (Zero Trust) 修改约束

- 改 Bypass 名单时: `workers/app.ts#isBypassPath` 与 CF 后台 `QA Gateway Bypass` Application Domain 名单**必须双向锁**; 任何漂移立刻让 agent callback / install.sh / agent 自更新链路死亡.
- IdP 仅勾 Google (关掉「接受所有可用的标识提供程序」), policy=Allow + `Emails ending in @elestyle.jp`.
- CF 单 App 最多 5 条 Bypass domain; 增删时同步精简清单.
- `vars.TEAM_DOMAIN` / `vars.POLICY_AUD` 由 wrangler 持有; AUD 改动需同步 CF 后台 `QA Gateway` Application Overview.

## 构建

- `assets` binding 由 vite plugin 构建时注入 (`build/server/wrangler.json`); 不手动维护 `assets` 字段.
