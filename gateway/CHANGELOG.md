# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

## [1.5.13] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot v1.5.13 一同发布; 本项目无业务改动. 上游修复: ele-autopilot admin Agent 配置 Popover (固定 `w-80` 320px → `w-[min(20rem,calc(100vw-3rem))]`) 与 preview 步骤截图 `<Image>` (`max-h-64` 加 `max-w-full`) 在 360px 屏的两处残留横向溢出收尾. gateway landing 自身 mobile 适配 (`@media (max-width: 640px)` + `clamp()` + cmd `overflow-x: auto`) 在 v1.5.7 已就位, `/autotest/*` strip 转发与 service binding 契约不变.

## [1.5.12] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot v1.5.12 一同发布; 本项目无业务改动. 上游修复: ele-autopilot admin (`/autopilot`) 与执行历史页 (`/autopilot/preview/:taskId`) 小屏 (< 768px) 阅读阻塞 — 固定宽 `<Layout.Sider>` 改为 `<Drawer>` 抽屉, 主内容头部塞 hamburger 触发按钮; Table 加 `scroll={{ x: 'max-content' }}`, Descriptions column 改 `{ xs: 1, sm: 2 }`, Header `flex-wrap`. gateway landing 自身 mobile 适配 (`@media (max-width: 640px)` + `clamp()` + cmd `overflow-x: auto`) 在 v1.5.7 已就位, 本次不动. autotest SPA 经 Tailwind `sm:`/`lg:` 已满足"无障碍信息预览", 本次不动.

## [1.5.11] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot v1.5.11 一同发布; 本项目无业务改动. 上游修复: `public/favicon.ico` 由单 entry (16×16, 716 B) 改为 multi-size 16/32/48 (≈ 7.4 KB), 修复 ImageMagick / Pillow ICO writer 误用导致只保留首个 entry 的问题. 浏览器 tab / OS 任务栏 / Win 桌面快捷方式可分别按 DPI 命中合适尺寸, 旧版在 Retina 屏上 favicon.ico 会被放大模糊.

## [1.5.10] - 2026-05-19

### Changed

- landing 文案重写, 删除自我感动型与基础设施暴露型表述: `<title>` 从 `QA AutoPilot · 一个域名, 两个工具` 简化为 `QA AutoPilot`; meta description 从 `... 由 Cloudflare Workers 驱动` 改为 `任务编排与 AI 测试用例工作台`; hero H1 从 `一个域名, 两个工具.` 改写为 `QA 工作流, 一站做完.`; 子卡片描述去掉 `/autopilot` `/autotest` 路径裸标签, 卡片文案聚焦"做什么"; 安装区脚注移除 `安装脚本由 ele-autopilot Worker 动态生成, 产物存于 Cloudflare R2 ele-autopilot-releases`; footer 整条 `powered by Cloudflare Workers · qa gateway` 移除, 留版本号 pill + 导航; 状态徽章从 `operational` 改为 `运行中`; 顶部 eyebrow `qa gateway` 删除.
- 品牌 logo 落地为图片: `.brand-mark` 不再是 CSS 渐变 `Q` 字, 而是 `<img src="/favicon.svg">` 真实矢量 logo (跟 favicon / apple-touch-icon / PWA 图标共用同一品牌资产), 移除自带渐变背景与字体定义.
- 版本号显示位置: 从 install 区 `.install-head .ver` 移到 footer 左侧 `.footer-version`, 全站只此一处暴露版本.

### Added

- HTML `<head>` 加 `link rel=icon|alternate icon|apple-touch-icon|mask-icon|manifest` 五件套, 配合 ele-autopilot 提供的 PWA icon set (gateway public/ 仍保持空, 静态资源经 service binding 透传).
- `<meta name=theme-color>` 浅 / 深双 media query (`#0969da` / `#0d1117`), 对应移动端浏览器 chrome 颜色.

## [1.5.9] - 2026-05-19

### Fixed

- `app/app.css` 全无 `prefers-reduced-motion` 兜底: 用户系统偏好减少动画 (macOS "减弱动态效果" / iOS "减弱动态效果" / Windows "显示动画") 时, status pill `pulse` 2s 周期动画 + card hover `translateY(-2px)` + 各 `transition` 仍会触发, 是真实可访问性问题. 加 `@media (prefers-reduced-motion: reduce)` 全局缩短 animation / transition 至 0.01ms, 并禁用 card hover translate.
- `app/root.tsx` `<html lang="zh">` 不精确, 简体中文应 `zh-CN` (BCP 47). 影响 AT 选择正确的中文语音合成与浏览器换行规则.

## [1.5.8] - 2026-05-19

### Fixed

- `app/routes/home.tsx` SSR 期 install 命令显示占位符 `https://qa.<host>` 直到 hydration 完成才被 `useEffect` 改为真实 URL: 爬虫 / SEO / 慢网 / JS 禁用用户首屏看到的是错误命令. loader 现用 `new URL(request.url).origin` 在服务端直接拿真实 gateway origin 注入, 客户端 hydrate 后直接用 `loaderData.origin`, 不再有占位符闪烁. 同时删除冗余 `INSTALL_PLACEHOLDER` 常量与 `useState<origin>` / `setOrigin(window.location.origin)` 客户端写回逻辑.
- `workers/app.ts` `/index.html` 之前与 `/` 一起进 RR `requestHandler`, 但 RR 路由表只有 `index("routes/home.tsx")` 对应 `/`, `/index.html` 进 RR 后无 match → 渲染 ErrorBoundary 404. 改为 worker 层 301 重定向 `/index.html` → `/`, 路径规范化, RR 仅承担真实 `/`.
- `app/routes/home.tsx` `navigator.clipboard.writeText(...).then(...)` 缺 `.catch()`, 权限被拒会产生 unhandled promise rejection. 补 `.catch(() => {})`.
- `app/routes/home.tsx` loader 内 `env.AUTOPILOT.fetch(new Request(url, { cf: { cacheTtl: 60 } }))` 的 `cf` 选项无效字段: service binding 直接调用下游 Worker, 不经 CDN 边缘, `cf.cacheTtl` 不生效. 删除避免误导. 版本号短 TTL 缓存由下游 `ele-autopilot` `releases.local.$.tsx` 通过 `Cache-Control: public, max-age=60` 控制.

### Changed

- 版本号正则 `/^[0-9][0-9a-zA-Z.\-+]{0,31}$/` 抽成模块级常量 `VERSION_RE`, loader 与客户端兜底 fetch 复用.
- `AGENTS.md` 路径分发表拆 `/` 与 `/index.html` 两行, 显式标注 301 redirect.

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

[1.5.12]: about:blank
[1.5.11]: about:blank
[1.5.10]: about:blank
[1.5.4]: about:blank
[1.5.3]: about:blank
