# AGENTS

LLM 约束. 工程说明见 [README.md](./README.md), 发布流程见 [deploy.md](./deploy.md).

## 优先级

用户本轮指令 > 子目录 `AGENTS.md` > 本根 > README / 历史文档. 代码 / 配置 / workflow 是事实源.

## 工作模式

- 改子项目前 `cd <子目录>` 并读最近 `AGENTS.md`.
- "改 X / 加 Y / 修 Z" 默认含完整闭环 (流程 / 版本规则 / commit & tag 命名 / CHANGELOG 写作 / workflow 触发面全见 [deploy.md](./deploy.md)): 改代码 -> 本地验证 -> 同步四 manifest 版本 + CHANGELOG -> `release: vX.Y.Z` commit -> annotated tag -> push branch + tag -> 等四个 workflow success.
- workflow 失败读 log 定位; 不卡在 "要不要 deploy".
- 豁免闭环: 用户明示 "只改不发 / 先看看 / 本地试"; 或仅改文档 / prompt / 注释 / 本地脚本 / jjask.
- 仅外部凭据 / 密钥 / 用户独有偏好缺失且无法从仓库 / git / jjask 推断时提问, 一次问完.

## 跨项目硬约束

- 不建顶层 `package.json` / `pyproject.toml`; 不引入 Turborepo / Nx / Bazel.
- 不统一技术栈; Bun / uv / pnpm 各自独立.
- 顶层只放仓库治理 / `.github/` / `gateway/` / 三业务目录 / 未来 `contracts/`; 不放业务代码.
- `ele-autopilot` <-> `ele-autopilot-local` HTTP API 双向耦合; 改一端必须同步另一端类型 / schema.
- 根 `.gitignore` 兜底; 子目录 `.gitignore` 是本项目事实源.
- GitHub workflow 只放根 `.github/workflows/`.

## 文件约定

- `CLAUDE.md` = `AGENTS.md` symlink; `ele-autopilot/docs/CLAUDE.md` 用 `@AGENTS.md` import.
- `ele-autopilot/worker-configuration.d.ts` 是生成产物也是类型源, 已故意提交; 改 `wrangler.jsonc` 后跑 `bun run typegen`.
- `ele-autopilot-local/.env.template` 是无密钥模板, 已故意提交.
- 文档高密度: 能一行不写两行, 能列表不写段落.
