# ele-autopilot

React Router v7 (Framework mode) Web 应用 — QA 任务管理后台. Cloudflare D1 持久化, Cloudflare R2 存截图, Ant Design + Tailwind UI. 运行时 Cloudflare Workers.

## 开发

```bash
bun install
bunx wrangler d1 migrations apply ele-autopilot --local   # 首次: 初始化 miniflare D1 schema
bun dev                                                    # http://localhost:3000
bun run typecheck && bun run lint && bun run format
bun run build && bun run preview                           # wrangler dev 模拟生产
```

React DevTools 独立窗口: 必须先 `bunx react-devtools` 再 `bun dev`, 反序无效.

## 发布

```bash
# 1. 改 package.json#version (与 tag 不含 v 一致, 三子项目 lockstep 同步)
# 2. CHANGELOG.md 顶部新增 ## [X.Y.Z] - YYYY-MM-DD
git commit -am "release: vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin <branch> vX.Y.Z
```

push `v*` tag → GitHub Actions (校验版本 → build → `wrangler d1 migrations apply --remote` → `wrangler deploy`). 三子项目 lockstep, 同一 tag 三 workflow 同步触发, 详见根 [deploy.md](../deploy.md).

前置 (一次性): GitHub Secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, D1 (`ele-autopilot`) 与 R2 (`ele-autopilot-screenshots`) 手动创建并将 `database_id` 写入 `wrangler.jsonc`.
