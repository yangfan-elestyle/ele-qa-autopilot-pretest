# 一次性配置

首次部署前手动建 Secrets + Cloudflare 资源; workflow 不自动探测/创建.

## GitHub Secrets

- `CLOUDFLARE_API_TOKEN`: Workers / D1 / R2 编辑权限 ([Edit Cloudflare Workers 模板](https://dash.cloudflare.com/profile/api-tokens))
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare dashboard 主页右栏

## Cloudflare 资源

```bash
# ele-autopilot
bunx wrangler d1 create ele-autopilot                       # database_id 回填 ele-autopilot/wrangler.jsonc
bunx wrangler r2 bucket create ele-autopilot-screenshots
bunx wrangler r2 bucket create ele-autopilot-releases       # 共享, ele-autopilot-local 推产物

# ele-autotesting
cd ele-autotesting/packages/server
npx wrangler d1 create <db-name>                            # database_id 回填 packages/server/wrangler.jsonc
```

## Gateway 依赖

- 无独立 D1 / R2; 仅 service bindings (`ele-autopilot`, `ele-autotesting`).
- 两业务 Worker MUST 已至少部署过一次 (name 已在 account 存在).
- 首次 gateway 部署后两业务 Worker 关 workers.dev 公网入口; 唯一公开 URL `https://qa.<account-sub>.workers.dev`.
