# 发布流程 (lockstep)

四项目 (gateway + 三业务) 版本号统一, 单一 `vX.Y.Z` tag 同步触发三 workflow (build + push 镜像; ele-autopilot-local wheel 随 autopilot 镜像构建打进去). 内网单机 docker-compose 部署见 [deploy/README.md](./deploy/README.md).

## TL;DR

1. 四 manifest 同 bump + 有改动的 CHANGELOG 加段
2. 本地验证 (各项目 build / typecheck / smoke)
3. `git commit -m "release: vX.Y.Z"` → `git tag -a vX.Y.Z -m "vX.Y.Z"` → `git push origin <branch> vX.Y.Z`
4. 等三 workflow success (镜像推到 GHCR; agent wheel 已随 autopilot 镜像自带)
5. 宿主 `cd deploy && docker compose pull && up -d` (拉新镜像滚动)

> 一次性前置 (GHCR / `.env`) 见 [deploy/README.md](./deploy/README.md#go-live-一次性动作), 默认无需主动处理.

## 1. 写版本

- 默认 PATCH; 新功能 MINOR; 破坏性 DB schema / API 响应结构 MAJOR.
- Tag 仅 `vX.Y.Z`; release commit 固定 `release: vX.Y.Z`; 其他改动用 Conventional Commits, 跨项目改动加 scope (`feat(gateway): ...`).
- **四 manifest lockstep 同 bump** (tag 含 `v`, version 不含): `gateway/package.json` / `ele-autopilot/package.json` / `ele-autopilot-local/pyproject.toml` / `ele-autotesting/package.json`. 各 workflow 校验对应 manifest = tag 去 `v` (ele-autopilot-local 由 autopilot workflow 校验, 因 wheel 随其镜像构建), 不一致 fail.
- `ele-autopilot-local/pyproject.toml` bump 后必须 `cd ele-autopilot-local && uv lock` 同步 `uv.lock` 里 project 自身 version (editable entry), 否则与 pyproject 脱节, `uv sync --locked/--frozen` 校验 fail. 仅 version 变时 diff 只该行, 不动依赖.

### CHANGELOG 写作

面向使用者, 不是代码审计.

- 写: 新功能 / 行为修复 / 体验改进 / 安全 / 命令与入口迁移.
- 不写: 文件路径 / 组件名 / CSS class / 重构细节 / 元叙述 / "跟随版本同步发布" 之类占位条目.
- 单条 ≤ 2 行, 单版本 ≤ 5 条.
- **完全省略本版本段** 仅限该子项目本次纯版本号 bump (无代码 / 公开 API / 配置 / CLI 行为变化, manifest 仍 lockstep); 公开 API 导出 / 配置入口 / 开发者命令的增删按 Added / Removed / Changed 写, 即便最终用户层透明.
- 遵循 Keep a Changelog (Added / Changed / Fixed / Removed / Security); 中文行文, 术语保留原文.

## 2. 本地验证

按改动面跑对应子项目, 失败中断:

```bash
# gateway
cd gateway
bun install --frozen-lockfile && bun run typecheck && bun run build

# ele-autopilot
cd ele-autopilot
bun install --frozen-lockfile && bun run lint && bun run typecheck && bun run build
bun run smoke   # libSQL adapter: batch 回滚 + FK 级联

# ele-autopilot-local
cd ele-autopilot-local
uv sync && uv build
uv run python -c "from autopilot.app_meta import project_version; print(project_version())"

# ele-autotesting
cd ele-autotesting
pnpm install && pnpm run build   # core + ui + web + server bundle
pnpm run typecheck

# (可选) 整栈冒烟: cd deploy && docker compose build && docker compose up -d
```

## 3. 发布

```bash
git add .
git commit -m "release: vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin <branch> vX.Y.Z
```

> 用 annotated tag (`-a -m`): `tag.gpgsign=true` 时 lightweight tag 会被强制签名但缺 message → fail.

push `v*` tag → `.github/workflows/{gateway,autopilot,autotesting}.yml` 三 workflow 全部触发:

- `gateway`: `docker buildx build` → push `ghcr.io/<owner>/ele-qa-gateway:{<tag>,latest}`.
- `autopilot`: `docker buildx build` → push `ghcr.io/<owner>/ele-qa-autopilot:{<tag>,latest}`. (migrations 不在 CI apply; server 首启自建表, 见 `lib/db/migrate.ts`.) 镜像 `localwheel` 阶段 `uv build` ele-autopilot-local wheel 打进 `/app/releases` (`ele-autopilot-local.whl` + `local/latest.txt`), install.sh 直连.
- `autotesting`: `docker buildx build` → push `ele-qa-autotesting` + `ele-qa-markitdown` 两镜像.

镜像默认 `linux/amd64` (改目标架构见 workflow `platforms:`). 发完 workflow, 宿主 `cd deploy && docker compose pull && up -d` 滚动.

## 4. amend 修上版 bug

AI 自主识别 (信号: 反馈指向刚 push 的 tag / 改动极小仅修缺陷 / "刚那个" "刚发的"). commit 与 tag 同步更新, 触发 workflow 重跑.

```bash
git commit -a --amend --no-edit
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag -a vX.Y.Z -m "vX.Y.Z"
git push --force-with-lease origin <branch>
git push origin vX.Y.Z
```
