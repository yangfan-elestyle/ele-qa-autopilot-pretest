# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

## [1.5.7] - 2026-05-19

### Changed

- landing 页换栈: 从单文件内嵌 HTML 重写为 React Router v7 framework mode (SSR) + `@cloudflare/vite-plugin`. 视觉重做: 顶部品牌 + 健康状态 pill, hero 区渐变标题 + 描述, 双卡片含 lucide-style SVG icon / hover lift / arrow micro-interaction, 安装区步骤编号 + 等宽命令 + 一键复制反馈, footer 内嵌 healthz / autopilot / autotest 链接. 浅 / 深主题双套 token (`prefers-color-scheme`), Inter + JetBrains Mono web font, 移动端单列响应式.
- 版本号 SSR loader 经 `env.AUTOPILOT.fetch("/releases/local/latest.txt")` 直接拿, 失败兜底客户端 `fetch` (避免首屏 `v—` 闪烁), 正则严格校验 (`^[0-9][0-9a-zA-Z.\-+]{0,31}$`) 防注入.

### Added

- React Router v7 + Vite + React 19 + 单一路由 (`app/routes/home.tsx`) + root layout (`app/root.tsx`, ErrorBoundary 含 404 / dev stack).
- `workers/app.ts` Worker fetch 入口: `/healthz` 自答, `/autotest/*` strip 后转发 `AUTOTEST`, `/` 与 `/index.html` 走 RR SSR, 其他 (含 `/autopilot*` / `/api/*` / `/screenshots/*` / `/releases/*` / `/install.sh` / `/favicon.ico`) 透传 `AUTOPILOT`. 路径分发顺序刻意把 `/autotest` 前置, 防止 `/autotest/install.sh` 之类被误投 AUTOPILOT.
- TypeScript project references (`tsconfig.json` + `tsconfig.cloudflare.json` + `tsconfig.node.json`), `react-router.config.ts` (`ssr: true`, `v8_viteEnvironmentApi`), `vite.config.ts` (cloudflare + reactRouter plugin).

### Removed

- `src/index.ts` 单文件 fetch handler (功能整体迁到 `workers/app.ts` + RR app).
- 单文件内嵌 HTML / 内联 `<script>` / 客户端拼 `install.sh` URL 逻辑 (改 SSR 渲染, 客户端只承担复制按钮交互).

### Notes

- service bindings `AUTOPILOT` / `AUTOTEST` 不变, `wrangler.jsonc` 仍 `workers_dev: true`, 唯一公网入口 URL 不变.
- bundle 体积: 单文件 5 KB → SSR worker + 客户端 hydration 共 665 KiB / 140 KiB gzip; 在 Workers 10 MB 限制内, 首字节仍 SSR HTML.
- public/ 目录刻意不创建; `/favicon.ico` 维持原契约转发到 AUTOPILOT, 避免 assets binding 抢占路由.
- `.github/workflows/gateway.yml` 在 `wrangler deploy` 前增加 `bun run build` 步骤. 直接 `wrangler deploy` 会因 vite-plugin 找不到 `virtual:react-router/server-build` 而失败 (实测).
- `deploy.md` gateway 段同步更新 (本地 verify + workflow 描述).

## [1.5.6] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot-local v1.5.6 一同发布; 本项目无业务改动. 上游修复: `.github/workflows/autopilot-local.yml` 4 处 `wrangler r2 object put` 补 `--remote` (wrangler v4 默认 local), production R2 不再为空, landing 页客户端 fetch `/releases/local/latest.txt` 真能拿到当前版本号.

## [1.5.5] - 2026-05-19

### Changed

- Landing 页 (`src/index.ts`) 在双卡片下方内嵌 "本地 agent 安装" 区块: 三步命令 (uv 装 / `curl install.sh` / `ELE_LLM_API_KEY=… ele-autopilot`) + 一键复制按钮 + 版本号 (客户端 fetch `/releases/local/latest.txt` 异步填充). `install.sh` URL 用 `location.origin` 拼接, 无 SSR 异步, 整页仍是单文件静态 HTML + 原生 JS, 无框架依赖.
- 顶部路径分发注释去掉 `/help` (该路由由 ele-autopilot 同步删除); AUTOPILOT 实际不再需要接 `/help`.

## [1.5.4] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.5.4 一同发布; 本项目无业务改动. 上游修复 SPA 4 处 `fetch` 漏 `/autotest` 前缀导致 Confluence / Figma / 图片识别 / markdown-research 在 gateway 后 404.

## [1.5.3] - 2026-05-19

### Added

- 首发. Cloudflare Worker `qa`, 唯一对外公网入口 `https://qa.<account-sub>.workers.dev`.
- 路径分发: `/` → landing 双卡片; `/healthz` → ok; `/autotest/*` → AUTOTEST (strip 前缀); 其他 → AUTOPILOT (透传).
- Service bindings: `AUTOPILOT` → `ele-autopilot`, `AUTOTEST` → `ele-autotesting` (两业务 Worker 同步关闭 `workers_dev`).
- 单文件 fetch handler, 无框架依赖, 内嵌 landing HTML.

[1.5.4]: about:blank
[1.5.3]: about:blank
