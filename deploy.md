# 发布流程 (lockstep)

四项目 (gateway + 三业务) 版本号统一, 单一 `vX.Y.Z` tag 同步触发四 workflow.

## TL;DR

1. 四 manifest 同 bump + 有改动的 CHANGELOG 加段
2. 本地验证 (各项目 build / typecheck / dry-run)
3. `git commit -m "release: vX.Y.Z"` → `git tag -a vX.Y.Z -m "vX.Y.Z"` → `git push origin <branch> vX.Y.Z`
4. 等四 workflow success

> 一次性前置 (Secrets / Cloudflare 资源) 见 [setup.md](./setup.md), 默认无需主动处理.

## 1. 写版本

- 默认 PATCH; 新功能 MINOR; 破坏性 DB schema / API 响应结构 MAJOR.
- Tag 仅 `vX.Y.Z`; release commit 固定 `release: vX.Y.Z`; 其他改动用 Conventional Commits, 跨项目改动加 scope (`feat(gateway): ...`).
- **四 manifest lockstep 同 bump** (tag 含 `v`, version 不含): `gateway/package.json` / `ele-autopilot/package.json` / `ele-autopilot-local/pyproject.toml` / `ele-autotesting/package.json`. workflow 各自校验 manifest = tag 去 `v`, 不一致 fail.
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
# gateway 必须最先 build (下游 typegen 依赖其生成产物)
cd gateway
bun install --frozen-lockfile && bun run typecheck && bun run build
bunx wrangler deploy --dry-run

# ele-autopilot
cd ele-autopilot
bun install --frozen-lockfile && bun run lint && bun run typecheck && bun run build
bunx wrangler deploy --dry-run

# ele-autopilot-local
cd ele-autopilot-local
uv sync && uv build
uv run python -c "from autopilot.app_meta import project_version; print(project_version())"

# ele-autotesting
cd ele-autotesting
pnpm install && pnpm run build:cf
pnpm --filter @prompt-optimizer/server exec wrangler d1 migrations apply DB --local
pnpm --filter @prompt-optimizer/server smoke
```

## 3. 发布

```bash
git add .
git commit -m "release: vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin <branch> vX.Y.Z
```

> 用 annotated tag (`-a -m`): `tag.gpgsign=true` 时 lightweight tag 会被强制签名但缺 message → fail.

push `v*` tag → `.github/workflows/{gateway,autopilot,autopilot-local,autotesting}.yml` 四 workflow 全部触发:

- `gateway`: `bun build` (RR7 + `@cloudflare/vite-plugin`, 产物 `build/{client,server}`) → `wrangler deploy`. 唯一公网入口 `https://qa.<account-sub>.workers.dev`.
- `autopilot`: `bun build` → `wrangler d1 migrations apply ele-autopilot --remote` → `wrangler deploy`. `workers_dev:false`, 仅 gateway 经 service binding 调.
- `autopilot-local`: `uv build` → `checksums.txt` → `wrangler r2 object put` 推 `ele-autopilot-releases/local/<ver>/{wheel, sdist, checksums.txt}` + `local/latest.txt` (单行 `<ver>` 不含 `v`).
- `autotesting`: `pnpm build:cf` → `wrangler d1 migrations apply DB --remote` → `wrangler deploy`. `workers_dev:false`.

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
