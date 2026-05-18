# 部署流程

AI 改完代码主动执行. push `v*` tag 触发根仓库 `.github/workflows/autotesting.yml`, CI 跑 D1 migrations + `wrangler deploy`.

> **Lockstep**: 三个子项目版本号统一, 任何 release push `v*` tag → 三个 workflow 同时构建. 即使本项目无业务改动也要 bump 到同一新版本并在 CHANGELOG 标注 "lockstep 同步". 见根 `AGENTS.md`.

## 1. 验证

```bash
pnpm install
pnpm run build:cf                                    # core + ui + web
pnpm --filter @prompt-optimizer/server exec wrangler d1 migrations apply DB --local
pnpm --filter @prompt-optimizer/server smoke         # 本地 wrangler dev 起来后另开终端跑
```

## 2. 写版本

- 版本号: 默认递增 PATCH (第三位); 新功能 → MINOR; 不兼容改动 → MAJOR.
- `package.json#version` 与 tag 一致 (tag 含 `v`, version 不含). Actions 第一步校验 tag 去 `v` 后等于 version, 不一致直接 fail.
- 新增 D1 schema → `packages/server/migrations/0002_xxx.sql` 递增, **不要改老 migration**. CI 部署前会幂等 apply.
- 新增 secret → `wrangler secret put <NAME>` 写 Cloudflare; 同步在 README 环境变量表里登记.

## 3. 发布

```bash
git add .
git commit -m "release: vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push yangfan-elestyle main vX.Y.Z
```

> 用 annotated tag (`-a -m`) 而非 lightweight: 兼容 `tag.gpgsign=true` 配置 (开启时 lightweight tag 会被强制升级为 signed 但缺 message → fail).

push tag 后 GitHub Actions `autotesting` 自动跑. push `main` 不再触发 CI, 但仍要推, 保持远端分支与 tag 一致.

首次部署额外步骤 (D1 库不存在时):

```bash
cd packages/server
npx wrangler d1 create <db-name>
# 输出的 database_id 回填 wrangler.jsonc 的 d1_databases[0].database_id
```

## 4. amend 修上版 bug

AI 自主识别 "刚发版的 bug, 不发新版" 场景 (信号: 反馈指向刚 push 的 tag / 改动极小仅修缺陷 / 语气暗示是上版延续如 "刚那个" "刚发的"). 此时:

> **commit + tag 必须同步更新**: amend 后 commit hash 变了, 远程 tag 仍指向旧 hash → Release artifact 与 main HEAD 分离. 只 force push commit 不够, 必须删远程 tag 后重打, 否则后续溯源会错位.

```bash
git commit -a --amend --no-edit
git tag -d vX.Y.Z
git push yangfan-elestyle :refs/tags/vX.Y.Z
git tag -a vX.Y.Z -m "vX.Y.Z"
git push --force-with-lease yangfan-elestyle main
git push yangfan-elestyle vX.Y.Z
```
