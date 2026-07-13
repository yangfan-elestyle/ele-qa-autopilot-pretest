# ele-qa-autopilot

QA AutoPilot 合并仓库. `gateway` + 三个独立业务子项目并存; 非 monorepo workspace, 各自独立技术栈与包管.

全栈 AI-only (Claude Code / Codex 维护). Agent 工作准则见 [AGENTS.md](./AGENTS.md), 发布流程见 [deploy.md](./deploy.md).

## 子项目

<!-- prettier-ignore -->
| 子目录 | 角色 | 技术栈 | 部署目标 |
|---|---|---|---|
| [`gateway/`](./gateway) | 内网入口 + 路由分发 + 身份收口 | TS / Bun + RR7 | Docker (Bun) |
| [`ele-autopilot/`](./ele-autopilot) | 任务管理中心 + Web 后台 | TS / Bun + RR7 + React 19 + AntD + Tailwind | Docker (Bun) + libSQL + MinIO |
| [`ele-autopilot-local/`](./ele-autopilot-local) | 本地浏览器执行 agent (macOS) | Python 3.12 / uv + FastAPI + browser-use | 本机 `0.0.0.0:8000` |
| [`ele-autotesting/`](./ele-autotesting) | AI 测试用例生成工具 | TS / pnpm + Vue3 + Hono | Docker (Node) + libSQL + markitdown sidecar |

各子项目独立 README + AGENTS; 详细约束见子目录 `AGENTS.md`. 内网编排见 [deploy/](./deploy).

## 系统拓扑

内网单机 docker-compose, 无公网入口 (Phase B: 已抛弃 Cloudflare). 唯一对外 = nginx 反代 gateway (裸 http, 绑内网 IP). 身份由 gateway 自签 cookie + `X-Auth-User-Email` 荣誉制收口 (仅 `@elestyle.jp`). 路径分发表见 [gateway/README.md](./gateway/README.md#路径分发-worker-处理顺序).

```
                        ┌───────────┐   ┌────────────────────────┐
内网用户 ──► nginx ────► │  gateway  │   │  (compose 内部网络)     │
(cookie 登录)           │ (身份收口) │   │  下游均不对外暴露端口     │
                        └─┬───┬────┬┘   └────────────────────────┘
                          │   │    │
                    /autotest/*  其他   /, /index.html
                          │   │    │
                 ┌────────▼┐ ┌▼────────────┐ (landing)
                 │autotest │ │ ele-autopilot│
                 │ing      │ │ +libSQL+MinIO│ ◄────┐
                 │+libSQL  │ └──────────────┘      │ HTTP callback
                 │+markitd.│                       │
                 └─────────┘          ┌────────────┴────────┐
                                      │ ele-autopilot-local │
                                      │ macOS :8000         │
                                      └─────────────────────┘
```

### 运行时联动

- `ele-autopilot` 前端默认调本地 `http://127.0.0.1:8000` 创建 Job (`app/admin/_services/local-api.ts`).
- `ele-autopilot-local` 通过 `autopilot/callback.py` 回调 `ele-autopilot`; callback base URL 由后端按 request origin 下发, 经 gateway 变为内网入口.
- `ele-autotesting` → autopilot 的 ingest 走 compose 内网 HTTP (`AUTOPILOT_URL`), 不经 gateway.
- 外部系统经 `POST /api/v1/ingest/tasks` 直接录入 autopilot 任务 (内网可达, 无鉴权 bypass), 契约见 [ele-autopilot/docs/ingest-api.md](./ele-autopilot/docs/ingest-api.md).

## 发布

四子项目版本号 **lockstep**, 单一 tag `vX.Y.Z` 触发四个 workflow (build+push 镜像 / 产物). 流程 / 命令 / CHANGELOG 写作详见 [deploy.md](./deploy.md); 一次性 GHCR / MinIO / `.env` 准备见 [setup.md](./setup.md); 内网编排见 [deploy/README.md](./deploy/README.md).
