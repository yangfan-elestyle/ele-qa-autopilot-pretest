# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

## [1.9.6] - 2026-05-20

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.9.6 一同发布; 本项目无业务改动 (FastAPI app / 路由 / browser-use 执行链路 / callback 上行格式不变). 本轮上游聚焦 AI 主动扫雷第四轮: ele-autopilot 修了 react-admin 列表头点排序按钮在 D1 层被静默忽略的功能缺陷 (`lib/db/utils.ts` 新增 `buildOrderBy` 字段白名单 + 方向归一化共享 helper, jobs/tasks/folders 三处 list*Page 接入); ele-autotesting 给 `/confluence-parse` / `/figma-parse` / `/markdown-research` / `/image-research/*` 四条服务端资源敏感路由统一加 `resolveOwner` 中间件, 收回此前任意访客可枚举服务端 Atlassian token / LLM API key 的开放面, 同时把 figmaParse 上游错误响应体回写客户端的信息泄漏点拉齐 confluenceParse 防线; core 包新增 `setAuthHeaders/getAuthHeaders` 让 UI fetch 业务路由时统一注入 X-Device-Id. 本项目 R2 wheel 发布链路不变, `_update_status` 状态机沿用 v1.9.5 规则.

[1.9.6]: https://github.com/elestyle-org/ele-qa-autopilot/compare/v1.9.5...v1.9.6

## [1.9.5] - 2026-05-20

整体目标: 与 ele-autopilot v1.9.5 状态机同步; 本轮 local 仅改 `_update_status` 聚合规则, FastAPI app / 路由 / browser-use 执行链路 / callback 上行格式不变.

### Fixed

- `autopilot/job.py` `Job._update_status` 状态机 corner case: 此前 tasks = `[COMPLETED, FAILED, PENDING]` (用户中途 stop 或单 task 抛错但 for 循环继续跑剩余 task 的瞬间) 命中"没 RUNNING → not all COMPLETED → has FAILED → FAILED"分支, 把 job 过早标记 FAILED, 与 server 端 `syncJobStatusFromTasks` 同问题. 现新增"没 RUNNING 但有 PENDING → RUNNING"规则, 把 FAILED 终态兜底放到无 PENDING 无 RUNNING 之后, 与 server 端语义对仗. 不影响 callback 上行的 task 级别 status (`running` / `completed` / `failed`), 只影响 job 终态聚合.

[1.9.5]: https://github.com/elestyle-org/ele-qa-autopilot/compare/v1.9.4...v1.9.5

## [1.9.4] - 2026-05-20

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.9.4 一同发布; 本项目无业务改动. 本轮上游聚焦 AI 主动扫雷第二轮: ele-autopilot 给 callback 截图入口加 6MB/张 base64 长度上限 + `deleteTaskById/deleteFolderById` 接上 `pruneSubIdReferencesUnsafe` 扫表清理悬挂 sub_ids 引用; ele-autotesting 修了 `/http-proxy` / `/stream-proxy` 的 SSRF (`proxyGuard.ts` 共享 host 黑名单 + 强制 http/https protocol) 与上游响应头泄漏 (set-cookie / authorization / WWW-Authenticate 黑名单). 注意 local agent 上报截图时若单步图片解码后 > ~4.5MB, autopilot 会把 thinking_image 字段置空 + console.warn — 这是新限制, 不影响 task 主结果. FastAPI app / 路由 / 监听 / R2 wheel 发布链路不变.

[1.9.4]: https://github.com/elestyle-org/ele-qa-autopilot/compare/v1.9.3...v1.9.4

## [1.9.3] - 2026-05-20

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.9.3 一同发布; 本项目无业务改动. 本轮上游聚焦 AI 主动扫雷 — ele-autopilot 修了删除链 R2 截图永久残留的资源泄漏 (`lib/screenshots.ts` 新增 `deleteScreenshotsByJobTaskIds` 前缀 list + batch delete, folder/task/job DELETE handler 全部接上), `mapDbErrorToStatus` 识别 D1 FK 错误映射 409, `parseListParams` 加 1000 行 range 上限; ele-autotesting 修了 streamProxy SSE reader 资源回收 (finally + cancel) 与 httpProxy 流式转发避免 128MB OOM. 顺手抛了 Ant Tree drag indicator 与 Toast 进度条视觉. FastAPI app / 路由 / 监听 / R2 wheel 发布链路不变.

[1.9.3]: https://github.com/elestyle-org/ele-qa-autopilot/compare/v1.9.2...v1.9.3

## [1.9.2] - 2026-05-20

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.9.2 一同发布; 本项目无业务改动. 上游本轮聚焦 AutoTest 工作台 3 个 Manager 弹窗 (模型 / 模板 / 数据) 全部统一 `.ds-modal-head` 设计语言 + `.ds-pill-btn` 行内按钮 + svg 图标替代 emoji; ele-autotesting TextDiff 完全重写为 `.ds-diff-shell` 子系统, 字号从 16px 改 12.5px mono, fragment 着色用 token 半透明 + 边线. ele-autotesting theme.css 新增 30+ 组 utility 全 token 化. FastAPI app / 路由 / 监听 / R2 wheel 发布链路不变.

## [1.9.1] - 2026-05-20

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.9.1 一同发布; 本项目无业务改动. 本轮上游聚焦"工作台 UX 硌手细节抛光" Phase 1: ele-autopilot 任务行 5 按钮收敛为 派单+预览+更多 菜单, 删除走 Popconfirm 防误触, 表格行加 left brand-accent bar hover 反馈, globals.css 新增 `.ds-row-actions` + `.ds-row-action-btn*`; ele-autotesting OutputDisplayCore 工具栏改 `.ds-segmented` + `.ds-icon-btn-sm` 统一段控件, reasoning header 重写为 brand-tint 软底 + chevron 旋转 + streaming pulse dot, TestPanel 数据源标签从 `bg-blue-100` 硬编码改 `.ds-source-chip` 双变体 + 类型 uppercase 前缀, "添加数据源" 改虚线 dashed pill + 展开态实线 brand ring, HistoryDrawer 紫色 tag 改 `.ds-chip-brand` / 蓝色链接改 `.ds-text-link` / 删除按钮改 `.ds-text-link-danger` / 版本行重写 + V-tag mono 方块, 空态从 emoji 改 svg icon + 标题 + hint 三层, Modal 关闭按钮 stone/slate 硬编码改 `.ds-icon-btn-sm`. ele-autotesting theme.css 新增 10+ 组 utility 全 token 化, 与 ele-autopilot 对仗. FastAPI app / 路由 / 监听 / R2 wheel 发布链路不变.

## [1.9.0] - 2026-05-20

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.9.0 一同发布; 本项目无业务改动. 上游本轮聚焦工作台 UX 整体提级: ele-autopilot 新增 8 组 工作台级 utility (`.ds-kbd` / `.ds-page-header*` / `.ds-section*` / `.ds-segmented*` / `.ds-task-row-text` / `.ds-task-row-meta`), 任务表格删 ID 列改用 meta 第二行 + 4 段状态筛选 segmented + 4 列 KPI; folder-sider head 重构; task-modal 批量语法抽成可折叠帮助卡; preview workspace 任务 summary 加 breadcrumb + 展开/收起. ele-autotesting 同步引入 `.ds-panel*` / `.ds-toolbar-divider` / `.ds-eyebrow` / `.ds-icon-btn-sm` / `.ds-workspace-row` / `.ds-kbd`, InputPanel / PromptPanel / TestPanel 三块统一引入 panel-head 视觉层级, App.vue 顶栏 action 按钮分两组. FastAPI app / 路由 / 监听 / R2 wheel 发布链路不变.

## [1.8.6] - 2026-05-20

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.8.6 一同发布; 本项目无业务改动. 上游 ele-autopilot 新增 `.ds-num-square` (索引方块) / `.ds-banner` (行内提示横幅 4 变体) / `.ds-dnd-item` (拖拽卡片 3 态) 共享 utility 类, selected-tasks-drawer 与 preview workspace job-detail-panel 抽出全部内联视觉; ele-autotesting 同步引入等价 class 保持设计契约对齐. FastAPI app / 路由 / 监听 / R2 wheel 发布链路不变.

## [1.8.5] - 2026-05-20

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.8.5 一同发布; 本项目无业务改动. 上游 ele-autopilot 提取 `.ds-skeleton` shimmer 骨架 + `.ds-job-card` 执行历史卡片状态机, ConsoleBootSkeleton / PreviewBootSkeleton 删除 inline `<style>` 注入, preview workspace 执行历史 button inline style 抽出. FastAPI app / 路由 / 监听 / R2 wheel 发布链路不变.

## [1.8.4] - 2026-05-20

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.8.4 一同发布; 本项目无业务改动. 上游主要内容: ele-autopilot preview workspace `StatBadge` 与 banner / sider 数字 chip 抽出 inline tonemap 改用 `.ds-chip` token 类; ele-autotesting 引入与 autopilot 等价的 `.ds-status-pill` / `.ds-chip` / `.ds-vrule` / `.ds-brand-mark` / `.ds-status-dot-pulse` 共享 utility 类, MainLayout brand 块与 Studio 就绪徽章抽出 inline 样式, 顶栏 6 个 actions 加 `.ds-vrule` 分组. FastAPI app / 路由 / 监听 / R2 wheel 发布链路不变.

## [1.8.3] - 2026-05-20

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.8.3 一同发布; 本项目无业务改动. 上游主要内容: gateway landing 完成品牌色从 `#0969da` 到 indigo `#4f46e5` 的迁移 + hero/cards/install 视觉提级; ele-autopilot AppHeader 抽出全部内联样式改用 `.ds-status-pill` / `.ds-chip` / `.ds-vrule` / `.ds-brand-mark` 通用 token 类, 三产品 motion / spacing token 完全对齐. FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径 / browser-use Agent 执行链路不变.

## [1.8.2] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.8.2 一同发布; 本项目无业务改动. 上游 ele-autotesting AutoTest 前端工作台 UX 提级 (App.vue 完整布局骨架替代单 spinner / OptimizationModeSelector 段控件 icon + label + hint / PromptPanel brand dot 标题 + 版本段控件 + 独立 iterate 按钮 / MainLayout 加 Studio 就绪状态徽章). FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径 / browser-use Agent 执行链路不变.

## [1.8.1] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autopilot v1.8.1 一同发布; 本项目无业务改动. 上游 ele-autopilot 后台工作台 UX 提级 (新增 MetricTile / EmptyState / TableSkeleton 三件套, 任务列表加 5 列 KPI strip 跨任务聚合, 执行概要 5 KPI + 进度条, 执行历史卡片加状态色 vertical bar + 相对时间, 首屏完整骨架替代 Spin). FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径 / browser-use Agent 执行链路不变.

## [1.8.0] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.8.0 一同发布; 本项目无业务改动. 上游 ele-autotesting AutoTest 前端工作台 UI 整体重塑, 对齐 v1.7.0 ele-autopilot 设计语言 (theme.css token 化 / Inter 字体 / indigo 主色 / Lucide-style SVG icon 替代 emoji / Modal size prop / Toast 4 状态 token 化). FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径 / browser-use Agent 执行链路不变.

## [1.7.0] - 2026-05-20

### Changed

- lockstep 同步, 与上游 ele-autopilot v1.7.0 一同发布; 本项目无业务改动. 上游 ele-autopilot 后台工作台 UI 整体重塑 (设计 tokens / Inter 字体 / indigo 主色 / 顶部品牌栏 / 卡片化任务列表 / preview 页重组 / 状态徽章统一 / Modal 与 Drawer 精修). FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径 / browser-use Agent 执行链路不变.

## [1.6.9] - 2026-05-19

### Removed

- lockstep 同步, 与上游 ele-autotesting v1.6.9 一同发布; 本项目无业务改动. 上游回滚 autotesting workflow 全部 cache 优化改动. FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径不变.

## [1.6.8] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.6.8 一同发布; 本项目无业务改动. 上游修 v1.6.7 Capture step condition bug + 去掉 main trigger. FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径不变.

## [1.6.7] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.6.7 一同发布; 本项目无业务改动. 本版用途: seed 一次 autotesting workflow 新增的 markitdown image URI cache — 下次 (v1.6.8 起) lockstep 占位发版自动走 reuse path, wrangler deploy 跳过 docker build + image push. FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径不变.

## [1.6.6] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.6.6 一同发布; 本项目无业务改动. 本版主要触发用途: 验证上版后 push 到 main 的 `d72763e` (`fix(ci/autotesting): share buildx cache via main branch scope`) 是否让本次 tag push 流程下 autotesting workflow 通过 `restore-keys: buildx-markitdown-` 兜底 fallback 命中已写入 `refs/heads/main` scope 的 386 MB buildx layer cache (run 26101456149, 2 min 完成), wrangler 跑 markitdown docker build 时跳过 apt-get install / pip install. FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径不变.

## [1.6.5] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.6.5 一同发布; 本项目无业务改动. 上游变化: (a) gateway landing 友情链接重做 — host 前缀 `agentic-loop-ui` → `harness` (`app/routes/home.tsx` `deriveFriendLink(origin)` 替换首段 label), 入口位置从 v1.6.4 footer 末行小字 (`.footer-friend` `font-size: 11px` + `flex-basis: 100%`) 提升为与 AutoPilot / AutoTest 并列的第三张卡片 (`section .cards` 改 `grid-template-columns: repeat(3, 1fr)` + `<= 900px` 2 列 + `<= 640px` 1 列 fallback, 新增 `.card-tag` 11px subtle 圆角小标签, 删 `.footer-friend` 样式), `<a target="_blank" rel="noopener noreferrer">`. (b) ele-autopilot `app/admin/_components/task-content.tsx` 任务列表 topbar 左侧 `<Space>` 最前面加 `<Button icon={<HomeOutlined />} href="/">返回首页</Button>`, `href="/"` 走浏览器跳转回 gateway landing. (c) ele-autotesting `packages/web/src/App.vue` header `#actions` slot 首位 (`<ThemeToggleUI />` 前) 加 `<ActionButtonUI icon="🏠" text="返回首页" @click="goHome" />`, `goHome = () => { window.location.href = '/' }` 跳出 `/autotest/` SPA base 回 gateway. FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径不变.

## [1.6.4] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway v1.6.4 一同发布; 本项目无业务改动. 上游 gateway landing footer 新增动态后缀友情链接 `agentic-loop-ui`: `app/routes/home.tsx` loader 加 `deriveFriendLink(origin)` 用 `new URL(request.url).origin` 取当前 host, 把首个 `.` 之前的 label 替换为 `agentic-loop-ui` 保留剩余 host (含端口与后续 label); host 不含 `.` 或匹配 IPv4 `/^\d+\.\d+\.\d+\.\d+(:\d+)?$/` 时返回 `null` 短路不渲染, 避免开发态错链; 配 `app/app.css` `.footer-friend` (`flex-basis: 100%` + 11px subtle 字号 + `<a>` underline `text-decoration-color: var(--border)`) 渲染在 footer 末行, `target="_blank"` + `rel="noopener noreferrer"`. 实际访问 host 为 `ele-qa-autopilot.<domain>` 时友链指向 `https://agentic-loop-ui.<domain>` (后缀实时跟随当前域名, 不写死). FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径不变.

## [1.6.3] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.6.3 一同发布; 本项目无业务改动. 上游变化: `.github/workflows/autotesting.yml` (ele-autotesting 对应的 CI workflow) 接入 buildx layer cache 跨 workflow run 持久化 — `setup-buildx-action@v3` 加 `install: true` 让 `docker build` shim 到 `docker buildx build`, 新增 `Restore` (`actions/cache@v4`, key 基于 markitdown 目录 hashFiles + restore-keys 兜底) / `Warm` (deploy 前 `--cache-from type=local --load` 喂 buildkitd) / `Persist` (deploy 后 `if: always()` + `--cache-to type=local,mode=max --output type=cacheonly` 落盘) 三个步骤, 削掉 `MarkitdownContainer` 镜像每次 deploy 重跑 `apt-get install` / `pip install` 的耗时. FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / `upgrade` shim 链路 / R2 wheel 发布路径不变.

## [1.5.18] - 2026-05-19

### Fixed

- `autopilot/cli.py` 修复 v1.5.17 上线 `upgrade` (alias `update`) 子命令立即暴露的"缺省 base URL"缺陷, 同时放弃 v1.5.18 早期草案的 `~/.config/ele-autopilot/base` 持久化方案 (用户反馈 wheel 工具不应写 `$XDG_CONFIG_HOME`, 配置语义错位; 且 BASE 是 CF 账号私有子域, wheel 是 GitHub Actions 一次构建上传 R2 的公共构件, 编译期写入架构上不可能). 改走"装配期硬编码 shim": 上游 `ele-autopilot/install.sh` 在 `uv tool install --reinstall` 成功后用 unquoted heredoc 把当前 gateway BASE 字面展开到 `$HOME/.local/bin/ele-autopilot-upgrade` shim (`#!/usr/bin/env bash` + `set -euo pipefail` + `curl -fsSL "<BASE>/install.sh" \| bash`), 末尾 `chmod +x`. 本项目 cli 同步删 `_config_base_path` / `_read_config_base` / `_resolve_base` 三个解析辅助、删 `argparse --base` 参数与三级 fallback chain; 新增模块级常量 `UPGRADE_SHIM_PATH = ~/.local/bin/ele-autopilot-upgrade`. `upgrade` (alias `update`) 缩减为 `subprocess.run(["bash", UPGRADE_SHIM_PATH])` 并透传 returncode, shim 不存在时 stderr 提示重跑 `curl -fsSL <gateway>/install.sh | bash` 完成首装/补装并 `exit 2`. UX 不退步 (零参数生效), 但 wheel 内核去掉运行时 fallback、不再依赖 `ELE_AUTOPILOT_BASE` 环境变量、不再读写 `~/.config`. FastAPI app / 路由 / `0.0.0.0:8000` 监听 / `--version` / `--help` / R2 wheel 发布路径不变.

## [1.5.17] - 2026-05-19

### Added

- `autopilot/cli.py` 接入 `argparse`, 修复 `ele-autopilot --help` / `--version` 此前被 `uvicorn.run` 吞掉的失效行为. 新增三个最基础参数, 不引入额外子命令: (1) `--help` / `-h` argparse 自动生成; (2) `--version` / `-V` 通过 `action="version"` 读 `app_meta.project_version()`, 输出 `ele-autopilot <ver>`; (3) `upgrade` (alias `update`) 子命令复用 gateway `install.sh` 重装最新 wheel, base URL 来源优先级 `--base URL` > 环境变量 `ELE_AUTOPILOT_BASE`, 缺失时打印 stderr 提示并以 exit code 2 退出. upgrade 执行 `bash -c "curl -fsSL <base>/install.sh | bash"` 并以子进程 returncode 退出 (失败 / 用户 Ctrl+C 透传). 默认无参数仍 `uvicorn.run("autopilot.cli:app", host="0.0.0.0", port=8000)` 启动 HTTP 服务, 完全向后兼容. FastAPI app / 路由 / 中间件 / `0.0.0.0:8000` 监听地址 / `install.sh` 渲染 / `latest.txt` 路径 / SHA256 校验 / `uv tool install` 行为不变.

### Changed

- lockstep 同步, 与上游 gateway v1.5.17 一同发布. 上游变化: gateway landing 安装本地 agent 区块说明文案改为面向非开发用户 (去掉 `0.0.0.0:8000` 监听地址描述与外层 `<code>` 标签, 改为 `两步完成. 启动后 AutoPilot 工作台会自动连接本地 agent, 即可派单执行任务.`). 本机 agent 实际仍监听 `0.0.0.0:8000` 提供 HTTP 接口, wheel / sdist 产物经 `uv build` 推到 R2 `ele-autopilot-releases/local/<ver>/` 路径不变.

## [1.5.16] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway v1.5.16 一同发布; 本项目无业务改动. 上游修复: gateway landing `.install` 框小屏适配 (内部 `padding` 收紧、`install-head` `meta` 不再 `margin-left: auto`、`.steps li` 补 `min-width: 0` 防 grid item + `.cmd nowrap` 长 URL 撑破; `<= 420px` 极窄屏 `.cmd-row flex-wrap`, 命令独占一行、复制按钮在第二行右侧). 本机 agent 安装命令文本 / `install.sh` 渲染 / `latest.txt` 路径 / SHA256 校验 / `uv tool install` 行为不变.

## [1.5.15] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.5.15 一同发布; 本项目无业务改动. 上游变化: ele-autopilot 渲染的 `install.sh` 加 `ensure_runtime` 前置, 自动 bootstrap 缺失的运行时, 同时把用户可见 `info` 文案中性化; gateway landing 安装区由三步改两步 (用户不再需要单独装运行时). 本项目 CLI / 本机 `0.0.0.0:8000` HTTP 接口与回调契约不变, wheel / sdist 产物经 `uv build` 生成后仍按既有路径推到 R2 `ele-autopilot-releases/local/<ver>/`.

## [1.5.14] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.5.14 一同发布; 本项目无业务改动. 上游修复: ele-autopilot 主任务表格 (ID / 执行统计列 xs 隐藏 + 操作列 xs `flex-wrap` + 按钮 8x8) + 已选任务侧抽屉行 (xs `flex-wrap` + 文件夹名缩小靠右) + 执行步骤 StepLabel (三按钮 xs 独占第二行) 的 mobile 收尾; ele-autotesting TestPanel header 与 InputPanel 标题行 xs 加 `flex-wrap`. 本项目 CLI / `install.sh` 安装命令 / `0.0.0.0:8000` HTTP 接口与回调契约不变.

## [1.5.13] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.5.13 一同发布; 本项目无业务改动. 上游修复: ele-autopilot 两处 mobile 小屏残留横向溢出 — 本地 Agent 配置 Popover 内容固定 `w-80` 改为动态 `w-[min(20rem,calc(100vw-3rem))]`, 执行历史步骤截图 `<Image>` 加 `max-w-full` 防止 base64 高分辨率截图撑破容器. 本项目 CLI / `install.sh` / 本机 `0.0.0.0:8000` HTTP 接口与回调契约不变.

## [1.5.12] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.5.12 一同发布; 本项目无业务改动. 上游修复: ele-autopilot admin / preview 在 mobile 小屏的 Sider 抽屉化 + Table 横向滚动 + Descriptions 单列堆叠. 本项目 CLI / `install.sh` 安装命令 / `0.0.0.0:8000` HTTP 接口与回调契约不变.

## [1.5.11] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.5.11 一同发布; 本项目无业务改动. 上游修复仅是 `favicon.ico` 由单 entry 改为 multi-size 16/32/48, 不影响本项目 CLI / `install.sh` / 本机 `0.0.0.0:8000` HTTP 服务.

## [1.5.10] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot / ele-autotesting v1.5.10 一同发布; 本项目无业务改动. 上游变化集中在 web 工程的品牌资产 (favicon / apple-touch-icon / PWA maskable / site.webmanifest) 与 UI 文案 (gateway landing 删除 `一个域名两个工具` / `powered by Cloudflare Workers`; ele-autopilot admin `Job` → `执行`; autotest SPA title 改 `QA AutoPilot · AutoTest`); 本项目 CLI / `install.sh` 安装命令、`0.0.0.0:8000` HTTP 接口与回调契约不变. ele-autopilot `app/routes/install-script.tsx` 注释 `install <bin> from Cloudflare R2 (served by ele-autopilot Worker)` 改为 `install <bin> (QA AutoPilot local agent)`, 不影响脚本行为.

## [1.5.9] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway v1.5.9 一同发布; 本项目无业务改动. 上游修复仅是 gateway landing CSS 加 `prefers-reduced-motion` 兜底 + `<html lang>` 改 `zh-CN`, 不影响本项目 CLI / `install.sh` 安装命令与 `0.0.0.0:8000` 服务行为.

## [1.5.8] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway v1.5.8 一同发布; 本项目无业务改动. 上游修复: landing SSR 拿真实 origin 直接渲染 `curl -fsSL <gateway-origin>/install.sh | bash` (修复占位符闪烁), 安装命令文案与本项目 CLI 行为一致, 未做契约调整.

## [1.5.7] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway v1.5.7 一同发布; 本项目无业务改动. 上游变化: gateway landing 重写为 React Router v7 framework mode (SSR), 视觉重做; 安装区步骤命令 (含 `curl -fsSL <origin>/install.sh | bash` 与 `ELE_LLM_API_KEY=<key> ele-autopilot`) 文本与本项目 CLI 行为一致, 未做契约调整.

## [1.5.6] - 2026-05-19

### Fixed

- `.github/workflows/autopilot-local.yml` 4 处 `wrangler r2 object put` 加 `--remote`. wrangler v4 起 `r2 object` 默认 local 数据存储, 缺 `--remote` 会 silently 写到 ephemeral local cache, production bucket `ele-autopilot-releases` 长期为空. v1.5.5 把 gateway landing 改为浏览器侧 fetch `/releases/local/latest.txt` 后该 bug 暴露 (旧 `/help` 页 SSR 直读 R2 binding 同样拿不到, 仅显示 `v—` 占位符不报错). 本版重发将 `local/<ver>/{wheel,sdist,checksums.txt}` 与 `local/latest.txt` 真正推到 production R2.

## [1.5.5] - 2026-05-19

### Changed

- lockstep 同步, 与上游 gateway / ele-autopilot v1.5.5 一同发布; 本项目无业务改动. 上游变化: install 入口从 `/help` 迁到 gateway landing 页内嵌区块, `README.md` "安装" 段同步更新引导文案.

## [1.5.4] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autotesting v1.5.4 一同发布; 本项目无业务改动.

## [1.5.3] - 2026-05-19

### Changed

- lockstep 同步, 与上游 ele-autopilot / ele-autotesting / gateway v1.5.3 一同发布; 本项目无业务改动. 上游变化: 新增 `qa` gateway Worker 统一公网入口 `https://qa.<account-sub>.workers.dev`, 业务 Worker 关闭 `workers_dev`. 安装入口 (`/install.sh`) 与回调 URL 均通过 gateway 自动透传, 本端无需修改 — `callback_url` 由 ele-autopilot 后端动态下发, install 脚本由 Worker 动态生成 base URL.

## [1.5.2] - 2026-05-19

### Changed

- `CHANGELOG.md` 1.5.0 链接 (`../../releases/tag/v1.5.0`) 移除 — R2 渠道不再产生 GitHub Release URL.

### Fixed

- 撤销 1.5.1 引入的 per-project namespace tag (`ele-autopilot-local/v*`) — 工程改为全局 **lockstep**: 三子项目版本号统一, 单一 `v*` tag 触发三 workflow 同步 redeploy. workflow trigger + R2 上传步骤的 `VER` 提取全部回到 `${tag#v}`. 1.5.1 段从本 CHANGELOG 移除, 1.5.1 内容并入 1.5.2.

### Docs

- 根 `AGENTS.md` "Git / 发布约定" 重写为 lockstep 模型.
- `deploy.md` 加 Lockstep 说明, tag 格式回到 `vX.Y.Z`.

## [1.5.0] - 2026-05-19

### Changed

- 发布渠道从 GitHub Release 迁到 Cloudflare R2 (`ele-autopilot-releases` bucket). Workflow 不再创建 Release, 改为 `wrangler r2 object put` 上传 wheel / sdist / `checksums.txt` / `local/latest.txt` 指针.
- 安装入口从 GitHub raw `install.sh` 改为 ele-autopilot Worker 动态生成 (`/install.sh`, base URL 自带).

### Removed

- `install.sh` (转移到 ele-autopilot Worker 路由 `app/routes/install-script.tsx`, 单一事实源).
- workflow `softprops/action-gh-release` 步骤 + `contents: write` 权限.

## [0.1.4] - 2026-05-18

### Removed

- `autopilot/task_action.py` 移除 `payload["raw_history"] = json.dumps(_safe_dump(self.result.model_dump()))` 注入 — 该字段是 browser-use `AgentHistoryList.model_dump()` 的原样镜像, 与 payload 中已展开的 `summary` + `steps[]` 100% 冗余, Server (`ele-autopilot`) 侧 UI / API 零消费, 仅在 SQLite 里浪费空间 (单条 result 平均省 ~1 MB).
- `autopilot/task_action_out.template.json` 同步移除 `raw_history` 字段示例.
- Server 已在 `ele-autopilot` v0.2.4 同步清理类型定义并迁移历史 DB 数据 (物理库 6.2 GB → 5.8 GB).

## [0.1.3] - 2026-05-18

### Added

- GitHub Actions (`.github/workflows/release.yml`) 自动构建 wheel/sdist 并发布 GitHub Release (含 `checksums.txt`)
- `install.sh` 一键安装脚本 (检查 uv → `uv tool install <wheel-url>`)
- `deploy.md` 发布流程文档 (含 amend 修上版 bug SOP)
- 本 CHANGELOG (Keep a Changelog 1.1.0 + SemVer 风格)

[0.1.4]: https://github.com/yangfan-elestyle/ele-autopilot-local-pretest/releases/tag/v0.1.4
[0.1.3]: https://github.com/yangfan-elestyle/ele-autopilot-local-pretest/releases/tag/v0.1.3
