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
[ele-autotesting]         [ele-autopilot] ◄──┐
 (独立, 生成用例)          (Web 后台/任务中心) │ HTTP callback
                                │  ▲           │
                                ▼  │           │
                          [ele-autopilot-local] ─┘
                          (本地 :8000, 驱动 Chrome)
```

## 发布

三子项目**版本号 lockstep**, 单一发布 tag `vX.Y.Z` (任一 tag push → 三 workflow 同步 redeploy). 实操流程见 [deploy.md](./deploy.md).

全栈 AI-only (Claude Code / Codex 维护).
