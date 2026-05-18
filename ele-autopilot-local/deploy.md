# 部署流程

AI 改完代码主动执行. push `ele-autopilot-local/v*` tag 触发 Actions 构建并把产物推到 Cloudflare R2 (`ele-autopilot-releases`); ele-autopilot Worker 暴露 `/releases/local/*` `/install.sh` `/help` 给用户.

## 1. 验证

```bash
uv sync
uv build
uv run python -c "from autopilot.app_meta import project_version; print(project_version())"
```

`dist/` 下应出现 `ele_autopilot_local-X.Y.Z-py3-none-any.whl` 和 `.tar.gz`.

## 2. 写版本

- 版本号: 默认递增 PATCH (第三位); 新功能 → MINOR; 不兼容改动 → MAJOR.
- `pyproject.toml#version` 与 tag 一致 (tag 格式 `ele-autopilot-local/vX.Y.Z`, version 不含 namespace 和 `v`). Actions 校验 tag 末段去 `v` 后等于 version, 不一致直接 fail.
- `CHANGELOG.md` 顶部新增 `## [X.Y.Z] - YYYY-MM-DD` 段并列改动, 底部补 `[X.Y.Z]:` 占位.

## 3. 发布

```bash
TAG=ele-autopilot-local/vX.Y.Z
git add .
git commit -m "release(local): vX.Y.Z"
git tag -a "$TAG" -m "$TAG"
git push origin <branch> "$TAG"
```

> 用 annotated tag (`-a -m`) 而非 lightweight: 兼容 `tag.gpgsign=true` 配置 (开启时 lightweight tag 会被强制升级为 signed 但缺 message → fail).

Actions 自动: `uv build` → 校验 wheel 版本号 = tag → 生成 `checksums.txt` → `wrangler r2 object put` 上传到 `ele-autopilot-releases`:

- `local/<ver>/ele_autopilot_local-<ver>-py3-none-any.whl`
- `local/<ver>/ele_autopilot_local-<ver>.tar.gz`
- `local/<ver>/checksums.txt`
- `local/latest.txt` (单行 `<ver>`, 不含 `v`)

用户从 ele-autopilot Web 后台 `/help` 页一键安装 (Worker 据 `local/latest.txt` 解析最新版本, 走 `/releases/local/<ver>/...` 下载).

## 4. amend 修上版 bug

AI 自主识别 "刚发版的 bug, 不发新版" 场景 (信号: 反馈指向刚 push 的 tag / 改动极小仅修缺陷 / 语气暗示是上版延续如 "刚那个" "刚发的"). 此时:

> **commit + tag 必须同步更新**: amend 后 commit hash 变了, 远程 tag 仍指向旧 hash → R2 产物与 main HEAD 分离. 只 force push commit 不够, 必须删远程 tag 后重打, 否则 Actions 不会重跑构建.

```bash
TAG=ele-autopilot-local/vX.Y.Z
git commit -a --amend --no-edit
git tag -d "$TAG"
git push origin ":refs/tags/$TAG"
git tag -a "$TAG" -m "$TAG"
git push --force-with-lease origin <branch>
git push origin "$TAG"
```
