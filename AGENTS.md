# ele-qa-autopilot

QA AutoPilot 系统的合并仓库. **三个独立子项目共存**, 不是 monorepo workspace — 三种包管理器 (Bun / uv / pnpm) 各管各的, 子项目之间互不依赖构建.

## AI-only 工程声明

全栈 AI-only (Claude Code / Codex 编写 / 测试 / 部署). 用户角色 = 触发者 + 验收者. 设计决策以 AI 判断为准.

文档 (README / CHANGELOG / AGENTS / 注释) 必须**简洁精炼**, 零冗余.

## 系统拓扑

```
┌─────────────────────┐
│   ele-autotesting   │  独立工具: AI 生成 QA 测试用例 (Vue3 + Hono + CF Workers)
│  (生成层, 独立)      │  fork from prompt-optimizer
└─────────────────────┘

┌─────────────────────┐         ┌────────────────────────┐
│    ele-autopilot    │ ◄─────► │  ele-autopilot-local   │
│  (管理层 + Web 后台) │ HTTP    │  (执行层, 本地 agent)   │
│  CF Workers + D1/R2 │         │  FastAPI + browser-use │
└─────────────────────┘         └────────────────────────┘
   ▲                                     │
   │ POST /api/jobs/:id/callback/        │
   │      {task, complete}               │
   └─────────────────────────────────────┘
```

**运行时耦合**:

- `ele-autopilot` 前端默认调本地 `http://127.0.0.1:8000` 创建 Job (见 `app/admin/_services/local-api.ts`)
- `ele-autopilot-local` 通过 `autopilot/callback.py` 回调 `ele-autopilot` 的 `/api/jobs/{id}/callback/{task,complete}` 上报状态与截图
- `ele-autotesting` 与上述两者**运行时无耦合**, 仅同属 QA 工具族

## 子项目入口

<!-- prettier-ignore -->
| 子目录 | 角色 | 语言/包管 | 部署目标 | 详细文档 |
|---|---|---|---|---|
| `ele-autopilot/` | 任务管理中心 + Web 后台 | TS / Bun | CF Workers + D1 + R2 | [`./ele-autopilot/AGENTS.md`](./ele-autopilot/AGENTS.md) |
| `ele-autopilot-local/` | 浏览器执行 agent (macOS) | Python 3.12 / uv | 本机 0.0.0.0:8000 | [`./ele-autopilot-local/AGENTS.md`](./ele-autopilot-local/AGENTS.md) |
| `ele-autotesting/` | AI 测试用例生成工具 | TS / pnpm | CF Workers + Container | [`./ele-autotesting/CLAUDE.md`](./ele-autotesting/CLAUDE.md) |

## AI 操作规则

1. **改子项目前先 cd**: `cd <子目录>` 然后读子目录 `AGENTS.md` / `CLAUDE.md`. 子目录文档是该项目事实源, 顶层文档只做导航.
2. **不要跨项目共享构建**: 三种包管理器不可合并为单一 workspace, 不要尝试建顶层 `package.json` / `pyproject.toml`.
3. **跨工程契约**: `ele-autopilot` ↔ `ele-autopilot-local` 的 HTTP API 双向耦合, 修改一端时**两端类型必须同步**. 未来建议抽 `contracts/` (OpenAPI) 作为单一事实源.
4. **代码逻辑独立, 版本号/tag lockstep**: 用户未要求时, 不要"顺手"把 ele-autotesting 的 Vue 改 React, 不要"统一" Bun→pnpm. 三个项目代码独立演进; 但**版本号与发布 tag 强制 lockstep** (见下文 "Git / 发布约定").

## Git / 发布约定

- **Tag + 版本号 lockstep (强约束)**: 整个工程视为一体 release. 单一发布 tag 格式 `vX.Y.Z` (无 namespace). 三子项目 `ele-autopilot/package.json#version` / `ele-autopilot-local/pyproject.toml#version` / `ele-autotesting/package.json#version` **必须始终保持完全一致**, 任何 release 三项目同步 bump 到同一新版本号, 即使某项目本次无业务改动也要跟着 bump (该项目 CHANGELOG 段标注 `lockstep 同步, 与上游 vX.Y.Z 一同发布`).
  - 旧 per-project namespace tag (`<project>/vX.Y.Z`) 已废弃, 不再使用. 历史里如残留, 视为发布事故.
  - 工程含义: 任一 `v*` tag push → 三 workflow (autopilot / autopilot-local / autotesting) **全部触发并 redeploy**, 这是 lockstep 的代价也是它的承诺 — 全工程同步上线.
- **GitHub Actions**: workflow 必须放根 `.github/workflows/`, 子目录的 workflow 文件 GitHub 不识别. 三 workflow 均 listen `v*` tag (lockstep), 各自跑各自的构建+部署. 业务代码改动靠 commit 影响行决定真实变更面, tag 只是统一触发器.
- **CHANGELOG**: 各子目录独立维护, 不合并. 每次 lockstep release 三项目 CHANGELOG 都新增同一版本号段; 无业务改动项目标注 `lockstep 同步` 占位.
- **Commit 风格**: Conventional Commits (`feat | fix | chore: ...`). Release commit 统一 `release: vX.Y.Z`. 非 release 跨子项目改动用 `scope` 标注: `feat(autopilot): ...` / `fix(local): ...` / `chore(autotesting): ...`.
- **ele-autopilot-local 产物去 R2** (不挂 GitHub Release): workflow `wrangler r2 object put` 推到 `ele-autopilot-releases/local/<ver>/{wheel, sdist, checksums.txt}` + `local/latest.txt` 指针. ele-autopilot Worker 暴露 `/releases/local/*` (R2 代理) + `/install.sh` (动态生成, BASE 自带) + `/help` (Web 后台教学页) 给用户.

## 仓库基础设施

- 根 `.gitignore`: 防御层兜底; 子目录各自 `.gitignore` 是事实源.
- 根 `worker-configuration.d.ts` 在 `ele-autopilot/` 内**故意 commit** (子项目惯例, 生成产物即类型源).
- 根 `.env.template` 在 `ele-autopilot-local/` 内**故意 commit** (模板无秘密).
- `CLAUDE.md` 为 `AGENTS.md` 的 symlink, 改 `AGENTS.md` 即可.

## 边界

- **没有 monorepo 工具** (Turborepo / Nx / Bazel) — 三个项目部署独立, 无共享构建缓存需求, 引入这类工具收益小于成本.
- **没有顶层 workspace 配置** — pnpm 不识别 Python, uv 不识别 Node, 别折腾.
- **不在顶层放业务代码** — 顶层只能有: `.github/` / `.gitignore` / `README.md` / `AGENTS.md` / `CLAUDE.md` (symlink) / 未来的 `contracts/`.
