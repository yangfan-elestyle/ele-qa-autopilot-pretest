# Changelog

写作规范见 [deploy.md §CHANGELOG 写作](../deploy.md#changelog-写作).

## [1.10.1] - 2026-05-20

### Changed

- 接入 Cloudflare Google Workspace SSO 身份: 每位登录员工独立 owner, 模型 / 模板 / 历史等配置按账号隔离, 不再全用户共享.
- 历史端到端验证数据 (`device:shared-owner-v1`) 弃用; 首次登录后从空配置起步, 本地浏览器残留数据会自动迁移到当前账号.
