# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

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
