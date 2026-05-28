# harness 用例编排优化

> **DEPRECATED 协议片段**: 本文档落地时使用的 case 切片协议是 `=== CASE N: <title> ===` 头行. 已被 **FCB-CASE (Fenced Case Block) 协议** 取代 (每个 case 用 ` ```case id=N title="..." ` 开 fence + ` ``` ` 闭 fence 包裹). 新协议事实源:
> - 工程实现: `ele-autotesting` 的 `MeterSphereDataPanel.vue:buildAggregatedFromItems` / `AutotestCasesPanel.vue:buildAggregatedFromItems` / `SendToAutopilotModal.vue:parseHarnessText` / `parseTestCases.ts`
> - LLM prompt 信源: `ele-harness/.harness/plugins/qa-orchestrator/skills/qa-browser-orchestrator/SKILL.md` 的 "FCB-CASE 协议" 段
>
> 本规划文档保留作历史归档, 涉及 `=== CASE` 字样请以当前代码 / SKILL.md 为准.

## 背景

`autotesting` → `harness oneshot` → `autopilot` 链路当前在转换环节用【传话人】prompt (原样复述), 没用到 harness 推理能力. 这一步是 **测试用例 → browser-use 任务** 的核心, 需要真正做编排 (补全起点 / 动作 / 数据 / 验证, 把业务意图编排成可执行步骤序列).

## 现状链路 (代码锚点)

<!-- prettier-ignore -->
| 环节 | 位置 |
|------|------|
| 聚合用例 | `ele-autotesting/packages/ui/src/components/MeterSphereDataPanel.vue:558` `buildAggregatedFromItems` |
| prompt 模板 | `ele-autotesting/packages/ui/src/composables/usePromptPresets.ts:13` `DEFAULT_PROMPT_PRESETS` |
| harness 拼装 | `ele-autotesting/packages/ui/src/components/SendToAutopilotModal.vue:380` `buildHarnessPrompt` |
| oneshot 透传 | `ele-autotesting/packages/server/src/routes/harness.ts` (`prompt` / `systemPrompt?` / `appendSystemPrompt?`) |
| 切片回填 | `ele-autotesting/packages/ui/src/components/SendToAutopilotModal.vue:384` `parseHarnessText` / `:615` `enrichMsTask` |
| 录入 | `/api/autopilot/ingest` → `ele-autopilot` → `ele-autopilot-local` browser-use Agent |

## 核心诊断: 测试用例 ≠ browser-use 任务

<!-- prettier-ignore -->
| 维度 | MS 测试用例 | browser-use 任务需要 |
|------|------------|---------------------|
| 起点 | 隐含 | 明示 URL + 登录态 |
| 动作 | 业务语言 ("查看订单") | DOM 动作 ("点击 [注文一覧] → 等待表格") |
| 数据 | 前置条件描述 | 明示账号 / 密码 / 商户 ID |
| 验证 | 人类视角 ("显示成功") | 可机器判定 (toast 含某文本 / URL 跳转) |

## 方案 (一步到位)

前端 preset 改薄壳 + harness plugin `qa-orchestrator` 沉淀知识 + 入口 skill 编排 fan-out + EleVault MCP 拉 Confluence + 自检回炉. 一次落地, 不分阶段.

## 调用协议

### harness oneshot 三参分工

<!-- prettier-ignore -->
| 参数 | 内容 | 来源 |
| --- | --- | --- |
| `prompt` | 聚合文本本身 (多个 `=== CASE N: ===` 块串接) | `buildAggregatedFromItems` 产出, 不变 |
| `appendSystemPrompt` | 指令 LLM 调用 `Skill({ skill: 'qa-orchestrator:qa-browser-orchestrator', args: <prompt> })` | 前端 preset template |
| `systemPrompt` | 不传 (避免覆盖 agentic-loop 默认) | — |

agentic-loop 收到 `appendSystemPrompt` 时, 注入到默认 system 末尾并加 "MUST follow" 强调 (`agentic-loop/src/engine/runtime.ts:1322`).

### 输入字段结构 (`prompt` 内容)

每条 case 块格式 (来自 `buildAggregatedFromItems`):

```
=== CASE N: <name> ===
模块: <moduleName>
前置: <prerequisite>           # 可选
步骤:                          # caseEditType=STEP 时
1. <desc> → 期望: <result>
2. ...
描述: <textDescription>        # caseEditType=TEXT 时 (与"步骤"互斥)
期望: <expectedResult>         # 可选
标签: <tag1>, <tag2>           # 可选
```

多个 case 用 `\n\n` 分隔.

### 输出强约束 (LLM 最终产出)

`parseHarnessText` 按行扫描 `=== CASE N: <title> ===`, 头部缺失或 N 错位 → 切片失败:

- **必须**保留 `=== CASE N: <title> ===` 头, N 与输入对齐 (下游 `resolveSource` 按 caseIndex 关联 MS 详情)
- **必须**多 case 全输出, 顺序与输入一致
- body 形态: 起点 URL → 登录检查 → 多页面分段 (每段 `页面【xx】:` + DOM 动作) → 提交确认 → 关闭. 完整范例见 `assets/example-acq-invitation.md`

## Plugin 骨架

新建 `ele-harness/.harness/plugins/qa-orchestrator/`, 仿 `shipper`:

<!-- prettier-ignore -->
```
qa-orchestrator/
  plugin.json                              # name / version / description
  AGENTS.md                                # LLM-facing, 3 行风格 (仿 shipper)
  agents/
    case-to-browser-task.md                # background=true, 单条深度编排
    case-self-checker.md                   # 前景, maxTurns=5, 校验产物
  skills/
    qa-browser-orchestrator/SKILL.md       # 入口, Flow 编排 (切片 → fan-out → 自检 → 拼接)
  assets/
    example-acq-invitation.md              # 标杆样本, 被 agent 用相对路径引用
    elestyle-test-envs.md                  # 知识: Sys/Dashboard/Business/ACQ 全量 URL
    business-glossary.md                   # 知识: 中日英术语 + 实体归属链
    browser-use-patterns.md                # 知识: selector / 等待 / 验证 最佳实践
```

命名空间: `qa-orchestrator:<name>` (skill / agent 自动加前缀).

EleVault MCP 已在 `.harness/mcp.json` 全局注册, **plugin.json 不重复注册**.

## 入口 skill `qa-browser-orchestrator` (LLM 触发点)

`skills/qa-browser-orchestrator/SKILL.md`:

<!-- prettier-ignore -->
```
---
name: qa-browser-orchestrator
description: 把 MS 测试用例聚合文本编排成 browser-use 任务序列. 输入 === CASE N: === 块串接, 输出同头部 + 可执行步骤.
when_to_use: prompt 含 === CASE N: <title> === 头部协议, 需要转 browser-use 任务时.
arguments: aggregatedCases
---

# Role
QA Browser Orchestrator. 单一职责: 用例 → browser-use 任务. Flow 编排 fan-out + 自检.

# Flow

## Step 1 — 切片
按 === CASE N: <title> === 头切 $aggregatedCases, 得 N 条 case (含 title / 字段块).

## Step 2 — 并发编排
对每条 case, 单次回复内并排发起独立 `Agent(subagent_type='qa-orchestrator:case-to-browser-task', run_in_background: true, prompt=<该 case 完整文本>)`.
【Must】单 turn 并排 N 个 tool_use, 禁串行; analyzer 无本 skill 上下文, prompt 必须自包含.

## Step 3 — 自检循环
N 条产物全部回收后, 对每条调 `Agent(subagent_type='qa-orchestrator:case-self-checker', prompt=<产物>)`. 不通过条目重派 case-to-browser-task, 最多回炉 2 次, 第 3 次直接采纳并在头部加 `⚠ 自检未通过` 标记.

## Step 4 — 拼接输出
按 caseIndex 升序拼 N 条产物, 用 `\n\n` 分隔. 保留每条原 === CASE N: === 头.

# Output
拼接后的纯文本. 禁前后包裹解释 / 代码块 / 摘要. text 块 = 唯一交付物.
```

## 子 agent 职责

<!-- prettier-ignore -->
| Agent | frontmatter 关键字段 | 职责 |
| --- | --- | --- |
| `case-to-browser-task` | `background: true` | 单条 case 深度编排. 必要时 `Read` 知识 asset (`elestyle-test-envs.md` / `business-glossary.md` / `browser-use-patterns.md`) + EleVault MCP (用例命中 PRD-xxx / 业务流程图等线索时). few-shot 参考 `@assets/example-acq-invitation.md`. 输出: `=== CASE N: <title> ===` 头 + body. |
| `case-self-checker` | `maxTurns: 5` | 按检查清单逐项校验, 输出 `pass: true/false` + `missing: [<项>]` 列表. 评分锚点 `@assets/example-acq-invitation.md`. |

## case-self-checker 检查清单

<!-- prettier-ignore -->
| 检查项 | 通过条件 |
| --- | --- |
| 输出格式 | `=== CASE N: <title> ===` 头保留, N 与输入一致 |
| 起点 URL | 含 `https://*.stg.elepay.dev` 或明确 staging 域名 |
| 登录态 | 含"登录检查"或"已登录"判定动作 |
| DOM 动作 | 每页 ≥ 1 个"点击 / 填入 / 勾选 / 选择" |
| 数据明示 | 涉及账号 / 密码 / ID / 数值时给具体值, 禁占位符 |
| 验证点 | 终态有"跳转 / 提交成功 / toast 含 xxx" 等可机器判定描述 |

## 前端 preset 改造

`ele-autotesting/packages/ui/src/composables/usePromptPresets.ts` `DEFAULT_PROMPT_PRESETS` 增项 `qa-browser-orchestrator`:

- `template`: 极薄, 仅声明输入/输出协议, 不写公司知识. 内容例:
  ```
  调用 skill qa-orchestrator:qa-browser-orchestrator, args 为下方【】内聚合文本.
  输出严格按 === CASE N: <title> === 切片格式, 多 case 顺序与输入一致.
  ```
- 调用端: `SendToAutopilotModal.vue` 把 template 内容作为 `appendSystemPrompt` 传给 `/api/harness/oneshot`, `prompt` 仍是聚合文本本身.

保留旧 `passthrough` (传话人) preset 作回退.

## EleVault MCP 联动

`.harness/mcp.json` 已注册 EleVault MCP (http://10.219.206.102:9090/mcp). `case-to-browser-task` 用例命中 `参考 PRD-xxx` / 业务流程图 / Figma 等线索时, 在 agent body 内仿 `shipper/agents/elevault-deep-searcher.md` 三阶段 (收集候选 → 精匹配 → 拉取全文) 调用 `mcp__EleVault__query_knowledge` + `mcp__EleVault__get_document`, 不直绕过.

## 配套资料

skill 输入与 plugin 评分锚点已就位:

<!-- prettier-ignore -->
| 文件 | 用途 | 落点 |
| --- | --- | --- |
| [staging-urls.md](./staging-urls.md) | Sys / Dashboard / Business / ACQ 四套主 Web 工程 staging URL 全量清单 | `assets/elestyle-test-envs.md` |
| [business-glossary.md](./business-glossary.md) | 上述四套工程业务术语 (中日英三语 + 实体归属链 + 同名异义辨析) | `assets/business-glossary.md` |
| [example.md](./example.md) | hand-written browser-use 任务样例 (ACQ 加盟店申請新規 邀请流程) | `assets/example-acq-invitation.md` |

其余项 (账号池 / browser-use 常见坑 / 失败标志库 / 业务流程图 / 端末×角色矩阵 / 测试数据约束 / EleVault 命中线索) 不再单独整理, 由 plugin agent 实战中通过 EleVault MCP 拉取或迭代积累.
