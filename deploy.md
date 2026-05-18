# 发布流程 (lockstep)

三子项目版本号统一, 单一 `v*` tag 同步触发三 workflow. 改完代码 → 各子项目 `CHANGELOG.md` 顶部新增版本段 → 按下文打 tag.

## 1. 写版本

- 版本号: 默认递增 PATCH; 新功能 → MINOR; 不兼容改动 (含破坏性 DB schema / API 响应结构变化) → MAJOR.
- **三项目同步 bump** (lockstep): `ele-autopilot/package.json#version` / `ele-autopilot-local/pyproject.toml#version` / `ele-autotesting/package.json#version` 必须全部改到同一新版本号 (tag 含 `v`, version 不含). 三 workflow 各自校验本项目 manifest = tag 去 `v`, 不一致直接 fail.
- 无业务改动的项目 CHANGELOG 标注 `lockstep 同步, 与上游 vX.Y.Z 一同发布` 占位.
- `CHANGELOG.md` 顶部新增 `## [X.Y.Z] - YYYY-MM-DD` 段 + Added/Changed/Fixed/Removed; 底部补 `[X.Y.Z]: <compare-url>`.
- D1 schema 变更必须向后兼容 (`ALTER TABLE ... ADD COLUMN`, 禁止 `DROP` / `RENAME` 已有列). 新增 migration:
  - `ele-autopilot/migrations/NNNN_<desc>.sql` (`wrangler d1 migrations create ele-autopilot <desc>`)
  - `ele-autotesting/packages/server/migrations/0002_<desc>.sql` 递增

## 2. 本地验证

按改动面跑对应子项目检查, 任意失败中断不要打 tag:

```bash
# ele-autopilot
cd ele-autopilot
bun install --frozen-lockfile && bun run lint && bun run typecheck && bun run build
bunx wrangler deploy --dry-run            # 验证 bindings + worker 大小

# ele-autopilot-local
cd ele-autopilot-local
uv sync && uv build                       # dist/ 下应出现 wheel + sdist
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

> 用 annotated tag (`-a -m`) 而非 lightweight: 兼容 `tag.gpgsign=true` (开启时 lightweight tag 会被强制升级为 signed 但缺 message → fail).

push `v*` tag → 根 `.github/workflows/{autopilot,autopilot-local,autotesting}.yml` 三 workflow 全部触发, 各自构建+部署:

- `autopilot`: 校验 tag → `bun install --frozen-lockfile` → `bun run build` → `wrangler d1 migrations apply ele-autopilot --remote` → `wrangler deploy`. 成功后 Worker URL: `https://ele-autopilot.<account-subdomain>.workers.dev`.
- `autopilot-local`: 校验 tag → `uv build` → 生成 `checksums.txt` → `wrangler r2 object put` 推到 `ele-autopilot-releases/local/<ver>/{wheel, sdist, checksums.txt}` + `local/latest.txt` (单行 `<ver>`, 不含 `v`). 用户从 ele-autopilot Web 后台 `/help` 页一键安装.
- `autotesting`: 校验 tag → `pnpm install` → `pnpm run build:cf` → `wrangler d1 migrations apply DB --remote` → `wrangler deploy`.

## 4. amend 修上版 bug

AI 自主识别 "刚发版的 bug, 不发新版" 场景 (信号: 反馈指向刚 push 的 tag / 改动极小仅修缺陷 / 语气暗示是上版延续如 "刚那个" "刚发的"). 此时:

> **commit + tag 必须同步更新**: amend 后 commit hash 变了, 远程 tag 仍指向旧 hash → 部署产物与 main HEAD 分离. 只 force push commit 不够, 必须删远程 tag 后重打, 否则 Actions 不会重跑.

```bash
git commit -a --amend --no-edit
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag -a vX.Y.Z -m "vX.Y.Z"
git push --force-with-lease origin <branch>
git push origin vX.Y.Z
```

amend 禁用条件: Workers 已基于该 tag 上线并接流量 → 必须发新 PATCH 版.

## 5. 前置 (一次性)

GitHub 仓库 Secrets:

- `CLOUDFLARE_API_TOKEN`: Workers / D1 / R2 编辑权限 ([创建方式](https://dash.cloudflare.com/profile/api-tokens) → "Edit Cloudflare Workers" 模板).
- `CLOUDFLARE_ACCOUNT_ID`: Account ID (Cloudflare dashboard 主页右栏).

Cloudflare 资源 (各子项目独立, 手动一次性创建, workflow 不再探测/创建):

```bash
# ele-autopilot
bunx wrangler d1 create ele-autopilot                       # database_id 回填 ele-autopilot/wrangler.jsonc
bunx wrangler r2 bucket create ele-autopilot-screenshots
bunx wrangler r2 bucket create ele-autopilot-releases       # 共享, ele-autopilot-local 推产物

# ele-autotesting
cd ele-autotesting/packages/server
npx wrangler d1 create <db-name>                            # database_id 回填 packages/server/wrangler.jsonc
```

## 6. 数据库 / 存储管理 (operator)

`ele-autopilot` D1 / R2 常用命令:

```bash
# 查 D1
bunx wrangler d1 execute ele-autopilot --remote --command "SELECT COUNT(*) FROM tasks"

# 查 R2 对象
bunx wrangler r2 object get ele-autopilot-screenshots/<key> --file ./out.png
bunx wrangler r2 bucket list

# 备份 D1 (SQL dump)
bunx wrangler d1 export ele-autopilot --remote --output backup.sql

# 还原 / 批量插入
bunx wrangler d1 execute ele-autopilot --remote --file restore.sql
```

> D1 单库上限: 10 GB (Workers Paid). R2 无单 bucket 上限 (按 storage / class A/B 操作计费).
