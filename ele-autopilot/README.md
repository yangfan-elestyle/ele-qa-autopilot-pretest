# ele-autopilot

React Router v7 (Framework mode) Web 应用 — QA 任务管理后台. Cloudflare D1 持久化, Cloudflare R2 存截图, Ant Design + Tailwind UI. 运行时 Cloudflare Workers.

LLM 约束见 [AGENTS.md](./AGENTS.md); 发布流程见根 [deploy.md](../deploy.md), 一次性资源见根 [setup.md](../setup.md).

## 开发

```bash
bun install
bunx wrangler d1 migrations apply ele-autopilot --local   # 首次: 初始化 miniflare D1 schema
bun dev                                                    # http://localhost:3000
```

发布前验证 (lint / typecheck / build / wrangler deploy --dry-run) 见 [deploy.md §本地验证](../deploy.md#2-本地验证).

React DevTools 独立窗口: 必须先 `bunx react-devtools` 再 `bun dev`, 反序无效.

## 运维 (D1 / R2)

```bash
# 查 D1
bunx wrangler d1 execute ele-autopilot --remote --command "SELECT COUNT(*) FROM tasks"

# 查 R2 对象
bunx wrangler r2 object get ele-autopilot-screenshots/<key> --file ./out.png
bunx wrangler r2 bucket list

# 备份 / 还原 D1
bunx wrangler d1 export ele-autopilot --remote --output backup.sql
bunx wrangler d1 execute ele-autopilot --remote --file restore.sql
```

> D1 上限 10 GB (Workers Paid); R2 无单 bucket 上限 (按 storage + class A/B 操作计费).
