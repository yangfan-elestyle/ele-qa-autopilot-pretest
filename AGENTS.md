# ele-qa-autopilot

QA AutoPilot 合并仓库. **三个独立子项目共存**, 不是 monorepo workspace — 三种包管理器 (Bun / uv / pnpm) 各管各, 互不依赖构建.

## AI-only 工程声明

全栈 AI-only (Claude Code / Codex 编写 / 测试 / 部署). 用户角色 = 触发者 + 验收者, 设计决策以 AI 判断为准. 所有文档 (README / CHANGELOG / AGENTS / 注释) 必须**简洁精炼**, 零冗余 — 能一行讲清不写两行, 能用列表不用段落.

非必要不反问用户, 直接决策并执行 (deploy / 技术抉择 / 文档同步 / 版本号 / changelog 等).

## 系统拓扑

```
[ele-autotesting]         [ele-autopilot] ◄────────┐
 (独立, 生成用例)          (Web 后台 / 任务中心)     │ POST /api/jobs/:id/callback/{task,complete}
                                 │  ▲                │
                                 ▼  │ 创建 Job        │
                          [ele-autopilot-local] ─────┘
                          (本地 :8000, 驱动 Chrome)
```

- `ele-autopilot` 前端默认调本地 `http://127.0.0.1:8000` 创建 Job (`app/admin/_services/local-api.ts`).
- `ele-autopilot-local` 通过 `autopilot/callback.py` 回调 `ele-autopilot` 上报状态与截图.
- `ele-autotesting` 与上述两者**运行时无耦合**, 仅同属 QA 工具族.

## 子项目入口

<!-- prettier-ignore -->
| 子目录 | 角色 | 语言/包管 | 部署目标 | 详细文档 |
|---|---|---|---|---|
| `ele-autopilot/` | 任务管理中心 + Web 后台 | TS / Bun | CF Workers + D1 + R2 | [`./ele-autopilot/AGENTS.md`](./ele-autopilot/AGENTS.md) |
| `ele-autopilot-local/` | 浏览器执行 agent (macOS) | Python 3.12 / uv | 本机 0.0.0.0:8000 | [`./ele-autopilot-local/AGENTS.md`](./ele-autopilot-local/AGENTS.md) |
| `ele-autotesting/` | AI 测试用例生成工具 | TS / pnpm | CF Workers + Container | [`./ele-autotesting/CLAUDE.md`](./ele-autotesting/CLAUDE.md) |

## AI 操作规则

1. **改子项目前先 cd**: `cd <子目录>` 后读子目录 `AGENTS.md` / `CLAUDE.md`. 子目录文档是该项目事实源, 顶层只做导航与跨项目契约.
2. **不要跨项目共享构建**: 三种包管理器不可合并为单一 workspace, 不要建顶层 `package.json` / `pyproject.toml`.
3. **跨项目契约**: `ele-autopilot` ↔ `ele-autopilot-local` HTTP API 双向耦合, 修改一端时**两端类型必须同步**. 未来建议抽 `contracts/` (OpenAPI) 为单一事实源.
4. **代码独立, 版本号 lockstep**: 用户未要求时不要"顺手"统一技术栈 (Vue→React / Bun→pnpm). 三项目代码独立演进, 但版本号/tag 强制 lockstep (下文).

## Git / 发布 (lockstep 强约束)

完整实操流程见 [./deploy.md](./deploy.md). 核心约束:

- **单一 tag, 三项目同步 bump**: 发布 tag 格式 `vX.Y.Z` (无 namespace). `ele-autopilot/package.json#version` / `ele-autopilot-local/pyproject.toml#version` / `ele-autotesting/package.json#version` **必须始终完全一致**. 任一 release 三项目同步 bump, 无业务改动的项目 CHANGELOG 标注 `lockstep 同步, 与上游 vX.Y.Z 一同发布`.
- **任一 `v*` tag → 三 workflow 全部触发**: 根 `.github/workflows/{autopilot,autopilot-local,autotesting}.yml` 均 listen `v*`, 各自跑各自构建+部署. 真实变更面由 commit 影响行决定, tag 只是统一触发器.
- 旧 per-project namespace tag (`<project>/vX.Y.Z`) 已废弃, 历史里如残留视为发布事故.
- **CHANGELOG**: 各子目录独立维护, 三项目每次 release 都新增同一版本号段.
- **Commit 风格**: Conventional Commits. Release commit 统一 `release: vX.Y.Z`. 跨子项目改动用 scope: `feat(autopilot): ...` / `fix(local): ...` / `chore(autotesting): ...`.
- **ele-autopilot-local 产物去 R2** (不挂 GitHub Release): workflow `wrangler r2 object put` 推到 `ele-autopilot-releases/local/<ver>/{wheel, sdist, checksums.txt}` + `local/latest.txt` 指针. ele-autopilot Worker 暴露 `/releases/local/*` + `/install.sh` + `/help` 给用户.

## 仓库基础设施

- 根 `.gitignore`: 防御层兜底; 子目录各自 `.gitignore` 是事实源.
- `CLAUDE.md` 为 `AGENTS.md` 的 symlink, 改 `AGENTS.md` 即可. **例外**: `ele-autotesting/` 仅有 `CLAUDE.md` (fork 残留, 暂不改).
- 根 `worker-configuration.d.ts` 在 `ele-autopilot/` 内**故意 commit** (生成产物即类型源).
- 根 `.env.template` 在 `ele-autopilot-local/` 内**故意 commit** (模板无秘密).
- GitHub workflow 必须放根 `.github/workflows/`, 子目录的 GitHub 不识别.

## 边界

- **没有 monorepo 工具** (Turborepo / Nx / Bazel) — 部署独立, 引入收益小于成本.
- **没有顶层 workspace** — pnpm 不识别 Python, uv 不识别 Node, 别折腾.
- **不在顶层放业务代码** — 顶层只能有: `.github/` / `.gitignore` / `README.md` / `AGENTS.md` / `CLAUDE.md` (symlink) / `deploy.md` / 未来的 `contracts/`.
