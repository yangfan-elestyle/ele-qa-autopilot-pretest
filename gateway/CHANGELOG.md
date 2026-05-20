# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

## [1.9.3] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autotesting v1.9.3 一同发布; 本项目无业务改动. 本轮上游聚焦 AI 主动扫雷 — ele-autopilot 修了"删 folder/task/job 时 R2 截图永久残留"的资源泄漏 (新增 `deleteScreenshotsByJobTaskIds` 前缀 list + batch delete, 三个 DELETE handler 改为 D1 cascade 前先抓 job_task id 链), `mapDbErrorToStatus` 新增对 D1 FOREIGN KEY constraint 的识别映射到 409 Conflict, `parseListParams` 新增 `MAX_RANGE_SPAN = 1000` 上限保护防止前端 `range=[0, 1e9]` 触发全表扫. ele-autotesting 修了 streamProxy SSE 长连接 reader 在客户端断开时未 `cancel()` 导致 Worker 实例堆积半开 fetch 连接的资源泄漏 (改 try/catch/finally + reader.cancel swallow), httpProxy 改 `new Response(fetchResponse.body, ...)` 直接透传上游 ReadableStream 替代 `.text()` 全量缓存 (避免大附件触发 Workers 128MB 单实例 OOM). 顺手抛了 ele-autopilot 的 Ant Tree drag indicator 视觉强化 (brand-500 + 软光晕 + treenode-drop-over 整行 ring), ele-autotesting 的 Toast 进度条 + ds-toast 完整态机, FullscreenDialog 头部改 .ds-modal-head 设计语言. landing 页路由分发 / `/autotest/*` strip / SSR loader / service bindings 行为不变.

[1.9.3]: https://github.com/elestyle-org/ele-qa-autopilot/compare/v1.9.2...v1.9.3

## [1.9.2] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.9.2 一同发布; 本项目无业务改动. 本轮上游聚焦"硌手细节抛光" Phase 2 — AutoTest 工作台 3 个 Manager 弹窗 (模型 / 模板 / 数据) 全部统一到 `.ds-modal-head` 头部 + `.ds-modal-body` 主体 + `.ds-pill-btn` 行内按钮设计语言. ModelManager / TemplateManager / DataManager 的关闭按钮从硬编码 `text-xl ×` 全部改为 `.ds-icon-btn-sm` + svg cross; 弹窗内嵌弹窗 backdrop 从硬编码 `bg-black/60 backdrop-blur-sm` 改 `.theme-mask`; 模板类型 emoji "🎯 / 🔄 / 📝 / ⚡" 全部改为 svg 图标; 模板类型切换从手写双按钮改 `.ds-segmented` 段控件; 模板类型 chip `bg-blue-100 / bg-purple-100` 改 `.ds-chip-info / .ds-chip-brand`; ModelManager 内 `text-purple-600 / text-yellow-600 / text-red-500 / focus:ring-purple-500` 硬编码全部回归 design token; DataManager 拖拽区从 `border-2 border-dashed` 散写改 `.ds-dropzone` (44x44 icon container + brand hover + is-over 实线 brand-500 + 内 3px ring); 导出/导入按钮里的 "📥 📤" emoji 改 svg 下载/上传 icon, 旋转 spinner 改 `.ds-spinner` (4px brand 等宽 spinner). TextDiff 组件完全重写视觉: 字号从 16px (1rem) 改 12.5px mono, 行高 1.65; diff stats 改 `.ds-diff-stat--added/--removed/--unchanged` token pill, 替代原 `theme-textdiff-stat-*` 硬编码; fragment 从内嵌色背景 改 `.ds-diff-fragment--added/--removed` 12-16% 半透明背景 + 1px 22-28% 边线 + removed 自带删除线 (1.5px 45% 红色); 删掉 90 行 scoped style. ele-autotesting theme.css 新增 `.ds-modal-head` + `.ds-modal-body` + `.ds-modal-title*` + `.ds-modal-section-title*` + `.ds-pill-btn` + `--primary/--ghost/--success/--warning/--danger` 5 变体 + `.ds-manager-item*` + `.ds-dropzone*` + `.ds-spinner` + `.ds-diff-shell/-header/-stat/-body/-fragment` 共 30+ 组 utility, 全部 design token, 与 ele-autopilot 视觉契约对仗. landing 页路由分发 / `/autotest/*` strip / SSR loader / service bindings 行为不变.

## [1.9.1] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autotesting v1.9.1 一同发布; 本项目无业务改动. 本轮上游聚焦"硌手细节抛光" Phase 1: ele-autopilot task 列表行的 5 个图标按钮 (派单 / 预览 / 任务链 / 编辑 / 删除) 收敛为 派单 + 预览 + 更多菜单 三按钮, 删除走 Popconfirm 防误触, 表格行加 left brand-accent bar hover 反馈; globals.css 新增 `.ds-row-actions` + `.ds-row-action-btn*` (30x30 圆角触达点, primary 变体 hover 切 brand 色 + 1px ring). ele-autotesting OutputDisplayCore 工具栏: 手工组装的"渲染 / 原文 / 对比" 按钮组改 `.ds-segmented` 段控件, 右侧 icon button 改 `.ds-icon-btn-sm`, 整条工具栏背景由 surface-subtle 改 ds-panel-head 同款渐变, 删除 `bg-gray-50` / `text-gray-500` / `bg-blue-500` 等硬编码灰蓝; reasoning header 重写为 ds-reasoning 子系统 (brand-tint 软背景 + chevron 旋转 + streaming pulse dot); TestPanel "添加数据源" 标签从 `bg-blue-100 text-blue-800` 改 `.ds-source-chip--template` / `--history` 双变体 + 类型 uppercase 前缀, 添加按钮改虚线 dashed pill + 展开态实线 brand ring, 下拉菜单标记圆点改 `.ds-add-source-menu-marker` + 3px soft glow; HistoryDrawer 紫色 tag 改 `.ds-chip-brand`, blue-600 链接改 `.ds-text-link` (brand 色 + underline), 删除按钮改 `.ds-text-link-danger` (hover danger-soft + ring), 版本行重写为 `.ds-history-version-row` + V-tag 等宽方块 + pill 按钮组, 空态从 emoji "📜" 改 svg 圆形 icon + 标题 + 解释 hint 三层; Modal 关闭按钮从 stone/slate 硬编码颜色改 `.ds-icon-btn-sm`. ele-autotesting theme.css 新增 `.ds-segmented*` / `.ds-output-toolbar` / `.ds-output-placeholder` / `.ds-reasoning*` / `.ds-source-chip*` / `.ds-add-source-btn` / `.ds-add-source-menu*` / `.ds-panel-subtitle-strong` / `.ds-text-link*` / `.ds-drawer-title` / `.ds-history-*` 共 10+ 组 utility, 全部用 design token, 与 ele-autopilot 对仗. landing 页路由分发 / `/autotest/*` strip / SSR loader / service bindings 行为不变.

## [1.9.0] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autotesting v1.9.0 一同发布; 本项目无业务改动. 上游 v1.9.0 是一次工作台 UX 整体提级: ele-autopilot globals.css 新增 8 组工作台级 utility (`.ds-kbd` / `.ds-page-header*` / `.ds-section*` / `.ds-segmented*` / `.ds-task-row-text` / `.ds-task-row-meta`), task-content 主表格删除 ID 列改用任务行 meta 第二行 + 4 段状态筛选 segmented + 4 列 KPI; folder-sider head 重构为 icon-square + mono meta; preview workspace 任务 summary 加 breadcrumb + 展开/收起; task-modal 批量语法从 placeholder 改可折叠帮助卡; AppHeader 加 AutoPilot env-pill. ele-autotesting theme.css 同步引入 `.ds-panel*` / `.ds-toolbar-divider` / `.ds-eyebrow` / `.ds-icon-btn-sm` / `.ds-workspace-row` / `.ds-kbd`, InputPanel / PromptPanel / TestPanel 三块统一引入 `ds-panel-head` 视觉层级, MainLayout brand 改 `<a href="/">` link 形态 + 加 AutoTest env-pill, App.vue 顶栏 7 个 action 按钮重排为 "历史 / 模板 / 模型 | 数据 / 主题 / 首页" 两组. landing 页路由分发 / `/autotest/*` strip / SSR loader / service bindings 行为不变.

## [1.8.6] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autotesting v1.8.6 一同发布; 本项目无业务改动. 上游 ele-autopilot globals.css 新增 `.ds-num-square` (索引方块) / `.ds-banner` (行内提示横幅 4 变体) / `.ds-dnd-item` (拖拽卡片 3 态), selected-tasks-drawer 与 preview workspace job-detail-panel 抽出全部内联视觉; ele-autotesting theme.css 同步引入等价 utility 类保持设计契约对齐. landing 页路由分发 / `/autotest/*` strip / SSR loader / service bindings 行为不变.

## [1.8.5] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autopilot v1.8.5 一同发布; 本项目无业务改动. 上游: globals.css 提取通用 `.ds-skeleton` shimmer 骨架与 `.ds-job-card` 执行历史卡片状态机 (default / hover / focus-visible / selected 4 态 token 化), ConsoleBootSkeleton / PreviewBootSkeleton 删除组件内 `<style>` 注入, preview workspace 执行历史卡片 button inline style 全部抽出. landing 页路由分发 / `/autotest/*` strip / SSR loader / service bindings 行为不变.

## [1.8.4] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autotesting v1.8.4 一同发布; 本项目无业务改动. 上游 ele-autopilot preview workspace 抽出 inline `tonemap` 改用 `ds-chip` token 类; ele-autotesting 同步引入与 ele-autopilot 等价的 `.ds-status-pill` / `.ds-chip` / `.ds-vrule` / `.ds-brand-mark` / `.ds-status-dot-pulse` utility 类, MainLayout 顶栏 brand mark / Studio 就绪徽章抽出 inline 样式, AutoTest 工作台顶栏 6 个 actions 加 `.ds-vrule` 分组. landing 页路由分发 / `/autotest/*` strip / SSR loader / service bindings 行为不变.

## [1.8.3] - 2026-05-20

### Changed

- `app/app.css` 重写: 品牌色从 GitHub 蓝 (`#0969da`) 迁移至 indigo (`--ds-brand-600 #4f46e5`), 与下游 ele-autopilot / ele-autotesting 视觉语言完全对齐, 消除三产品之间的颜色断层. 引入 `--ds-brand-{50..800}` 完整色阶 + `--motion-{fast/base/slow}` + 4 个 ease 缓动函数 + `--shadow-brand` 品牌阴影 + `--focus-ring` 统一焦点环, 全局 transition 时长与曲线从 4 套零散 (0.15s / 0.18s / 0.22s / 0.25s) 收敛到 3 档 token. dark 模式 token 与下游同步.
- `app/routes/home.tsx` landing 视觉提级:
  - `meta` 加 `theme-color #4f46e5`; title / description 扩写为「QA AutoPilot · 任务编排与 AI 测试用例工作台」.
  - brand 区从单 32px logo + "QA AutoPilot" 升级到 mark + 主名 + uppercase `Console` 副标识.
  - hero 加 `.hero-eyebrow` 胶囊「Test Orchestration · AI 用例生成」, accent-soft 软底 + accent-ring inset + dot indicator, 替代裸 h1 直接落下的草稿感.
  - hero `<em>` 渐变从纯 indigo→紫 改为 indigo→violet→cyan 三色渐变, 与下游品牌副色呼应.
  - 顶栏 status pill 从 `运行中` 改为 `服务运行中`, dot pulse 动画时长延长到 2.4s, 与 ele-autopilot AppHeader 一致.
- `app/app.css` 视觉细节: 整页加 subtle grid 纹理 (`linear-gradient` 56px 网格 + radial mask), hero ambient gradient 双色 (indigo + sky) 替代单色, cards 加 `::before` 顶部 1px brand-soft 渐变 highlight (hover 时显现), card-icon 加 `linear-gradient(soft→soft-strong)` + accent-ring inset 替代单色软底, install 区顶部加 1px brand-soft 渐变 accent line, step-num 用 accent-soft 软底 + accent-ring 替代灰底, copy 按钮 hover 时切 accent-soft 软底 + accent 文字.

## [1.8.2] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.8.2 一同发布; 本项目无业务改动. 上游 ele-autotesting AutoTest 前端工作台 UX 提级 (App.vue 完整布局骨架 / OptimizationModeSelector 段控件含 icon + label + hint / PromptPanel 标题 brand dot + 版本段控件 + 独立 iterate 按钮 / MainLayout 加 Studio 就绪状态徽章). gateway landing 页 / 路径分发 / `/autotest/*` strip 转发 / SSR loader / service binding (AUTOPILOT, AUTOTEST) 行为不变.

## [1.8.1] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autopilot v1.8.1 一同发布; 本项目无业务改动. 上游 ele-autopilot 后台工作台 UX 提级 (新增 MetricTile / EmptyState / TableSkeleton 三件套, 任务列表加 5 列 KPI strip 跨任务聚合统计, 执行概要 5 KPI + 进度条, 执行历史卡片加状态色 vertical bar + 相对时间, 首屏从单 Spin 升级到完整布局骨架, preview 空态产品化). gateway landing 页 / 路径分发 / `/autotest/*` strip / SSR loader / service binding (AUTOPILOT, AUTOTEST) / `version` fetch / 友情链接卡片 / 安装区 / 返回首页 button 契约不变.

## [1.8.0] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.8.0 一同发布; 本项目无业务改动. 上游 ele-autotesting AutoTest 前端工作台 UI 整体重塑, 对齐 v1.7.0 ele-autopilot 设计语言 (CSS variables design tokens / Inter 字体 / indigo 主色 / MainLayout header 重写 / ActionButton 加 SVG slot / App.vue 5 个 ActionButton emoji 全改 Lucide-style SVG / Modal 加 size prop / Toast token 化 4 种状态 / theme-color `#0969da → #4f46e5`). gateway landing 页 / 路径分发 / `/autotest/*` strip 转发 / SSR loader / service binding (AUTOPILOT, AUTOTEST) 行为不变.

## [1.7.0] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autopilot v1.7.0 一同发布; 本项目无业务改动. 上游 ele-autopilot 后台工作台 UI 整体重塑 (设计 tokens / Inter 字体 / indigo 主色 / 顶部品牌栏 / 卡片化任务列表 / preview 页重组 / 状态徽章统一 / Modal 与 Drawer 精修), gateway landing 页 (`app/routes/home.tsx`) 与路径分发逻辑 (`/autotest` strip / `/index.html` 301 / `/` SSR / 其他透传) / SSR loader / service binding (AUTOPILOT, AUTOTEST) 行为不变.

## [1.6.9] - 2026-05-19

### Removed

- lockstep 同步, 与上游 ele-autotesting v1.6.9 一同发布; 本项目无业务改动. 上游回滚 `.github/workflows/autotesting.yml` 到 v1.5.2 (commit b213aa8) 状态, 撤销 v1.6.3 / v1.6.6 / v1.6.8 三轮 cache 优化全部改动: 删 buildx layer cache 三步 (`Restore buildx layer cache` / `Warm buildkit cache` / `Persist buildx layer cache`) + 删 `docker/setup-buildx-action@v3` `install: true` 选项 + 删 `on.push.branches: [main]` trigger + 删 `actions/checkout@v5` `fetch-depth: 0` + 删 markitdown image URI cache 四步 (`Detect markitdown changes since last release tag` / `Cache last-deployed markitdown image URI` / `Patch wrangler.jsonc to reuse cached image` / `Capture deployed image URI`) + 删各步骤的 `if: startsWith(github.ref, 'refs/tags/')` / `if: steps.patch.outputs.patched != 'true'` 条件. 还原后 autotesting workflow 简化为 66 行原始版本: checkout → verify tag → setup pnpm/node → install → build:cf → setup-buildx → apply D1 migrations → wrangler deploy. 每次 release tag push 完整 cold build markitdown container + push image, 耗时回到 ~130-200 s 区间 (cache 优化前的 baseline). SSR landing / service binding / 路径分发 / `version` fetch / 友情链接卡片 / 安装区 / 返回首页 button 契约不变.

## [1.6.8] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.6.8 一同发布; 本项目无业务改动. 本版用途: 修 v1.6.7 引入的 autotesting Capture step condition bug + 去掉过度设计的 main trigger, 重新 seed image URI cache. v1.6.7 把 Capture step 的 condition 写成 `steps.markitdown.outputs.changed != 'false'`, markitdown 未改但 image URI cache 首次 miss 走 rebuild path 时此 step 被错误 skipped, URI 没写入 `/tmp/markitdown-image-uri.txt`, actions/cache post-step 找不到 path 报 `Path Validation Error` 警告但不报错 (workflow 仍 success), 实际 cache 是空的, 下次发版照样 cache miss. 本版改为对齐 buildx 几步的 `steps.patch.outputs.patched != 'true'` 判断 (rebuild path 走过就 capture, 与 changed 状态解耦). 同时去掉 v1.6.6 引入的 `on.push.branches: [main]` (image URI cache 是主线后, buildx layer cache 仅在 markitdown 真改 + rebuild 时有边际价值, main trigger 每次 push main 后台跑 ~80s 收益过低, 过度设计). 期望 v1.6.8 仍 rebuild path (~130-160 s) 但 Capture 正常写 URI 到 cache, v1.6.9 起未改 markitdown 的 lockstep 占位发版自动走 reuse path (~30-50 s). SSR landing / service binding / 路径分发 / `version` fetch / 友情链接卡片 / 安装区 / 返回首页 button 契约不变.

## [1.6.7] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.6.7 一同发布; 本项目无业务改动. 本版用途: 触发 autotesting workflow `4df99e9` (`fix(ci/autotesting): skip container build/push when markitdown unchanged`) 的 rebuild path 跑一次, 让 wrangler deploy 把 markitdown image push 到 Cloudflare registry 后, autotesting workflow 的 `Capture deployed image URI` step 从 deploy log grep 出 image tag, 用 `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}` 拼成 `registry.cloudflare.com/<account>/ele-autotesting-markitdowncontainer:<tag>` 写入 actions/cache (key `markitdown-image-uri-<hashFiles('ele-autotesting/containers/markitdown/**')>`). 下次 (v1.6.8 起) lockstep 占位发版若 markitdown/ 未改动, autotesting workflow 通过 cache hit 自动 jq patch `packages/server/wrangler.jsonc` 的 `containers[0].image` 字段为该 URI, wrangler deploy 看到 URI 跳过 docker build + image push, autotesting tag run 从 ~130s 降到 ~30-50s. SSR landing / service binding / 路径分发 / `version` fetch / 友情链接卡片 / 安装区 / 返回首页 button 契约不变.

## [1.6.6] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.6.6 一同发布; 本项目无业务改动. 本版主要触发用途: 验证 `d72763e` (`fix(ci/autotesting): share buildx cache via main branch scope`) 在本次 tag push 流程下生效 — 上次 main push 触发的 autotesting workflow run 26101456149 已把 386 MB buildx-markitdown- layer cache 写入 `refs/heads/main` scope (2 min 完成), 本次 v1.6.6 tag push 期望 autotesting workflow Restore step 通过 `restore-keys: buildx-markitdown-` 兜底 fallback 命中 main scope cache, Warm 喂进 buildkitd, wrangler 跑 markitdown docker build 时按 instruction hash 命中已存在 layer, 跳过 apt-get install ffmpeg / pip install markitdown[all] (含 onnxruntime / pandas / lxml 等大依赖). 对照 v1.6.5 autotesting run 卡在 cold markitdown build ~4 min, v1.6.6 期望 ~1-2 min. SSR landing 输出 / service binding `AUTOPILOT` & `AUTOTEST` 路径分发 / `/autotest/*` strip 转发 / `version` fetch / 友情链接卡片 / 安装区契约不变.

## [1.6.5] - 2026-05-19

### Changed

- 友情链接重做 (用户反馈"位置太小, 不显眼; 还要点进去看信息"). (a) host 前缀 `agentic-loop-ui` → `harness`: `app/routes/home.tsx` `deriveFriendLink(origin)` 替换的首段 label 改为 `harness`, 实际访问 `ele-qa-autopilot.<domain>` 时友链指向 `https://harness.<domain>`. (b) 入口位置从 v1.6.4 footer 末行小字 (`.footer-friend`, `font-size: 11px` + `flex-basis: 100%` 独占一行) 提升为与 AutoPilot / AutoTest 并列的第三张卡片入口: footer 移除条件渲染 `<p className="footer-friend">`, `<section className="cards">` 末追加第三张 `<a className="card">` (条件 `loaderData.friendLink` 渲染), `target="_blank"` + `rel="noopener noreferrer"`, 含 external-link svg icon (三段 path: `M15 3h6v6` / `m10 14 11-11` / `M18 13v6a2 2 0 0 1-2 2H5...`) + `<h2>Harness <span className="card-tag">友情链接</span></h2>` + 描述 "当前服务部分能力来自 harness, 点击跳转查看详情." + `<span className="card-arrow">前往 harness</span>`. (c) `app/app.css` `.cards` `grid-template-columns: 1fr 1fr` → `repeat(3, 1fr)`, 新增 `@media (max-width: 900px) { .cards { grid-template-columns: 1fr 1fr } }` 中屏 fallback (harness 落到第二行第一格, 与主卡同宽), `<= 640px` 仍 1 列; 新增 `.card-tag` (`font-size: 11px`, `padding: 2px 8px`, `background: var(--bg-subtle)`, `color: var(--fg-subtle)`, `border: 1px solid var(--border)`, `border-radius: var(--r-full)`, `letter-spacing: 0` — 嵌在 `.card h2` 内, 把 "Harness" 主标题与 "友情链接" 标签视觉区分, 不抢主标题层级); 删除 v1.6.4 引入的 `.footer-friend` 样式块. (d) `deriveFriendLink` 推导规则 / `null` 短路条件 (host 不含 `.` / IPv4 `/^\d+\.\d+\.\d+\.\d+(:\d+)?$/`) / SSR loader 注入路径不变. service binding `AUTOPILOT` & `AUTOTEST` 路径分发 / `/autotest/*` strip 转发 / `version` fetch 行为不变.

## [1.6.4] - 2026-05-19

### Added

- `app/routes/home.tsx` landing footer 加 `agentic-loop-ui` 友情链接 (上游站点, 当前服务部分能力来自该站). loader 新增 `deriveFriendLink(origin)`: 用 `new URL(request.url).origin` 取当前 host, 把首个 `.` 之前的 label 替换为 `agentic-loop-ui`, 保留协议 + 剩余 host (含端口与后续 label); host 不含 `.` (e.g. `localhost:5173`) 或匹配 IPv4 `/^\d+\.\d+\.\d+\.\d+(:\d+)?$/` 时返回 `null`, 渲染时短路不出友链, 避免开发态生成 `agentic-loop-ui.0.0.1:5173` 这种错链. 推导结果与 `version` / `origin` 一起经 SSR loader 注入, 不依赖 hydration; 实际访问 host 为 `ele-qa-autopilot.<domain>` 时, 渲染指向 `https://agentic-loop-ui.<domain>` (后缀实时跟随当前域名, 不写死). footer 在原 `.footer-version` + `.footer-links` 后插入条件渲染 `<p className="footer-friend">`, 文案 `友情链接 · agentic-loop-ui`, `<a>` 带 `target="_blank"` + `rel="noopener noreferrer"`.
- `app/app.css` 新增 `.footer-friend` 样式: `flex-basis: 100%` 配合既有 `.footer` `flex-wrap: wrap` 让友链独占第二行 (顶行 `.footer-version` / `.footer-links` 仍 `space-between` 不受影响), 字号 `11px` (比 footer 主行 `12px` 再低一级), 颜色 `var(--fg-subtle)`, `gap: 8px` + `margin-top: 4px`; `<a>` underline + `text-decoration-color: var(--border)` + `text-underline-offset: 2px`, hover 切到 `var(--accent)`. 整体压低视觉权重, 不与 `.cards` 双卡片入口或 `.install` 安装区竞争. service binding `AUTOPILOT` & `AUTOTEST` 路径分发 / `/autotest/*` strip 转发 / `version` fetch 行为不变.

## [1.6.3] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autopilot-local / ele-autotesting v1.6.3 一同发布; 本项目无业务改动. 上游变化: `.github/workflows/autotesting.yml` 接入 buildx layer cache 跨 workflow run 持久化, `setup-buildx-action@v3` 加 `install: true` 让 `docker build` shim 到 `docker buildx build` (wrangler 4 内部走 `docker build` 推 Cloudflare Containers, 不传 `--cache-from` / `--cache-to`, 必须靠 shim 介入); 新增 `Restore buildx layer cache` (`actions/cache@v4`, key `buildx-markitdown-${{ hashFiles('ele-autotesting/containers/markitdown/**') }}`, restore-keys 兜底) / `Warm buildkit cache` (deploy 前 `docker buildx build --cache-from type=local --load` 把磁盘 cache 喂进 buildkitd) / `Persist buildx layer cache` (deploy 后 `if: always()` 跑 `docker buildx build --cache-to type=local,mode=max --output type=cacheonly` 落盘喂下次 run) 三个步骤, 削掉 `MarkitdownContainer` 镜像每次 deploy 重跑 `apt-get install` / `pip install` 的耗时. landing 双卡片 + 安装区 + 版本号 fetch / service binding `AUTOPILOT` & `AUTOTEST` 路径分发 / `/autotest/*` strip 转发契约不变.

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
