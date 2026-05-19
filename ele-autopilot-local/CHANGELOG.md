# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

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
