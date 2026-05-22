# QA AutoPilot 联动 Plan

> autotesting 作为入口与编排者, MeterSphere (用例库) ⇄ harness (browser-use 任务生成器) ⇄ autopilot (任务管理/执行) 三方串成单一链路.

## 1. 端到端链路

```
[MeterSphere]  ⇄  [ele-autotesting UI 向导]  →  [ele-harness /v1/oneshot]
   ↑ 回写用例          │  素材+模板+模型        ↓ browser-use 任务文本/分步
   └────────── 拉用例 ─┘                       │
                       ▼                       │
                  用户 review / 编辑  ◄────────┘
                       ▼
            [ele-autopilot /api/v1/ingest/tasks]
                       ▼
              [autopilot Web 工作台 (人工管理)]
                       ▼
       [autopilot-local / 未来 harness 执行端] 实跑浏览器
```

**边界**: MeterSphere 与 harness/browser-use **完全解耦**, MS 不感知执行结果; harness 仅生成, 不录入 autopilot.

**网络**: MeterSphere (`https://qa.elepay.link/`) 是 ele-fly 上的 Tailscale 内网服务, autotesting Worker 经 cloudflared tunnel + Workers VPC service `metersphere-backend` 反向到达, 复用 harness 同一 tunnel `ele-server`. 拓扑 / 资源 ID / 创建命令 / wrangler 接入 / Key 处理 / 验收, 详见 [PLAN-vpc.md](./PLAN-vpc.md).

## 2. 组件职责与改动

<!-- prettier-ignore -->
| 组件 | 角色 | 主改动 | 新依赖 |
|---|---|---|---|
| ele-autotesting | 流程入口 + 编排 | MS 客户端 + harness 客户端 + autopilot ingest 客户端 + 向导 UI | MS API key, harness base URL |
| ele-harness | browser-use 任务生成器 | 新增 `autotest-browseruse` plugin (skill + MCP + 模板) | 无 (在 ele-harness 仓库交付) |
| ele-autopilot | 任务库 + 工作台 | 复用 `/api/v1/ingest/tasks`, 可选给 source=`autotesting` 加二级标签 | 无 |
| ele-autopilot-local | 浏览器执行端 | 不动 (后续可接 harness 执行端) | 无 |
| MeterSphere | 外部用例库 | 不动, 提供 API key | — |

## 3. autotesting UI 向导 (5 步)

1. **来源选择**: 新建 / 从 MS 拉取 (按 project + module 树多选).
2. **素材输入**: 需求文档 / Figma / Confluence / 截图 (复用现有 research 链路).
3. **生成用例**: 调原有 `testcase-generator` → 表格化用例 (Excel 导出保留).
4. **生成执行任务**: 勾选行 → 调 harness `/v1/oneshot` (源 `autotesting`) → 返回 task/chain 草稿, 行内 review/编辑.
5. **同步**:
   - 推 autopilot: 调 `POST /api/v1/ingest/tasks` (一次提交 folder_path + tasks/chain).
   - 回写 MS: 调 MS 用例 API upsert (仅用例正文, 不写 browser-use 任务体).
   - 两者独立勾选, 失败可单独重试; 显示返回的 `folder_id` / `task ids`.

## 4. 关键接口

<!-- prettier-ignore -->
| 方向 | Endpoint | 链路 | 说明 |
|---|---|---|---|
| MS → autotesting | `GET /functional/case/...` (MS 官方) | VPC `METERSPHERE` | 列表/详情, 透传用户态 MS Key |
| autotesting → MS | `POST /functional/case/add` / `update` | VPC `METERSPHERE` | 仅写用例正文 + 步骤, 不写执行任务 |
| autotesting → harness | `POST /v1/oneshot` (SSE 可选) | 公网 harness Worker + CF Access service token | 入参 `prompt` = 用例 + 任务生成指令; 出参 `lastAssistantText` = browser-use 任务文本; 不再为 autotesting 直连 `agentic-loop-backend`, 见 [PLAN-vpc.md §7](./PLAN-vpc.md) 取舍 |
| autotesting → autopilot | `POST /api/v1/ingest/tasks` | 公网 gateway | 既有契约见 `ele-autopilot/docs/ingest-api.md`, `source: "autotesting"` |

## 5. ele-harness 侧产物 (在 ele-harness 仓库交付)

- Plugin `autotest-browseruse/`:
  - Skill `gen-browseruse-task`: 输入 `{caseTitle, steps, targetUrl, env}`, 输出 browser-use 可吃的中文分步指令 (chain.subs 一一对应).
  - 可选 MCP: 站点探测 / 选择器辅助 (按需).
  - 并发: 多用例并行通过 `Agent` 子会话扇出, 主会话汇总.
- 不入 ele-qa-autopilot 仓库; 通过 harness `/v1/capabilities/install` 部署.

## 6. autotesting 工程层改动

- `packages/server/wrangler.jsonc`: 加 `METERSPHERE` VPC binding + `bun run typegen`, 配置细节见 [PLAN-vpc.md §4](./PLAN-vpc.md).
- 新增 `packages/server` 路由:
  - `/api/ms/projects` / `/api/ms/modules` / `/api/ms/cases` (走 `env.METERSPHERE.fetch`, 从 D1 取用户 MS Key 透传 header)
  - `/api/ms/cases:upsert` (回写, 同上)
  - `/api/harness/oneshot` (代理到 `QA_HARNESS_BASE`, 公网, 带 CF Access service token)
  - `/api/autopilot/ingest` (代理到 `QA_AUTOPILOT_INGEST_BASE`, 公网 gateway)
- 新增 `packages/ui` 组件: `MsKeyForm` (设置入口, 存 D1 owner KV)、`MsImportPanel`、`BrowserUseTaskEditor`、`IngestConfirmDialog`.
- 新增 secrets (wrangler secret put, 仅服务端): `QA_HARNESS_BASE`, `QA_HARNESS_ACCESS_CLIENT_ID`, `QA_HARNESS_ACCESS_CLIENT_SECRET`, `QA_AUTOPILOT_INGEST_BASE`. **MeterSphere 相关无 server secret** — base URL 固定走 VPC binding, key 是用户态.
- D1 新增:
  - prefs 增一行 `metersphere_key` (复用 sync owner 隔离, 加密 at rest 视后续)
  - 新表 `ms_sync_log(id, case_id, direction, status, payload_hash, created_at)` 便于去重/排障

## 7. 里程碑

<!-- prettier-ignore -->
| 里程碑 | 范围 | 关键产出 |
|---|---|---|
| M0 VPC 通道 | autotesting ⇄ MS 网络可达 | ✅ VPC service `metersphere-backend` 已建; 待 worker 绑定 + 烟雾 (步骤见 [PLAN-vpc.md](./PLAN-vpc.md)) |
| M1 MS 通路 | autotesting ⇄ MS 双向打通 | MS 客户端 + 拉/写 + 用户态 Key 表单 + 向导步骤 1 / 5(回写) |
| M2 Harness 生成 | autotesting → harness | harness plugin v0 + autotesting 向导步骤 4 + 任务编辑器 |
| M3 Autopilot 录入 | autotesting → autopilot | ingest 调用 + 失败重试 + folder_path 规则约定 |
| M4 一体化 + 监控 | 全链路打磨 | sync_log + smoke test + 文档 (`docs/qa-loop.md`) |

## 8. 开放点 (Open)

- MS API 版本 / 路径以实际接入实例为准 (`qa.elepay.link` 跑的 MS 版本 + 一份样例用例 JSON).
- harness 调用走公网入口 `https://harness.<account>.workers.dev` + CF Access service token; 是否改为给 autotesting 也创第二个 VPC service 直连 `agentic-loop` 容器 (跳过 harness Worker / CF Access), 待评估收益.
- MS Key 在 D1 是否加密 at rest (sqlcipher 不支持; 走 envelope encrypt 用 wrangler secret 当 KEK), M1 决定.
- folder_path 命名规则: 建议 `["MS", <project>, <module-path...>]`, 待用户确认.
- 执行端切换 (autopilot-local → harness 执行端) 非本期范围, 留接口位.
