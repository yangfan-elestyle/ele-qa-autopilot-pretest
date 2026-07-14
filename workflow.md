# 发布流程 (lockstep)

四项目 (gateway + 三业务) 版本号统一, 单一 `vX.Y.Z` tag 同步触发三 workflow (build + push 镜像; ele-autopilot-local wheel 随 autopilot 镜像构建打进去). 内网单机 docker-compose 部署见 [deploy/README.md](./deploy/README.md).

## TL;DR

1. `scripts/set-version.sh X.Y.Z` bump 版本 (根 VERSION + 四 manifest + uv.lock) + 根 `CHANGELOG.md` 加段
2. 本地验证 (各项目 build / typecheck / smoke)
3. `git commit -m "release: vX.Y.Z"` → `git tag -a vX.Y.Z -m "vX.Y.Z"` → `git push origin <branch> vX.Y.Z`
4. 等三 workflow success (镜像推到 GHCR; agent wheel 已随 autopilot 镜像自带)
5. 宿主 `cd deploy && docker compose pull && up -d` (拉新镜像滚动)

> 一次性前置 (GHCR / `.env`) 见 [deploy/README.md](./deploy/README.md#go-live-一次性动作), 默认无需主动处理.

## 1. 写版本

- 默认 PATCH; 新功能 MINOR; 破坏性 DB schema / API 响应结构 MAJOR.
- Tag 仅 `vX.Y.Z`; release commit 固定 `release: vX.Y.Z`; 其他改动用 Conventional Commits, 跨项目改动加 scope (`feat(gateway): ...`).
- **版本唯一真值 = 根 `VERSION`** (纯 `X.Y.Z`, 不含 `v`); 四子项目 lockstep 同此号. bump 只跑一条命令, 不手改 manifest:
  ```bash
  scripts/set-version.sh X.Y.Z   # 写 VERSION + 三 package.json + pyproject.toml, 内部 uv lock 同步 uv.lock editable version
  ```
- 三 workflow 各先校验 `v$(cat VERSION)` = tag, 再校验对应 manifest = tag 去 `v` (ele-autopilot-local 由 autopilot workflow 校验, 因 wheel 随其镜像构建), 任一不一致 fail; 故 manifest 必须 = VERSION.

### CHANGELOG 写作

单一根 `CHANGELOG.md`, 版本优先降序. 面向使用者, 不是代码审计.

- 新版本加一个 `## [X.Y.Z] - YYYY-MM-DD` 段, 段内按 Keep a Changelog 类别 (Added / Changed / Fixed / Removed / Security) 分组.
- 每条 bullet 标注受影响子项目 scope `- **<scope>**: ...` (`gateway` / `autopilot` / `autopilot-local` / `autotesting`); 多子项目同一改动只记一次, 可省 scope.
- 写: 新功能 / 行为修复 / 体验改进 / 安全 / 命令与入口迁移. 不写: 文件路径 / 组件名 / CSS class / 重构细节 / 元叙述 / 占位条目.
- 单条 ≤ 2 行, 单子项目单版本 ≤ 5 条; 纯版本号 bump 且无任何行为变化时可完全省略本版本段. 公开 API 导出 / 配置入口 / 开发者命令增删按 Added / Removed / Changed 写, 即便最终用户层透明.
- 中文行文, 术语保留原文.

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
