# ele-qa-autopilot

QA AutoPilot 合并仓库. `gateway` + 三个独立业务子项目并存; 非 monorepo workspace, 各自独立技术栈与包管.

全栈 AI-only (Claude Code / Codex 维护). Agent 工作准则见 [AGENTS.md](./AGENTS.md), 发布流程见 [deploy.md](./deploy.md).

## 子项目

<!-- prettier-ignore -->
| 子目录 | 角色 | 技术栈 | 部署目标 |
|---|---|---|---|
| [`gateway/`](./gateway) | 公网入口 + 路由分发 | TS / Bun + RR7 | CF Workers `qa` |
| [`ele-autopilot/`](./ele-autopilot) | 任务管理中心 + Web 后台 | TS / Bun + RR7 + React 19 + AntD + Tailwind | CF Workers + D1 + R2 |
| [`ele-autopilot-local/`](./ele-autopilot-local) | 本地浏览器执行 agent (macOS) | Python 3.12 / uv + FastAPI + browser-use | 本机 `0.0.0.0:8000` |
| [`ele-autotesting/`](./ele-autotesting) | AI 测试用例生成工具 | TS / pnpm + Vue3 + Hono | CF Workers + D1 + Container |

各子项目独立 README + AGENTS; 详细约束见子目录 `AGENTS.md`.

## 系统拓扑

唯一公网入口: gateway Worker `qa`, URL `https://qa.<account-sub>.workers.dev` (Cloudflare Zero Trust + Google Workspace SSO, 仅 `@elestyle.jp`). 路径分发表见 [gateway/README.md](./gateway/README.md#路径分发-worker-处理顺序).

```
                              ┌────────────────────────────┐
公网用户 (SSO) ─────────────► │ gateway (CF Worker `qa`)   │
                              └─┬──────────┬──────────────┬┘
                                │          │              │
                          /autotest/*    其他          /, /index.html
                                │          │              │
                       ┌────────▼───┐ ┌────▼────────┐ (landing)
                       │ele-autotest│ │ele-autopilot│
                       │ing (CF)    │ │ (CF+D1+R2)  │ ◄────┐
                       └────────────┘ └─────────────┘      │ HTTP callback
                                                           │
                                              ┌────────────┴────────┐
                                              │ ele-autopilot-local │
                                              │ macOS :8000         │
                                              └─────────────────────┘
```

### 运行时联动

- `ele-autopilot` 前端默认调本地 `http://127.0.0.1:8000` 创建 Job (`app/admin/_services/local-api.ts`).
- `ele-autopilot-local` 通过 `autopilot/callback.py` 回调 `ele-autopilot`; callback base URL 由后端按 request origin 下发, 经 gateway 变为公网入口.
- `ele-autotesting` 当前与 autopilot 运行时无耦合; 未来联动加 service binding.

## 发布

四子项目版本号 **lockstep**, 单一 tag `vX.Y.Z` 触发四个 workflow 同步部署. 流程 / 命令 / CHANGELOG 写作详见 [deploy.md](./deploy.md); 一次性 Secrets / Cloudflare 资源准备见 [setup.md](./setup.md).
