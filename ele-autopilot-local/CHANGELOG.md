# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

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
