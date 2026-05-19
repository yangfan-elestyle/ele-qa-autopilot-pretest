# ele-qa-autopilot

QA AutoPilot 合并仓库: `gateway` + 三个业务子项目并存。不是 monorepo workspace; gateway 与 `ele-autopilot` 用 Bun, `ele-autopilot-local` 用 uv, `ele-autotesting` 用 pnpm.

## LLM 指令层级

- `AGENTS.md` 是 Codex / 通用 Agent 主入口; `CLAUDE.md` 只做 symlink 或 `@AGENTS.md` import.
- 根文档只写跨项目契约; 子目录文档写本项目事实。改子项目前先 `cd <子目录>` 并读最近的 `AGENTS.md` / `CLAUDE.md`.
- 冲突优先级: 用户本轮指令 > 最近子目录文档 > 根文档 > README / 历史文档。代码、配置、workflow 是事实源.
- 指令保持短、具体、可执行; 不塞 changelog 全文、完整 API 文档、入门科普.

## AI-only 约定

全栈由 Claude Code / Codex 编写、测试、部署; 用户是触发者与验收者。技术决策、版本 bump、CHANGELOG 文案、commit message 由 AI 自决.

- 收到“改 X / 加 Y / 修 Z”默认包含完整闭环: 改代码/配置 -> 本地验证 -> lockstep 版本/发布记录 -> `release: vX.Y.Z` commit -> annotated tag -> push branch + tag -> 等四个 workflow success.
- workflow 失败时读 log 定位, 修代码或按 `deploy.md` amend; 不停在“要不要 deploy / workflow fail 了”.
- 只在外部凭据、密钥、账号或用户独有偏好缺失且无法从仓库 / git 历史 / jjask 推断时提问; 一次问完.
- 豁免发布闭环: 用户明示“只改不发 / 先看看 / 本地试”; 或改动仅限文档、prompt、注释、本地脚本、jjask 记录.
- 所有文档保持高密度: 能一行讲清不写两行, 能列表化不写段落.

## 系统拓扑

- 唯一公网入口: `gateway` Worker `qa`, URL `https://qa.<account-sub>.workers.dev`.
- `/` 与 `/index.html`: gateway landing 双卡片; `/healthz`: gateway 自检.
- `/autotest/*`: gateway strip `/autotest` 后转发 `env.AUTOTEST.fetch` -> `ele-autotesting`.
- 其他路径: gateway 原样转发 `env.AUTOPILOT.fetch` -> `ele-autopilot` (`/autopilot*` / `/help` / `/api/*` / `/screenshots/*` / `/releases/*` / `/install.sh` / `/favicon.ico`).
- `ele-autopilot` 前端默认调本地 `http://127.0.0.1:8000` 创建 Job (`app/admin/_services/local-api.ts`).
- `ele-autopilot-local` 通过 `autopilot/callback.py` 回调 `ele-autopilot`; callback base URL 由后端按当前 request origin 下发, 经 gateway 变为公网入口.
- `ele-autotesting` 当前与 autopilot 运行时无耦合; 未来联动再加 service binding.

## 子项目

<!-- prettier-ignore -->
| 子目录 | 角色 | 栈 / 包管 | 部署目标 | 指令 |
|---|---|---|---|---|
| `gateway/` | 公网入口 + 路由分发 | TS / Bun | CF Workers `qa` | [`gateway/AGENTS.md`](./gateway/AGENTS.md) |
| `ele-autopilot/` | 任务管理中心 + Web 后台 | TS / Bun | CF Workers + D1 + R2 | [`ele-autopilot/AGENTS.md`](./ele-autopilot/AGENTS.md) |
| `ele-autopilot-local/` | 本地浏览器执行 agent | Python 3.12 / uv | macOS 本机 `0.0.0.0:8000` | [`ele-autopilot-local/AGENTS.md`](./ele-autopilot-local/AGENTS.md) |
| `ele-autotesting/` | AI 测试用例生成工具 | TS / pnpm | CF Workers + D1 + Container | [`ele-autotesting/AGENTS.md`](./ele-autotesting/AGENTS.md) |

## 跨项目规则

- 不建顶层 `package.json` / `pyproject.toml`; 不引入 Turborepo / Nx / Bazel.
- 不统一技术栈: 不把 Vue 改 React, 不把 Bun / uv / pnpm 合并.
- 顶层只放仓库治理文件、`.github/`、`gateway/`、三个业务目录和未来 `contracts/`; 不放业务代码.
- `ele-autopilot` 与 `ele-autopilot-local` HTTP API 双向耦合; 改一端必须同步另一端类型 / schema.
- 根 `.gitignore` 兜底; 子目录 `.gitignore` 是本项目事实源.
- GitHub workflow 只放根 `.github/workflows/`; 子目录 workflow GitHub 不识别.

## Release

完整流程见 [`deploy.md`](./deploy.md). 摘要:

- 单一 tag: `vX.Y.Z`; 旧 `<project>/vX.Y.Z` namespace tag 视为事故.
- 四个 manifest 必须同版本: `gateway/package.json`, `ele-autopilot/package.json`, `ele-autopilot-local/pyproject.toml`, `ele-autotesting/package.json`.
- 发布记录位置: `gateway/CHANGELOG.md`, `ele-autopilot/CHANGELOG.md`, `ele-autopilot-local/CHANGELOG.md`, `ele-autotesting/CHANGELOGS`.
- 任一 `v*` tag 触发四个 workflow: `gateway.yml`, `autopilot.yml`, `autopilot-local.yml`, `autotesting.yml`.
- Release commit 固定 `release: vX.Y.Z`; 其他 commit 用 Conventional Commits, 跨项目加 scope.
- `ele-autopilot-local` 产物发布到 R2 `ele-autopilot-releases/local/<ver>/`, 不挂 GitHub Release.

## 文件约定

- `CLAUDE.md` 为 `AGENTS.md` symlink; `ele-autopilot/docs/CLAUDE.md` 用 `@AGENTS.md` import.
- `ele-autopilot/worker-configuration.d.ts` 是生成产物也是类型源, 已故意提交; 改 `wrangler.jsonc` 后跑 `bun run typegen`.
- `ele-autopilot-local/.env.template` 是无密钥模板, 已故意提交.
