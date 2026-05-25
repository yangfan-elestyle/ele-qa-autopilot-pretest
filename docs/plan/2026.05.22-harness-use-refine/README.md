# harness 用例编排优化

## 背景

`autotesting` → `harness oneshot` → `autopilot` 链路当前在转换环节用【传话人】prompt (原样复述), 没用到 harness 推理能力. 这一步是 **测试用例 → browser-use 任务** 的核心, 需要真正做编排 (补全起点 / 动作 / 数据 / 验证, 把业务意图编排成可执行步骤序列).

## 现状链路 (代码锚点)

<!-- prettier-ignore -->
| 环节 | 位置 |
|------|------|
| 聚合用例 | `ele-autotesting/packages/ui/src/components/MeterSphereDataPanel.vue` `buildAggregatedFromItems` |
| prompt 模板 | `ele-autotesting/packages/ui/src/composables/usePromptPresets.ts:17` `DEFAULT_PROMPT_PRESETS` |
| oneshot 透传 | `ele-autotesting/packages/server/src/routes/harness.ts` |
| 切片回填 | `ele-autotesting/packages/ui/src/components/SendToAutopilotModal.vue` `parseHarnessText` / `enrichMsTask` |
| 录入 | `/api/autopilot/ingest` → `ele-autopilot` → `ele-autopilot-local` browser-use Agent |

数据协议: 聚合文本按 `=== CASE N: <title> ===` 分块, harness 输出保持同样头部分隔, 前端切片回填.

## 核心诊断: 测试用例 ≠ browser-use 任务

<!-- prettier-ignore -->
| 维度 | MS 测试用例 | browser-use 任务需要 |
|------|------------|---------------------|
| 起点 | 隐含 | 明示 URL + 登录态 |
| 动作 | 业务语言 ("查看订单") | DOM 动作 ("点击 [注文一覧] → 等待表格") |
| 数据 | 前置条件描述 | 明示账号 / 密码 / 商户 ID |
| 验证 | 人类视角 ("显示成功") | 可机器判定 (toast 含某文本 / URL 跳转) |

## 方案 (一步到位)

prompt preset 改薄壳 + harness plugin 沉淀知识 + EleVault MCP 拉 Confluence + 并行 fan-out + 自检, 一次落地, 不分阶段.

### 1. 前端 prompt preset 改薄壳

`ele-autotesting/packages/ui/src/composables/usePromptPresets.ts` 新增 `qa-browser-orchestrator` preset, 仅保留入口指令 (输入协议 / 输出协议 / 拉起哪个 plugin agent), 不写公司知识. URL / 账号 / 术语全部下沉 plugin.

### 2. 新建 `.harness/plugins/qa-orchestrator/` (ele-harness 仓库, 仿 `shipper`)

<!-- prettier-ignore -->
```
qa-orchestrator/
  plugin.json
  AGENTS.md
  CLAUDE.md
  agents/
    case-batch-coordinator.md   # 入口, 切片 + fan-out (类比 release-task-collector)
    case-to-browser-task.md     # 单条深度编排, 出四段式 (类比 release-task-analyzer)
    case-self-checker.md        # 产物校验
  skills/
    elestyle-test-envs/SKILL.md   # URL 表 / 账号池 / 商户 ID 池
    browser-use-patterns/SKILL.md # selector / 等待 / 验证最佳实践
    business-glossary/SKILL.md    # OneQR (Retailing/Restaurant/Parking) / ELEPAY / BUSINESS 术语 + 业务线→URL
```

调用端 `appendSystemPrompt` 拉起 `case-batch-coordinator`. 公司知识 git 管理, 不再塞前端 textarea.

### 3. 并行 fan-out + 自检

`case-batch-coordinator` 按用例数 fan-out N 个 `case-to-browser-task` 子 agent (`agentic-loop` 原生嵌套并行), 每条产物经 `case-self-checker` 校验四要素 (起点 URL / DOM 动作 / 验证点 / 失败标志) 齐全才回收, 不齐回炉重编排.

### 4. EleVault MCP 联动

`.harness/mcp.json` 已注册 EleVault MCP (http://10.219.206.102:9090/mcp), `shipper/agents/elevault-deep-searcher.md` 是现成调用样板. 用例命中 `参考 PRD-xxx` / 业务流程图 / Figma 等线索时, agent 主动拉 Confluence 文档拼上下文.

## 配套资料

skill 输入与 plugin 评分锚点已就位:

<!-- prettier-ignore -->
| 文件 | 用途 | 落点 |
| --- | --- | --- |
| [staging-urls.md](./staging-urls.md) | Sys / Dashboard / Business / ACQ 四套主 Web 工程 staging URL 全量清单 (按工程定位 + 路径分组) | `skills/elestyle-test-envs/SKILL.md` |
| [business-glossary.md](./business-glossary.md) | 上述四套工程业务术语 (中日英三语 + 实体归属链 + 同名异义辨析) | `skills/business-glossary/SKILL.md` |
| [example.md](./example.md) | hand-written browser-use 任务样例 (ACQ 加盟店申請新規 邀请流程) | `case-self-checker` 评分锚点 + plugin few-shot 样本 |

其余项 (账号池 / browser-use 常见坑 / 失败标志库 / 业务流程图 / 端末×角色矩阵 / 测试数据约束 / EleVault 命中线索) 不再单独整理, 由 plugin agent 实战中通过 EleVault MCP 拉取或迭代积累.
