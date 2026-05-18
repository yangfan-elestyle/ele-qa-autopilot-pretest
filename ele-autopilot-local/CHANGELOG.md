# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

## [1.5.1] - 2026-05-19

### Fixed

- Workflow trigger 从统一 `v*` 改为 namespace `ele-autopilot-local/v*`, 避免跨子项目 fan-out 部署. R2 上传步骤的版本号提取适配 namespace tag (`tag##*/` 去 namespace + `#v` 去 v).
- `CHANGELOG.md` 1.5.0 链接 (`../../releases/tag/v1.5.0`) 移除 — R2 渠道不再产生 GitHub Release URL.

### Docs

- `deploy.md` / `AGENTS.md` tag 格式从 `vX.Y.Z` 同步为 `ele-autopilot-local/vX.Y.Z`.

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
