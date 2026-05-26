# Changelog

写作规范见 [deploy.md §CHANGELOG 写作](../deploy.md#changelog-写作).

## [1.21.0] - 2026-05-26

### Changed

- `ELE_LLM_API_KEY` 环境变量改为可选: 优先使用 autopilot 集成中心下发的 key, env 仅作为离线 / 旧客户端 fallback. 两者均未配置时任务失败并提示明确原因.

## [1.9.9] - 2026-05-20

### Fixed

- 回调地址尾斜杠不再触发部分网关下的双斜杠路径问题.

## [1.9.7] - 2026-05-20

### Fixed

- 回调失败自动重试 (最多 3 次, 指数退避), 网络抖动 / 网关偶发 5xx 不再让任务结果丢失.

## [1.9.5] - 2026-05-20

### Fixed

- 任务部分成功 + 部分未跑的中间态不再被错误标记为"失败".

## [1.9.4] - 2026-05-20

### Changed

- 上报截图若解码后过大会被服务端置空, 不影响主结果.

## [1.5.18] - 2026-05-19

### Fixed

- `ele-autopilot upgrade` 一键升级稳定化, 不再需要额外配置或环境变量.

## [1.5.17] - 2026-05-19

### Added

- 新增 `ele-autopilot --help` / `--version` / `upgrade` (别名 `update`) 子命令, 默认无参数仍直接启动服务.

## [1.5.6] - 2026-05-19

### Fixed

- 修复一键安装拿不到正确版本号的问题.

## [1.5.5] - 2026-05-19

### Changed

- 安装入口迁到 landing 内嵌区块.

## [1.5.3] - 2026-05-19

### Changed

- 安装入口与回调链路统一改经 gateway, 用户无需关注子工程地址.

## [1.5.2] - 2026-05-19

### Changed

- 发布流程改回 lockstep.

## [1.5.0] - 2026-05-19

### Changed

- 发布渠道从 GitHub Release 迁到 Cloudflare R2, 安装命令保持不变.

## [0.1.4] - 2026-05-18

### Removed

- 上报负载移除冗余字段, 减少传输与存储体积.

## [0.1.3] - 2026-05-18

### Added

- 首版 GitHub Release + `install.sh` 一键安装.

[0.1.4]: https://github.com/yangfan-elestyle/ele-autopilot-local-pretest/releases/tag/v0.1.4
[0.1.3]: https://github.com/yangfan-elestyle/ele-autopilot-local-pretest/releases/tag/v0.1.3
