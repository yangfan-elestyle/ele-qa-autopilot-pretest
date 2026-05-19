# gateway

Cloudflare Worker `qa`: 三个业务子项目的唯一公网入口。Bun + TypeScript, 单文件 fetch handler, 无框架、无状态.

## 路径分发

<!-- prettier-ignore -->
| Path | Target | Notes |
|---|---|---|
| `/`, `/index.html` | gateway | landing 双卡片 + 本地 agent 安装区块 (`/releases/local/latest.txt` 客户端 fetch) |
| `/healthz` | gateway | 返回 `ok` |
| `/autotest`, `/autotest/*` | `env.AUTOTEST.fetch` | strip `/autotest` 后转发到 `ele-autotesting` |
| 其他 | `env.AUTOPILOT.fetch` | 原样透传到 `ele-autopilot` |

AUTOPILOT 需接住 `/autopilot*` / `/api/*` / `/screenshots/*` / `/releases/*` / `/install.sh` / `/favicon.ico`.

## 关键文件

- `src/index.ts`: 全部路由逻辑 + 内嵌 landing HTML. 改 landing 只改这里.
- `wrangler.jsonc`: `name=qa`, `workers_dev=true`, service bindings `AUTOPILOT` / `AUTOTEST`.
- `worker-configuration.d.ts`: `wrangler types` 生成, 不手改; 改 `wrangler.jsonc` 后跑 `bun run typegen`.
- 无 D1 / R2 / DO / secret; gateway 只做路由.

## 命令

```bash
bun install
bun run typegen        # 改 wrangler.jsonc 后必跑
bun run typecheck
bunx wrangler deploy --dry-run
bunx wrangler deploy   # 常规走 Actions
```

## Release

- workflow: 根 `.github/workflows/gateway.yml`.
- 触发: push `v*` tag; 版本与三业务 lockstep, 见根 `AGENTS.md` / `deploy.md`.
- 流程: 校验 tag = `package.json#version` -> `bun install --frozen-lockfile` -> `wrangler deploy`.

## 边界

- 不在 gateway 放业务状态、数据库、R2、Container 或业务 API.
- 业务 Worker `workers_dev:false`; 公网只能经 gateway 访问.
- 互调 `autopilot <-> autotest` 暂未启用; 需要时在业务项目各自 `wrangler.jsonc` 加 service binding.
