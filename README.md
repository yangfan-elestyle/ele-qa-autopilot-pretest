# ele-qa-autopilot

QA AutoPilot 系统合并仓库. 三个独立子项目共存:

<!-- prettier-ignore -->
| 子目录 | 角色 | 技术栈 | 部署 |
|---|---|---|---|
| [`ele-autopilot/`](./ele-autopilot) | 任务管理中心 + Web 后台 | RR7 + Bun + Cloudflare Workers + D1 + R2 | CF Workers |
| [`ele-autopilot-local/`](./ele-autopilot-local) | 本地浏览器执行 agent (macOS) | FastAPI + browser-use + uv + Python 3.12 | 本机 :8000 |
| [`ele-autotesting/`](./ele-autotesting) | AI 测试用例生成工具 | Vue3 + Hono + pnpm + Cloudflare Workers + Container | CF Workers |

## 系统关系

```
[ele-autotesting]           [ele-autopilot] ◄──┐
 (独立, 生成用例)            (Web 后台/任务中心) │
                                  │ ▲           │ HTTP callback
                                  ▼ │           │
                          [ele-autopilot-local] ─┘
                          (本地 :8000, 驱动 Chrome)
```

## 工程口径

- 详细架构与开发规则: [AGENTS.md](./AGENTS.md)
- 子项目内部规则: 各子目录 `AGENTS.md` / `CLAUDE.md`
- 三个子项目**独立发布**, tag 格式 `<project>/vX.Y.Z`
- 全栈 AI-only (Claude Code / Codex 维护)
