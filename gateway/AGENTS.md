# gateway

Cloudflare Worker `qa` — 三子项目唯一对外公网入口. Bun + TypeScript, 单文件 fetch handler, 无框架.

## 路径分发

| Path | 去向 | 说明 |
|---|---|---|
| `/` , `/index.html` | gateway 自身 | landing 双卡片 |
| `/healthz` | gateway 自身 | `ok` |
| `/autotest`, `/autotest/*` | `env.AUTOTEST.fetch` | strip `/autotest` 前缀后转发到 ele-autotesting |
| 其他 | `env.AUTOPILOT.fetch` | 原样透传到 ele-autopilot (`/autopilot*` / `/help` / `/api/*` / `/screenshots/*` / `/releases/*` / `/install.sh` / `/favicon.ico`) |

## Key Files

- `wrangler.jsonc`: `name=qa`, service bindings `AUTOPILOT` / `AUTOTEST`, `workers_dev=true`.
- `src/index.ts`: 全部业务逻辑 + 内嵌 landing HTML. 改 landing 改这一处.
- 无 D1 / R2 / DO / secret — gateway 纯路由层.

## Build & Deploy

```bash
bun install
bun run typegen        # 改 wrangler.jsonc 后必跑
bun run typecheck
bunx wrangler deploy --dry-run
bunx wrangler deploy   # 通常走 Actions, 不手动
```

## Release

- 触发: push `v*` tag (三子项目 + gateway lockstep, 见根 `AGENTS.md`).
- workflow: 根 `.github/workflows/gateway.yml`.
- 流程: 校验 tag = `package.json#version` → bun install → `wrangler deploy`.

## 边界

- gateway 不持有任何状态; D1 / R2 / Container 全在业务 Worker.
- 业务 Worker `workers_dev:false`, 不可绕过 gateway 直访.
- service binding 调用同 isolate, 零网络开销; 不计入 sub-request quota.
- 互调 (autopilot ↔ autotest) 暂未启用; 后续需要时在各自 wrangler 加 services 即可.
