# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

## [1.6.6] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.6.6 一同发布; 本项目无业务改动. 本版主要触发用途: 验证上版 (v1.6.5 deploy 后) push 到 main 的 `d72763e` (`fix(ci/autotesting): share buildx cache via main branch scope`) 是否让本次 tag push 流程下 autotesting workflow 通过 `restore-keys: buildx-markitdown-` 兜底 fallback 命中已写入 `refs/heads/main` scope 的 386 MB buildx layer cache (run 26101456149, 2 min 完成), wrangler 跑 markitdown docker build 时跳过 apt-get install ffmpeg / pip install markitdown[all] (含 onnxruntime / pandas / lxml 等大依赖). 对照 v1.6.5 autotesting cold build ~4 min, v1.6.6 期望 ~1-2 min. D1 / R2 / API / Worker 绑定 / `install.sh` 渲染 / R2 wheel 拉取 / SHA256 校验 / `task-content.tsx` 返回首页按钮行为不变.

## [1.6.5] - 2026-05-19

### Added

- `app/admin/_components/task-content.tsx` 任务列表 topbar 加返回首页按钮 (用户反馈"两个子工程没有返回按钮, 返回不回来"): 现有 `<Space className="w-full justify-between" wrap>` 内左侧 `<Space wrap>` 最前面 (移动菜单 `MenuOutlined` / 新建任务 `PlusOutlined` 之前) 插入 `<Button icon={<HomeOutlined />} href="/" aria-label="返回首页">返回首页</Button>`, `href="/"` 直接走浏览器跳转 (不经 RR7 内部路由) 由 gateway 接管返回 landing. `@ant-design/icons` import 按字母序加 `HomeOutlined`. preview 页 (`autopilot.preview.$taskId.tsx` 已自带任务详情 Header) 暂不加 — 主迷失点是任务列表; 后续若需扩散到 preview 再独立加.

### Changed

- lockstep 同步, 与上游 gateway v1.6.5 一同发布. 上游 gateway landing 友情链接重做: host 前缀 `agentic-loop-ui` → `harness`, 入口位置从 v1.6.4 footer 末行小字 (`.footer-friend`) 提升为与 AutoPilot / AutoTest 并列的第三张卡片 (`.cards` `grid-template-columns: repeat(3, 1fr)` + `<= 900px` 2 列 fallback + `<= 640px` 1 列, 新增 `.card-tag` 11px subtle 圆角小标签嵌在 `<h2>`, 删 `.footer-friend`). D1 / R2 / API / Worker 绑定 / `install.sh` 渲染 / R2 wheel 拉取 / SHA256 校验行为不变.

## [1.6.4] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway v1.6.4 一同发布; 本项目无业务改动. 上游 gateway landing footer 新增动态后缀友情链接 `agentic-loop-ui`: `app/routes/home.tsx` loader 加 `deriveFriendLink(origin)` 用 `new URL(request.url).origin` 取当前 host, 把首个 `.` 之前的 label 替换为 `agentic-loop-ui` 保留剩余 host (含端口与后续 label); host 不含 `.` (e.g. `localhost:5173`) 或匹配 IPv4 `/^\d+\.\d+\.\d+\.\d+(:\d+)?$/` 时返回 `null` 短路不渲染, 避免开发态错链; 配 `app/app.css` `.footer-friend` (`flex-basis: 100%` 配合 `.footer flex-wrap: wrap` 独占第二行 + `font-size: 11px` 低于主行 12px + `color: var(--fg-subtle)` + `<a>` `text-decoration-color: var(--border)` underline) 渲染在 footer 末行, `target="_blank"` + `rel="noopener noreferrer"`. 实际访问 host 为 `ele-qa-autopilot.<domain>` 时友链指向 `https://agentic-loop-ui.<domain>` (后缀实时跟随当前域名, 不写死). D1 / R2 / API / Worker 绑定 / `install.sh` 渲染 / R2 wheel 拉取 / SHA256 校验行为不变.

## [1.6.3] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot-local / ele-autotesting v1.6.3 一同发布; 本项目无业务改动. 上游变化: `.github/workflows/autotesting.yml` (隔壁 ele-autotesting 子项目对应的 workflow) 接入 buildx layer cache 跨 workflow run 持久化 — `setup-buildx-action@v3` 加 `install: true` 让 `docker build` shim 到 `docker buildx build`, 新增 `Restore` (`actions/cache@v4`, key 基于 markitdown 目录 hashFiles + restore-keys 兜底) / `Warm` (deploy 前 `--cache-from type=local --load` 喂 buildkitd) / `Persist` (deploy 后 `if: always()` + `--cache-to type=local,mode=max --output type=cacheonly` 落盘) 三个步骤, 削掉 `MarkitdownContainer` 镜像每次 deploy 重跑 `apt-get install` / `pip install` 的耗时. D1 / R2 / API / Worker 绑定无改动, `install.sh` 渲染 / R2 wheel 拉取 / SHA256 校验行为不变.

## [1.5.18] - 2026-05-19

### Fixed

- `app/routes/install-script.tsx` 渲染的 `install.sh` 替换 v1.5.18 早期草案的 `~/.config/ele-autopilot/base` 写入: `uv tool install --reinstall "$tmp_wheel"` 成功后改为生成升级 shim — `shim="$HOME/.local/bin/$BIN_NAME-upgrade"; mkdir -p "$(dirname "$shim")"; cat > "$shim" <<UPGRADE_EOF` (unquoted heredoc, `$BASE` 字面展开为 `https://qa.<account-sub>.workers.dev`) 写入 `#!/usr/bin/env bash` + `set -euo pipefail` + `curl -fsSL "<BASE>/install.sh" \| bash`, 末尾 `chmod +x "$shim"`. 设计权衡: BASE 是 CF 账号私有子域, wheel 是 GitHub Actions 一次构建上传 R2 的公共构件, 编译期(wheel build)写入架构上不可能; `~/.config` 方案让一个本应无运行时副作用的 wheel 工具携带"安装期配置文件", 语义错位 (用户原话: 不符合预期); 改为"装配期硬编码 shim" — BASE 在 install.sh 用户机执行瞬间烧入 shim 字面常量, wheel 本身仍纯净, `~/.config` 不被写, shim 与 uv tool 装的 `ele-autopilot` 同目录 (`~/.local/bin/`) 用户可手 `cat` 验证 BASE. 上游 `ele-autopilot-local` 同版本同步删 cli base 解析链与 `--base` 参数, `ele-autopilot upgrade` (alias `update`) 缩减为 `bash ~/.local/bin/ele-autopilot-upgrade`, shim 缺失则 stderr 指引重跑 `curl -fsSL <gateway>/install.sh | bash`. SSR loader / `renderScript(base)` 模板结构、`Content-Type: text/x-shellscript`、`Cache-Control: public, max-age=60`、`ensure_runtime`、`/releases/local/latest.txt` 解析、R2 wheel 下载 + SHA256 校验 + `--retry 3` 行为不变. D1 / R2 / API / Worker 绑定无改动.

## [1.5.17] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot-local v1.5.17 一同发布; 本项目无业务改动. 上游变化: (a) `ele-autopilot-local` `autopilot/cli.py` 接入 `argparse`, 修复 `ele-autopilot --help` 此前被 `uvicorn.run` 吞掉的失效, 新增 `--help` / `-h`, `--version` / `-V` (输出 `ele-autopilot 1.5.17`), `upgrade` (alias `update`) 子命令复用 `install.sh` 重装 (base URL 优先级 `--base` > 环境变量 `ELE_AUTOPILOT_BASE`, 缺失时 stderr 提示并 exit 2); 默认无参数仍 `uvicorn.run("autopilot.cli:app", host="0.0.0.0", port=8000)`, 完全向后兼容. (b) gateway landing 安装本地 agent 区块说明文案改为面向非开发用户 (去掉 `0.0.0.0:8000` 监听地址与外层 `<code>` 标签, 改为 `两步完成. 启动后 AutoPilot 工作台会自动连接本地 agent, 即可派单执行任务.`). D1 / R2 / API / Worker 绑定无改动, `install.sh` 渲染 / R2 wheel 拉取 / SHA256 校验行为不变.

## [1.5.16] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway v1.5.16 一同发布; 本项目无业务改动. 上游修复: gateway landing `.install` 框小屏适配 (`@media (max-width: 640px)` `padding 18px 16px` + `.install-head` `meta` 取消 `margin-left: auto` 改 `width: 100%`, `.steps li` 加 `min-width: 0` 兜底 grid item 与 `.cmd` `nowrap` 长 URL 撑破场景, 同时 `padding 10px 12px`; `@media (max-width: 420px)` 极窄屏 `.cmd-row` `flex-wrap: wrap` + `.cmd flex-basis: 100%` + `.copy margin-left: auto` 让命令独占一行、复制按钮在第二行右侧). D1 / R2 / API / Worker 绑定无改动, `install.sh` 渲染 / R2 wheel 拉取 / SHA256 校验行为不变.

## [1.5.15] - 2026-05-19

### Changed

- `app/routes/install-script.tsx` 渲染的 `install.sh` 加 `ensure_runtime` 前置: 检测无 `uv` 时静默拉 `https://astral.sh/uv/install.sh | sh` 完成 bootstrap (输出全部捕获到 `mktemp` 日志, 仅失败时回吐 stderr), 安装后把 `$HOME/.local/bin` 与 `$HOME/.cargo/bin` 追加进本次脚本 PATH 再校验 `command -v uv`, 失败统一报 `runtime bootstrap failed`. 用户终端可见的 `info` 文案统一为中性话术 `==> Preparing runtime` / `==> Installing`, 不再出现 `uv` 字样 (原 `==> Installing via uv tool` 改 `==> Installing`); 实际仍走 `uv tool install --reinstall <wheel>` 安装. 配合 gateway landing 同步把安装区块从三步改两步, 终端 UX 一条 curl 命令直接拉起本机 agent. `latest.txt` 解析 / R2 wheel 下载 / SHA256 校验 / `--retry 3` 行为不变. D1 / R2 / API / Worker 绑定无改动.

## [1.5.14] - 2026-05-19

### Fixed

- mobile 小屏 (< 640px) 阅读阻塞收尾, 上接 v1.5.12 / v1.5.13 已做的 Sider 抽屉化 / Table `scroll x` / Modal 加 `min(N, vw)` 封顶 / Descriptions 单列堆叠. 收尾覆盖以下 3 处:
  - `task-content.tsx` 主任务表格的 `ID` 列 (`width: 120`) 与 `执行统计` 列 (`width: 100`) 加 `responsive: ['sm']`, < 640px 直接隐藏, 让 `任务内容` 列独占视窗宽度; `操作` 列 grid `grid-cols-2 gap-1` + 五个按钮 `!h-10 !w-10` 改为 xs `flex flex-wrap gap-0.5` + `!h-8 !w-8`, sm+ 仍 `grid-cols-2 gap-1` + `!h-10 !w-10`. 同时把列宽 `width: 100` 改 `width: 96` 适配按钮 4x2 = 64px 实际占用. 搜索框 `w-full max-w-80 sm:w-80` 改 `w-full max-w-full sm:w-80 sm:max-w-80`, xs 上限不再被 320px 截断而是占满主区. 此前 360px 屏: ID 缩略 + 统计 + 操作列共占 320px+, `scroll={{ x: 'max-content' }}` 触发横滚, 任务内容只剩可怜的一段, 必须左右拖动才能读全. 改后 360px 屏只剩 `任务内容 + 操作` 双列, 内容列拿到 ~260px 可读宽度.
  - `selected-tasks-drawer.tsx` 已选任务侧抽屉行 (`flex items-center gap-2`) 改 `flex flex-wrap items-center gap-2 sm:flex-nowrap` + 任务文本 `min-w-0 flex-1` 加 `basis-full sm:basis-0` 小屏整行占一行; 文件夹名 `max-w-44 truncate` (176px) 改 `ml-auto max-w-32 shrink-0 truncate text-xs sm:ml-0 sm:max-w-44 sm:text-sm`, 小屏靠右、字号缩小、占位减半 (128px). 此前 360px 屏: 序号 + grab + 任务文本 + 文件夹 (176px) + 删除按钮 5 个 item 强行单行排, 任务文本被压到 ~40px 仅剩 1-2 字省略号; 改后 360px 屏自动两行 (任务文本独占第一行, 文件夹 + 删除按钮第二行靠右).
  - `job-task-detail.tsx` 执行步骤 `StepLabel` 行 `flex w-full items-center gap-2` + 末尾 `<Space size={4} className="shrink-0">` 包三个 link 按钮 (全部展开/全部关闭/↓展开10), 改为 `flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap` + 按钮容器 `flex shrink-0 basis-full flex-wrap gap-x-1 sm:basis-auto`. 此前父级 `[&_.ant-collapse-header]:overflow-hidden` 一旦溢出会直接裁掉按钮; 360px 屏: 序号 + 状态图标 + page_title (`truncate flex-1`) + 累计耗时 + 三按钮 同行排, page_title 几乎被压到 0 而按钮被裁不可点; 改后 360px 屏自动两行 (摘要行 + 三按钮独占第二行). 同时清理未使用的 `Space` import.

  桌面体验 (`>= 640px`) 完全不变.

## [1.5.13] - 2026-05-19

### Fixed

- mobile 小屏 (< 768px) 阅读阻塞收尾, 上接 v1.5.12 已做的 Sider 抽屉化 / Table `scroll x` / Descriptions 单列堆叠. 收尾覆盖以下 7 处:
  - `task-modal.tsx` 创建/编辑任务弹窗 `width="80vw"` 改 `width="min(880px, 92vw)"`: 桌面封顶 880px 不再随屏拉伸, 小屏仍按 92vw 自适应.
  - `task-chain-modal.tsx` 任务链弹窗补 `width="min(520px, 92vw)"`: 此前未设 width 走 antd 默认 520px, 在 360px 屏会被强裁导致按钮区被挤出可视区.
  - `selected-tasks-drawer.tsx` 已选任务侧抽屉 `size="large"` (固定 736px) 改 `width="min(736px, 100vw)"`: 360px 屏不再溢出屏幕右沿.
  - `job-detail-panel.tsx` 执行任务列表 Card `[&_.ant-card-body]:max-h-[calc(100vh-340px)]` 加 `sm:` 前缀: 小屏 (`< 640px`) 取消 max-h 让内容自然展开, 配合 header `basis-full` 单独占行, 避免任务列表被压成 80px 高的可滚动小窗.
  - `job-task-detail.tsx` 执行摘要 `Descriptions column={2}` 改 `column={{ xs: 1, sm: 2 }}`: 360px 屏单列堆叠不被截断.
  - `folder-sider.tsx` 本地 Agent 配置 Popover 内容容器固定 `w-80` (320px) 改 `w-[min(20rem,calc(100vw-3rem))]`: 此前在 mobile drawer (`placement=left` `width=85vw`, 360px 屏 drawer 内宽 ~282px) 内触发 popover 时, popover content 仍 320px 冲出 drawer 与屏幕右沿; 改后小屏自动收缩到 `100vw - 48px`, 桌面仍 320px.
  - `job-task-detail.tsx` 步骤截图 `<Image>` 仅 `max-h-64`, 缺 `max-w-full`, 高分辨率 base64 截图 (常见 ≥ 1024px 宽) 会撑破 detail panel 容器, 触发整个执行历史页右侧横向滚动; 加 `max-w-full` 后图片随容器收缩, 高度封顶不变.

  桌面体验 (`>= 768px`) 不受影响.

## [1.5.12] - 2026-05-19

### Fixed

- admin 后台 (`/autopilot`) 与执行历史页 (`/autopilot/preview/:taskId`) 在 mobile 小屏 (< 768px) 出现的阅读阻塞: 此前 Ant Design `<Layout.Sider>` 固定 280–500px 宽 / 320px 宽, 会强吃掉 iPhone 一类窄屏的大半视窗, 主内容被压扁到不可读; 搜索框 `w-80` (320px) + 操作按钮组叠加在小屏强制横向溢出; preview Header `flex` 不 wrap 导致刷新按钮被挤出. 改为: 新增 `app/admin/_hooks/use-is-mobile.ts` 监听 `matchMedia (max-width: 767px)`, `FolderSider` / preview Sider 在小屏改为 `Drawer` 抽屉, 触发按钮以 hamburger 形式塞进主内容头部 (`TaskContent` actions 区 / Header 左侧); `TaskContent` 搜索框宽度由 `w-80` 改 `w-full max-w-80 sm:w-80`, Ant Table 加 `scroll={{ x: 'max-content' }}` 防列挤压; preview Header 改 `flex-wrap items-center gap-2 sm:gap-4`, 任务文本 `basis-full` 单独占行; `JobDetailPanel` 执行概要 `Descriptions column` 由 `2` 改 `{ xs: 1, sm: 2 }`, 任务统计 span 同步; `JobTaskLabel` 顶部信息行小屏改 `flex-wrap` 让任务文本单独成行. 不改桌面体验 (`>= 768px` 完全保留原 Sider + 拖拽宽度手柄).

## [1.5.11] - 2026-05-19

### Fixed

- `public/favicon.ico` 实际只生成了 1 个 entry (16×16, 716 B). 起因是 `Image.save(format="ICO", sizes=[...], append_images=[16x16, 32x32, 48x48])` 误用了 `append_images` (该参数给 GIF / WebP / Animated PNG 之类多帧格式), Pillow 的 ICO writer 忽略了它, 然后又因为 `images[0]` 自身已是 16×16 而拒绝放大. 改为直接给 master 1024×1024 调 `master.save(path, format="ICO", sizes=[(16,16),(32,32),(48,48)])`, 让 Pillow 内部按 sizes 高质量下采样生成 3 个 entry (16/32/48, 总 ≈ 7.4 KB). 浏览器在 Retina / HiDPI 屏上 favicon.ico 不再被放大模糊, 桌面快捷方式与任务栏图标也清晰.

## [1.5.10] - 2026-05-19

### Added

- `public/` 加全套 PWA / 多平台 icon, 由根 `<link>` 与 `site.webmanifest` 注入: `favicon.svg` (矢量主图, 浏览器优先), `favicon.ico` (16/32/48 multi-size), `apple-touch-icon.png` (180×180), `icon-192.png` / `icon-512.png` (any purpose), `icon-maskable-192.png` / `icon-maskable-512.png` (PWA maskable, 80% safe-zone). 资产视觉与 gateway landing brand mark 完全一致 (蓝紫渐变圆角方 + 白 `Q`), 经 gateway 透传同时服务于 landing、autopilot admin、autotest SPA 三个 web 工程的 favicon / Apple touch / Android Chrome / PWA 安装.
- `app/root.tsx` `<link rel=icon|alternate icon|apple-touch-icon|mask-icon|manifest>` 五件套 + `<meta name=theme-color>`; `<title>` 由 `Ele Autopilot` 改为 `QA AutoPilot · 任务后台`, description 写明项目定位; `<html lang>` 改 `zh-CN`, ErrorBoundary 文案中文化.
- `autopilot._index` / `autopilot.preview.$taskId` 各加 `meta()` 独立 `<title>` (`任务后台 · QA AutoPilot` / `任务执行历史 · QA AutoPilot`), 浏览器 tab 不再都显示同一个根 title.

### Changed

- 用户向 UI 文案清洗: `folder-sider.tsx` `Agent 连接配置` → `本地 Agent 配置`, `Agent 已连接 / Agent 未连接` → `本地 Agent 已连接 / 本地 Agent 未连接`, `检测中` → `正在检测`, popover 内 `服务: <name> v<version>` (版本号暴露) 与 `运行: N分钟` 改为 `已连接到 <name>` + `已运行 N 分钟` (与 gateway landing footer 唯一版本号显示去重), `Job 配置 (JSON)` → `执行参数 (JSON)`, `保存配置` → `保存`; `admin-task-explorer.tsx` `Agent 未连接，请先...连接 Agent` 文案压缩, `Job 已创建: <id8>` 改 `已派单执行 · <id8>`; `job-detail-panel.tsx` `Job ID` / `Job 错误` / `已发送停止 Job 信号` / `停止 Job 失败` / `停止整个 Job` / `停止 Job` / `无法加载 Job 信息` 全部去 `Job` 字样, 改为 `执行 ID` / `执行错误` / `已发送停止信号` / `停止失败` / `停止整个执行` / `停止执行` / `无法加载执行信息`.
- `app/routes/install-script.tsx` install.sh 注释 `install <bin> from Cloudflare R2 (served by ele-autopilot Worker)` 改为 `install <bin> (QA AutoPilot local agent)`, 不再向终端用户暴露底层基础设施.
- `public/favicon.ico` 替换为新品牌矢量派生 (16/32/48 multi-size, 716 B, 从 25.9 KB 旧 ico 压缩).

## [1.5.9] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway v1.5.9 一同发布; 本项目无业务改动. 上游修复: gateway landing CSS 加 `prefers-reduced-motion` 兜底 + `<html lang>` 改 `zh-CN`. 本项目 resource route (`/releases/local/*` / `/install.sh` / `/screenshots/*`) 与 API 契约不变.

## [1.5.8] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway v1.5.8 一同发布; 本项目无业务改动. 上游修复: landing SSR 拿 `request.url.origin` 直接渲染真实 install URL (修复占位符闪烁), `/index.html` 由 worker 层 301 → `/` (修复 RR 路由表无 `/index.html` 导致的 ErrorBoundary 404), clipboard catch + 删除 service binding 上无效的 `cf.cacheTtl`. 本项目 `releases.local.$.tsx` / `install-script.tsx` 资源路由契约不变.

## [1.5.7] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway v1.5.7 一同发布; 本项目无业务改动. 上游变化: gateway landing 从单文件内嵌 HTML 重写为 React Router v7 framework mode (SSR), 视觉重做并改用 `env.AUTOPILOT.fetch("/releases/local/latest.txt")` 服务端拿版本号 (失败兜底客户端 fetch). 本项目 `/releases/local/latest.txt` resource route 行为不变.

## [1.5.6] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot-local v1.5.6 一同发布; 本项目无业务改动. 上游修复: `.github/workflows/autopilot-local.yml` 4 处 `wrangler r2 object put` 补 `--remote` (wrangler v4 默认 local), production R2 写入恢复, `/releases/local/*` resource route 能真正命中对象返 200.

## [1.5.5] - 2026-05-19

### Removed

- 路由 `/help` (`app/routes/help.tsx`) + 路由表条目 (`app/routes.ts`): install 入口迁到 gateway landing, ele-autopilot 不再承载安装指引页.
- 管理后台右上角浮动 Help 按钮 (`admin-task-explorer.tsx`): `Tooltip` / `Link` / `QuestionCircleOutlined` import 一并清理 (本文件仅此一用).

### Fixed

- 借迁移修正原 `/help` 页 3 处错误命令展示, gateway landing 取正确值: ① 启动命令 `ele-autopilot run` → `ele-autopilot` (CLI 无 subcommand, 见 `autopilot/cli.py`); ② 监听 `127.0.0.1:8000` → `0.0.0.0:8000` (`uvicorn.run host="0.0.0.0"`); ③ 补 `ELE_LLM_API_KEY=<your-gemini-api-key>` env 前缀 (必需, 见 `autopilot/task.py`).

### Notes

- 资源路由 `/install.sh` (`routes/install-script.tsx`) 与 `/releases/local/*` (`routes/releases.local.$.tsx`) 不变, gateway landing 与 install.sh 用户均经它们拿安装脚本与版本号; 与 ele-autopilot-local 端契约无影响.

## [1.5.4] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.5.4 一同发布; 本项目无业务改动. 上游修复 SPA 4 处 `fetch` 漏 `/autotest` 前缀导致 Confluence / Figma / 图片识别 / markdown-research 在 gateway 后 404.

## [1.5.3] - 2026-05-19

### Changed

- Page path `/admin` → `/autopilot` (`app/routes.ts` 两条 route + 文件重命名 `routes/admin.*.tsx` → `routes/autopilot.*.tsx`); `_index.tsx` redirect / `help.tsx` 回退 Link / `task-content.tsx` 与 `admin-task-explorer.tsx` `window.open` 同步更新.
- `wrangler.jsonc` 加 `workers_dev: false` — Worker 不再暴露 `*.workers.dev` 公网, 仅可经新增 gateway Worker (`qa`) 经 service binding 访问.
- API path `/api/admin/*` / callback `/api/jobs/*` / root level (`/screenshots/*` / `/releases/*` / `/install.sh` / `/help`) 全部保留, 兼容现网 ele-autopilot-local 端契约.

### Added

- 新增根仓库 `gateway/` 子项目 (Cloudflare Worker `qa`), 唯一对外公网入口 `https://qa.<account-sub>.workers.dev`, 提供 `/` landing 双卡片 (AutoPilot / AutoTest) + 路径分发. 详见 `gateway/AGENTS.md`.

## [1.5.2] - 2026-05-19

### Changed

- `app/routes/help.tsx` 84 行 inline `style={}` 重构为 AntD Card / Space / Typography + Tailwind class, 与项目主体 (Tailwind + AntD) 视觉一致, 命令块用 `Text code copyable` 内置一键复制.
- `app/routes/releases.local.$.tsx` `cacheControlFor` 冗余判断 (`key === 'local/latest.txt'` 已被 `endsWith('/latest.txt')` 覆盖) 清理.

### Fixed

- 撤销 1.5.1 引入的 per-project namespace tag (`ele-autopilot/v*` 等) — 工程改为全局 **lockstep**: 三子项目版本号始终统一, 单一 `v*` tag 触发三 workflow (autopilot / autopilot-local / autotesting) 同步 redeploy. workflow trigger + verify 步骤全部回到 `v*` 体系. 详见根 `AGENTS.md` "Git / 发布约定". 1.5.1 段从本 CHANGELOG 移除, 1.5.1 内容并入 1.5.2.

### Docs

- 根 `AGENTS.md` "AI 操作规则" + "Git / 发布约定" 重写为 lockstep 模型 (旧 per-project namespace 规则废弃).
- `AGENTS.md` / `CLAUDE.md` Key Files 段补 `RELEASES` R2 binding 描述 (1.5.0 漏改); Release 段 workflow 路径更正为根仓库 `autopilot.yml`.
- `deploy.md` 加 Lockstep 说明; `ele-autopilot-local/CHANGELOG.md` 1.5.0 死链 (`../../releases/tag/v1.5.0`) 移除.

## [1.5.0] - 2026-05-19

### Added

- R2 binding `RELEASES` → bucket `ele-autopilot-releases` (`wrangler.jsonc` / `lib/bindings.ts` / `workers/app.ts` 同步).
- 路由 `/releases/local/*` (`app/routes/releases.local.$.tsx`): 代理 R2 对象, 按扩展名映射 Content-Type, `latest.txt` 短缓存 (60s), 其他 immutable.
- 路由 `/install.sh` (`app/routes/install-script.tsx`): Worker 动态生成安装脚本, base URL 来自 `request.url.origin` (无须硬编码).
- 路由 `/help` (`app/routes/help.tsx`): 极简教学页, loader 读 `local/latest.txt` 展示最新版本号 + 三段命令 (uv 装 / install / 启动) 含复制按钮.
- 管理后台右上角 Help 入口 (`admin-task-explorer.tsx` fixed 浮动按钮 → `/help`).

## [0.3.2] - 2026-05-19

### Fixed

- `README.md` 仍以 SQLite + `better-sqlite3` + tarball + `react-router-serve` + `SQLITE_DB_PATH` + `bun run start` 描述项目 (v0.2.x 残留, v0.3.0 平台迁移漏更新) — 重写为 Cloudflare Workers + D1 + R2 + `wrangler deploy` 现状.

### Removed

- `scripts/migrate-screenshots-to-fs.mjs`: v0.2.5 一次性历史脚本 (SQLite base64 → 本地 fs), 依赖 `better-sqlite3` + `node:fs` 在 v0.3.0 平台迁移后已无法运行, 且 base64 → 路径迁移早已完成. 空目录 `scripts/` 一并清理.

## [0.3.1] - 2026-05-19

### Fixed

- 文档 (`AGENTS.md` / `deploy.md` / `CHANGELOG.md`) 与 `release.yml` 实际行为对齐: 移除 "Actions 自动创建 / 探测 D1 + R2" 与 "`database_id` 部署时替换" 等承诺 — workflow 实际只跑 `migrations apply --remote` + `wrangler deploy`, D1 / R2 需手动一次性创建并把 `database_id` 写入 `wrangler.jsonc`.
- `app/routes.ts` 中 `/screenshots/*` 路由的过时注释 ("落盘到 data/screenshots/") → 改为指向 R2 bucket.
- `workers/app.ts`: `interface CloudflareEnvironment extends Env {}` 触发 `@typescript-eslint/no-empty-object-type` lint error (v0.3.0 引入未察觉, release.yml 不跑 lint 故漏掉) — 改为 `type CloudflareEnvironment = Env;` (该别名仅 `workers/app.ts` 自用, 无 declaration merging 需求).

### Removed

- `app/entry.server.tsx` 中 `isbot` 死代码分支 — 当前实现走全量 `await new Response(body).text()` 缓冲注入 cssinjs `<style>`, bot / 普通 UA 路径完全一致, `await body.allReady` 为冗余 await. 同步从 `package.json` 移除 `isbot` 依赖.

## [0.3.0] - 2026-05-18

### Changed

- **平台迁移到 Cloudflare Workers + D1 + R2**. 运行时从 Node `react-router-serve` 切换到 Workers (V8 isolate). 数据库 `better-sqlite3` (同步) → D1 (prepared statement, 异步); 截图 `data/screenshots/` 本地 fs → R2 bucket `ele-autopilot-screenshots`.
- `lib/db/*` 全部函数改异步 (`async`/`await`); 通过 `lib/bindings.ts` 的 `AsyncLocalStorage` 注入 D1 + R2, 调用层无须显式传 binding.
- `app/entry.server.tsx`: Node `renderToPipeableStream` + `node:stream` → web `renderToReadableStream` + 缓冲注入 antd cssinjs 样式 (Workers 不支持 PassThrough).
- 构建系统: 接入 `@cloudflare/vite-plugin`, 启用 RR7 `future.v8_viteEnvironmentApi`. `wrangler.jsonc` 声明 `DB` (D1) + `SCREENSHOTS` (R2) bindings. 产物 `build/server/` 由 vite plugin 自动写入 `wrangler.json` 含完整 binding 配置.
- 发布流程: push tag → Actions 走 `wrangler deploy` (替代旧 tarball release). 新增 `migrations/0001_init.sql` (D1 schema), Actions 自动 `wrangler d1 migrations apply --remote`.

### Added

- `workers/app.ts`: Workers fetch handler, 用 `createRequestHandler` + `runWithBindings` 把 `env` (DB + R2) 注入 RR7 AppLoadContext + ALS scope.
- `lib/bindings.ts`: `AsyncLocalStorage<{DB, SCREENSHOTS}>` 容器, 请求级别注入 Cloudflare bindings; `getBindings()` / `runWithBindings()` API.
- `migrations/0001_init.sql`: D1 初始 schema (folders / tasks / jobs / job_tasks / settings + 默认 agent_config).
- `worker-configuration.d.ts`: `wrangler types` 生成的 runtime types + Env 类型 (含 DB / SCREENSHOTS).
- `package.json` scripts: `preview` (`wrangler dev`), `deploy` (`wrangler deploy`), `typegen` (`wrangler types`).

### Removed

- `better-sqlite3` / `@types/better-sqlite3` / `@react-router/node` / `@react-router/serve` 依赖.
- `lib/db/connection.ts` 中 `getDbPath` / `initSchema` / `seedTestData` (schema 由 D1 migrations 管理, seed 数据不再自动注入 - 生产环境靠 admin 创建).
- 旧 `data/` 目录写入 (本地开发用 `wrangler dev` + miniflare 模拟 D1 + R2).
- `.github/workflows/release.yml` 的 tarball 打包逻辑 (`linux-x64.tar.gz` + `checksums.txt` 不再产出).

### Migration Notes (operator)

- 必备 GitHub Secrets: `CLOUDFLARE_API_TOKEN` (含 Workers / D1 / R2 编辑权限), `CLOUDFLARE_ACCOUNT_ID`.
- 首次部署 Actions 自动创建 D1 database `ele-autopilot` + R2 bucket `ele-autopilot-screenshots` (幂等检测, 已存在不重建).
- 历史 SQLite 数据 / 本地 screenshots 不自动迁移. 如需保留, 用 `wrangler d1 execute` 批量导入 + `wrangler r2 object put` 上传图片.

## [0.2.5] - 2026-05-18

### Removed

- `job_tasks.result.steps[].thinking_image` 不再以 base64 字符串内嵌存储 — 原设计文档 (`todos/link-serve-client.md:465`) 写明 "截图路径", 但实现意外走了 base64, 导致单 task result 平均 14.5 MB (规划上限 500 KB 的 29×, 极端 task 530 步达 230 MB / 单 task).

### Added

- `lib/screenshots.ts`: base64 解码 + 落盘 + path 替换工具, 含路径越狱防护 (`resolveScreenshotAbsPath`).
- `app/routes/screenshots.$.tsx`: 静态 resource route, URL `/screenshots/{job_task_id}/{i}.png` 直接读 `data/screenshots/`, 返回 `image/png` + immutable 缓存头.
- 环境变量 `SCREENSHOTS_DIR` (默认 `data/screenshots`) 自定义截图根目录, 沿用 `SQLITE_DB_PATH` 同款思路, 部署可指向持久卷. 未来上 R2 / S3 时只改 `lib/screenshots.ts` 落盘逻辑, DB / UI 层 (存的是 URL 字符串) 无需变动.
- `scripts/migrate-screenshots-to-fs.mjs`: 一次性历史数据迁移脚本, 把存量 base64 抽出落盘并 `UPDATE` result. 幂等可重跑, 支持 `--vacuum`. 用 ID 列表流式逐行处理避免 OOM (5+ GB 数据).

### Changed

- `api.jobs.$id.callback.task.tsx` 收到 callback 后, 先 `getJobTaskByIndex` 拿 job_task id, 调用 `externalizeScreenshots` 把 `result.steps[].thinking_image` 的 base64 抽出落盘到 `data/screenshots/{id}/{i}.png`, 字段值替换为 `/screenshots/{id}/{i}.png` 再入 SQLite. Local 端契约不变, 仍传 base64 (因为 local 与 server 跨机部署, local path 在 server 上访问不到).
- `app/admin/preview/_components/job-task-detail.tsx` UI 渲染兼容三种格式: `data:` / `http(s)://` / `/` 直接当 URL, 否则按旧数据 raw base64 兜底加前缀.
- 历史数据迁移: 5.5 GB base64 截图全量抽出 → `data/screenshots/` (4.1 GB binary PNG, 10,316 张图) + `app.sqlite` 从 5.8 GB → **387 MB** (-93%). 迁移 18.6s + VACUUM 2.1s.

## [0.2.4] - 2026-05-18

### Removed

- `TaskActionResult.raw_history` 字段 — 该字段是 browser-use `AgentHistoryList.model_dump()` 的原样镜像, 与 `steps[]` 内容 100% 冗余 (thinking / evaluation / memory / next_goal / model_output / action / results 已全部结构化到 steps), 服务端 UI / API 零消费, 仅是 `job_tasks.result` 列的纯膨胀源. 同步清理 `lib/db/types.ts` / `app/admin/_types.ts` 类型定义与 `todos/link-serve-client.md` 设计文档 (类型 / 示例 / 树形图共 3 处).

### Changed

- 历史数据迁移: 对 `job_tasks.result` 执行 `UPDATE ... json_remove($.raw_history)` (404 行全量) + `VACUUM`. 物理库 6.2 GB → 5.8 GB (-400 MB / -6.5%), 单条 result 平均 16.0 MB → 14.5 MB. 需配套 `ele-autopilot-local` ≥ v0.1.4 (源头同步停止注入, 否则旧版 local 回调会重新写入该字段).

## [0.2.3] - 2026-05-18

### Fixed

- `.prettierignore` 仍写 `.next` (Next.js 产物目录, RR7 已无意义), 改为 RR7 实际产物 `build` / `.react-router`. 否则 `bun run format` 会扫这些目录里的生成文件.
- `todos/link-serve-client.md` 架构图标签 `(Next.js + SQLite)` → `(React Router v7 + SQLite)`, 避免误导后续 agent 以为 server 还是 Next.js.

## [0.2.2] - 2026-05-18

### Removed

- `docs/next-llms.txt` / `docs/next-llms-full.txt`: Next.js 离线文档镜像, 项目已不再依赖 Next.js, 留着会误导后续 AI agent. 总计 ~3MB.

### Changed

- `docs/AGENTS.md` 重写: 删除 Next.js App Router 相关引导, 替换为 React Router v7 (Framework mode) 上下文; 离线检索资料保留 Bun + Ant Design 两套.
- `deploy.md` 修正注释 "验证 standalone 启动" → "验证生产构建启动" (Next.js 残留措辞).

## [0.2.1] - 2026-05-18

### Changed

- `app/entry.server.tsx` 移除残留的 `isbot` UA 分支与 `readyOption` 三元死代码 — antd cssinjs `extractStyle` 强依赖完整渲染, 始终走 `onAllReady`. 同步从 `package.json` 移除显式 `isbot` 依赖 (RR7 dev 仍间接持有).
- 移除 5 个组件文件 (`admin-task-explorer-page` / `use-agent-connection` / `preview/_components/job-*`) 顶部残留的 `'use client';` 指令 — RR7 无 RSC 边界, 无意义.
- `AGENTS.md` 修正 `vite.config.ts` 描述: 实为 `reactRouter()` + `tailwindcss()` 两 plugin, `@/*` 别名走 Vite 8 内置 `resolve.tsconfigPaths` 读 `tsconfig.json#paths` 解析, 无独立 plugin.

## [0.2.0] - 2026-05-18

### Changed

- 框架从 Next.js 16 (App Router) 迁移到 React Router v7 (Framework mode + Node adapter + Vite). 所有 URL 路径 / DB schema / 外部 runner 回调契约保持不变.
- 服务端入口由 `next.config.ts` standalone server → `@react-router/serve`. 启动命令 `./node_modules/.bin/react-router-serve ./build/server/index.js`.
- Release artifact 内容从 `.next/standalone/` → `build/` + `public/` + `package.json` + 生产 `node_modules/`. 解压后直接启动, 无需额外 `npm install`.
- antd SSR 从 `@ant-design/nextjs-registry` 切换为 `@ant-design/cssinjs` 在 `app/entry.server.tsx` 内 `StyleProvider` + `extractStyle` 手动抽取. SSR 用 `renderToPipeableStream` + `onAllReady` (非 `renderToString`), 经 PassThrough buffer 在 `</head>` 前注入 style — 否则 RR7 client `<HydratedRouter>` 等不到 stream close 信号会永远 suspend (页面卡 Spin).
- ESLint 配置从 `eslint-config-next` 切换为 `@eslint/js` + `typescript-eslint` 推荐规则集.
- `lib/db/*.ts` 移除 `import 'server-only'` (RR7 没有此约定, loader/action 天然只在服务端运行).
- `app/root.tsx` 的 `<html>` / `<body>` 加 `suppressHydrationWarning` 防御浏览器扩展 (沉浸式翻译 / Claude in Chrome 等) 修改根元素属性触发的 hydration 警告.

### Added

- `app/routes.ts`: 显式路由总表, 一处定义所有 URL → 文件映射, 不用 `flatRoutes`.
- `app/lib/api-shared.ts`: REST resource route 通用 helper (`jsonResponse` / `parseListParams` / `withContentRange` / `mapDbErrorToStatus` / `methodNotAllowed`).

### Removed

- `next` / `eslint-config-next` / `@ant-design/nextjs-registry` / `@tailwindcss/postcss` 依赖, `next.config.ts` / `next-env.d.ts` / `app/layout.tsx` / `app/page.tsx` / `app/api/` 目录全部清理. `app/page.tsx` 默认首页改为重定向到 `/admin`.

## [0.1.0] - 2026-05-18

### Added

- 管理后台 UI (`app/admin`): 文件夹树 + 任务列表的层级管理, 支持任务标题 / sub_ids 子任务链 / 多任务批量创建.
- 数据模型: `folders` (`parent_id` 表层级) / `tasks` (关联 folder, `sub_ids` JSON 表子任务链).
- Job 执行模型: `jobs` + `job_tasks` (一次执行展开 `sub_ids` 后 flat 成多个 `job_task`, 各自记录 `status` / `result` / `error`).
- 全局配置: `settings` (key-value, 默认写入 `agent_config` 含 gemini model / max_steps / 各类 timeout 等).
- 管理后台 REST API (`/api/admin/{folders,tasks,jobs,settings}`): 列表支持 `sort` / `range` / `filter` 查询参数 (均 JSON 字符串), 分页通过响应头 `Content-Range` 表达, 浏览器侧通过 `Access-Control-Expose-Headers: Content-Range` 暴露.
- Job 回调入口: `/api/jobs/[id]/callback` 接收外部 runner 上报 job_task 执行结果.
- SQLite 持久化 (`better-sqlite3`, 仅服务端), 首次启动自动建表 + 写入示例数据 (10 个顶级文件夹 × 5 个子文件夹 + 100 条任务模板).
- DB schema 迁移机制: `initSchema` 内 `ALTER TABLE ... ADD COLUMN` (try/catch 包裹) 幂等处理, 保证已有数据不被破坏.
- `tag (v*)` 触发 GitHub Actions: 构建 Next.js `standalone` 产物, 打包 `linux-x64` tarball, 生成 SHA256 `checksums.txt`, 发布 GitHub Release.

[0.3.2]: https://github.com/yangfan-elestyle/ele-autopilot-pretest/releases/tag/v0.3.2
[0.3.1]: https://github.com/yangfan-elestyle/ele-autopilot-pretest/releases/tag/v0.3.1
[0.3.0]: https://github.com/yangfan-elestyle/ele-autopilot-pretest/releases/tag/v0.3.0
[0.2.5]: https://github.com/yangfan-elestyle/ele-autopilot-pretest/releases/tag/v0.2.5
[0.2.4]: https://github.com/yangfan-elestyle/ele-autopilot-pretest/releases/tag/v0.2.4
[0.2.3]: https://github.com/yangfan-elestyle/ele-autopilot-pretest/releases/tag/v0.2.3
[0.2.2]: https://github.com/yangfan-elestyle/ele-autopilot-pretest/releases/tag/v0.2.2
[0.2.1]: https://github.com/yangfan-elestyle/ele-autopilot-pretest/releases/tag/v0.2.1
[0.2.0]: https://github.com/yangfan-elestyle/ele-autopilot-pretest/releases/tag/v0.2.0
[0.1.0]: https://github.com/yangfan-elestyle/ele-autopilot-pretest/releases/tag/v0.1.0
