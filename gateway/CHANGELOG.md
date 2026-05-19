# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

## [1.6.2] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autopilot-local / ele-autotesting v1.6.2 一同发布; 本项目无业务改动. 上游 ele-autotesting 修复 v1.6.0 RR7 SSR 重构遗留的 4 项稳定性缺陷: (1) `react-router.config.ts` 补 `basename: "/autotest"` + `workers/app.ts` 把 gateway strip 掉的 `/autotest` 前缀加回再交 RR handler, 修复客户端 hydration 后所有页面 404 / 闪屏; (2) `routes/data.tsx#handleClearAll` 改走 `services.storage.clearAll()` 抽象, 删除硬编码 `/autotest/api/sync/items` fetch (避免与 basename 修复双前缀); (3) `ThemeProvider` 用 `root.tsx` SSR loader 读 request Cookie 注入 `initialTheme`, cookie 写入从 useEffect 移到 setTheme, 修复每次刷新覆盖用户主题偏好; (4) `vite.config.ts` 用 `define: __APP_VERSION__` 烧入 `package.json#version`, 修复 settings 页版本号兜底显示 v1.5.18 历史值. service binding `AUTOPILOT` & `AUTOTEST` 路径分发、`/autotest/*` strip 转发契约、landing 双卡片 + 安装区 + 版本号 fetch 全部不变.

## [1.6.1] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autopilot-local / ele-autotesting v1.6.1 一同发布; 本项目无业务改动. 上游 ele-autotesting 修复 v1.6.0 SSR 时 Worker 启动期抛 `No such module "node:fs"` (handlebars 主入口被 esbuild 静态 bundle 进 server build 触发), 通过 vite alias 切到 `handlebars/dist/handlebars.js` 浏览器 bundle 解决.

## [1.6.0] - 2026-05-19

### Changed

- lockstep 同步 (minor bump), 与上游 ele-autopilot / ele-autopilot-local / ele-autotesting v1.6.0 一同发布; 本项目无业务改动. 主版本号变更由 ele-autotesting 子项目整体重构驱动 — 从「Vue 3 SPA + pnpm monorepo (core/ui/web/server)」迁移到「React Router v7 framework mode (Cloudflare SSR) + 扁平化单包 + Bun」, 与本 gateway 同栈一致. service binding `AUTOPILOT` & `AUTOTEST` 路径分发、`/autotest/*` strip 转发契约、landing 双卡片 + 安装区 + 版本号 fetch 全部不变, 业务行为对客户端完全等价.

## [1.5.18] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autopilot-local / ele-autotesting v1.5.18 一同发布; 本项目无业务改动. 上游修复 v1.5.17 引入的 `ele-autopilot upgrade` 缺省 base URL 报错, 同时回滚 v1.5.18 早期草案的 `~/.config/ele-autopilot/base` 持久化方案 (用户反馈 wheel 工具不应写 `$XDG_CONFIG_HOME`; 且 BASE 是 CF 账号私有子域无法在 wheel build 期写入): ele-autopilot 渲染的 `install.sh` 在 `uv tool install --reinstall` 成功后改为 unquoted heredoc 把 BASE 字面值烧进 `$HOME/.local/bin/ele-autopilot-upgrade` shim (内容 `#!/usr/bin/env bash` + `set -euo pipefail` + `curl -fsSL "<BASE>/install.sh" \| bash`) 并 `chmod +x`; ele-autopilot-local `autopilot/cli.py` 删 `_config_base_path` / `_read_config_base` / `_resolve_base` / `argparse --base`, `upgrade` (alias `update`) 缩减为 `bash ~/.local/bin/ele-autopilot-upgrade`, shim 缺失则 stderr 提示重跑 `curl -fsSL <gateway>/install.sh | bash` 并 exit 2. landing 双卡片 + 安装区 + 版本号 fetch / service binding `AUTOPILOT` & `AUTOTEST` 路径分发 / `/autotest/*` strip 转发契约不变.

## [1.5.17] - 2026-05-19

### Changed

- `app/routes/home.tsx` landing 安装本地 agent 区块说明文案改为面向非开发用户: 原文 `两步完成. 启动后 agent 监听 0.0.0.0:8000, 等待任务派单.` 改为 `两步完成. 启动后 AutoPilot 工作台会自动连接本地 agent, 即可派单执行任务.`. 移除 `0.0.0.0:8000` 这类 IP / 端口技术术语 (含外层 `<code>` 标签), 避免向非技术使用者暴露监听地址细节; 改以"AutoPilot 工作台自动连接"描述用户视角的连通行为. SSR 输出结构其余不变, install 命令 / 版本号 fetch / service binding / 路径分发行为均无改动.

## [1.5.16] - 2026-05-19

### Fixed

- `app/app.css` landing 安装本地 agent 区块 (`.install` 框) 补齐小屏适配, 修复反馈 "宽度很大, 没做小屏适配": (1) `.install` `<= 640px` 视口 `padding` 由 `24px` 降为 `18px 16px`, 与 `.shell` 小屏 `padding 40px 20px 56px` 协调, 缓解窄屏内框 padding 占比过大; (2) `.install-head` 小屏 `gap` 改 `4px 10px` 并把 `.meta` 的 `margin-left: auto` 重置为 `0` + `width: 100%`, `meta` 不再 wrap 后甩到右侧造成头部两端拉伸的视觉宽; (3) `.steps li` 加 `min-width: 0` 兜底 grid item 默认 `min-width: auto` 在 `.cmd` `white-space: nowrap` 时长 URL (`curl -fsSL https://qa.<account-sub>.workers.dev/install.sh | bash`) 撑破 grid track / 父容器的边缘场景; 同时小屏 `.steps li` `padding` 由 `12px 14px` 降为 `10px 12px`, `.install-desc` `margin-bottom` 由 `16px` 降为 `14px`; (4) 极窄屏 `<= 420px` 加 `.cmd-row { flex-wrap: wrap }` + `.cmd { flex-basis: 100% }` + `.copy { margin-left: auto }`, 命令独占一行, 复制按钮自动落到第二行右侧, 避免两者挤在同一行触发 `.cmd` 内部横向滚动且复制按钮被挤出视区. SSR 输出 HTML 结构不变, 仅 `app/app.css` 改动; service binding / 路径分发 / 安装命令文本 / 版本号 fetch 行为不变.

## [1.5.15] - 2026-05-19

### Changed

- `app/routes/home.tsx` landing 安装本地 agent 区块由三步收敛到两步: 删除原 Step 1 `安装 uv (已装可跳过)` (命令 `curl -LsSf https://astral.sh/uv/install.sh | sh`), Step 2 / 3 顺位上移为 Step 1 (安装 ele-autopilot) / Step 2 (启动); 顶部说明 `三步完成. 启动后 agent 监听 0.0.0.0:8000, 等待任务派单.` 同步改 `两步完成. ...`. 上游 ele-autopilot `install.sh` 已内嵌运行时探测与静默 bootstrap, 用户复制两条命令即可拉起本机 agent. `/autotest/*` strip 转发与 service binding 契约不变.

## [1.5.14] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autotesting v1.5.14 一同发布; 本项目无业务改动. 上游修复: ele-autopilot admin 主表格 ID / 执行统计列在 xs 隐藏 (`responsive: ['sm']`) + 操作列 xs `flex-wrap` + 按钮缩小 (8x8); 已选任务侧抽屉行 xs `flex-wrap` + 文件夹名 `max-w-32` 缩小靠右; 执行步骤 StepLabel 三个 link 按钮 xs `basis-full` 独占第二行. ele-autotesting TestPanel 顶部 header (`内容生成` + 模型选择 + 开始按钮) 与 `生成结果` header xs 改 `flex-col`, InputPanel 标题行内层加 `flex-wrap` 防止 optimization-mode-selector + 别名输入 + PromptTypeSelector 在 360px 屏挤压. gateway landing 自身 mobile 适配 (`@media (max-width: 640px)` + `clamp()` + cmd `overflow-x: auto`) 在 v1.5.7 已就位, `/autotest/*` strip 转发与 service binding 契约不变.

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

[1.6.2]: about:blank
[1.6.1]: about:blank
[1.6.0]: about:blank
[1.5.18]: about:blank
[1.5.17]: about:blank
[1.5.16]: about:blank
[1.5.15]: about:blank
[1.5.14]: about:blank
[1.5.13]: about:blank
[1.5.12]: about:blank
[1.5.11]: about:blank
[1.5.10]: about:blank
[1.5.4]: about:blank
[1.5.3]: about:blank
