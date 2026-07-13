# Ingest API (v1)

外部系统直接录入 task / chain 到 autopilot, 等同 web 表单录入. 内网可达 (gateway bypass, 无鉴权), **无幂等**.

## Endpoint

`POST /api/v1/ingest/tasks` — gateway Bypass `/api/*` 已覆盖.

## 请求

```jsonc
{
  "source": "autotesting",                  // 必填, 调用方自报家门, 1..64 字符
  "folder_path": ["AI 用例", "登录模块"],  // 必填, 非空数组, 每段 1..64 字符, 按层级 upsert
  "tasks": [                                 // 可选 (与 chain 至少一个非空)
    { "title": "未注册手机号登录失败", "text": "打开 https://..." },
    { "text": "无 title 时直接传 text" }
  ],
  "chain": {                                 // 可选 (与 tasks 至少一个非空)
    "title": "登录回归链",
    "text": "登录 → 下单 → 退出",
    "subs": [
      { "title": "step1", "text": "..." },
      { "title": "step2", "text": "..." }
    ]
  }
}
```

字段约束:

<!-- prettier-ignore -->
| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `source` | string | ✅ | trim 后 1..64 字符, 任意值, web UI 按该值色 hash 渲染角标 |
| `folder_path` | string[] | ✅ | 非空, 每段 trim 后 1..64 字符, 按 (name, parent_id) 完全相等匹配 upsert (区分大小写) |
| `tasks` | Task[] | 与 chain 至少一个 | 长度 0..1000 |
| `tasks[].title` | string \| null | ❌ | ≤200 字符 |
| `tasks[].text` | string | ✅ | trim 后非空 |
| `chain` | ChainObject | 与 tasks 至少一个 | — |
| `chain.title` | string | ❌ | ≤200 字符 |
| `chain.text` | string | ✅ | trim 后非空 |
| `chain.subs` | Task[] | ✅ (chain 存在时) | 非空数组, 长度计入 1000 上限 |

**总 task 数** `= tasks.length + (chain ? 1 + chain.subs.length : 0)`, 上限 `1000`.

## 响应

成功 `201`:

```jsonc
{
  "code": 0,
  "message": "success",
  "data": {
    "folder_id": "b2300b19-9854-430f-99b6-8e2cc600fd40",
    "tasks": [
      { "id": "4b6f6f62-b0b2-4eec-98fc-058a67784dcb" },
      { "id": "c451bf40-fbce-46fc-b0eb-832642d150b8" }
    ],
    "chain": {
      "id": "713b69a0-45fd-4b09-a697-17c820ba8f48",
      "sub_ids": ["82c79f57-...", "8d16a07e-..."]
    }
  }
}
```

- `tasks[].id` 顺序与请求 `tasks` 一致.
- `chain.sub_ids` 顺序与 `chain.subs` 一致.
- 无 chain 时不返回 `chain` 字段.

错误 `4xx` / `5xx`:

```json
{ "error": "`folder_path` must be a non-empty array of strings" }
```

错误码:

<!-- prettier-ignore -->
| 状态 | 触发 |
|---|---|
| 400 | JSON parse 失败 / 任一字段校验失败 / `tasks` + `chain` 全空 / 总 task 数 > 1000 |
| 405 | 非 POST 请求 (响应 `Allow: POST`) |
| 500 | DB 异常 |

## 行为

- **无幂等**: 重复推送同 payload 会产生 N 份记录. 调用方自行管理是否重发.
- **不做 update / delete**: 修改 / 删除走 autopilot web 工作台.
- **非原子写入**: 中途失败留半成品 (folder / 部分 task). 调用方可重新整 payload 重试; 残留 folder 可在 web UI 删.
- **folder 同名 sibling**: 表无 `(name, parent_id)` unique 约束, 并发推同 path 可能生成两条同名. 当前 ingest 调用方都是 batch / 低并发, 不补救.

## curl 示例

### 1. 仅 tasks

```bash
curl -X POST "$BASE/api/v1/ingest/tasks" -H 'Content-Type: application/json' -d '{
  "source": "autotesting",
  "folder_path": ["AI 用例", "登录"],
  "tasks": [
    { "title": "登录失败", "text": "输入错误密码确认有提示" }
  ]
}'
```

### 2. 仅 chain

```bash
curl -X POST "$BASE/api/v1/ingest/tasks" -H 'Content-Type: application/json' -d '{
  "source": "autotesting",
  "folder_path": ["AI 用例", "登录"],
  "chain": {
    "title": "登录回归链",
    "text": "登录 → 下单 → 退出",
    "subs": [
      { "title": "step1", "text": "..." },
      { "title": "step2", "text": "..." }
    ]
  }
}'
```

### 3. tasks + chain 混合

```bash
curl -X POST "$BASE/api/v1/ingest/tasks" -H 'Content-Type: application/json' -d '{
  "source": "autotesting",
  "folder_path": ["AI 用例", "登录"],
  "tasks": [{ "text": "独立 task" }],
  "chain": {
    "text": "chain 主体",
    "subs": [{ "text": "sub a" }, { "text": "sub b" }]
  }
}'
```

`$BASE` 取值: 本地 dev `http://localhost:3000`, 内网 gateway 入口 (如 `http://<内网 IP>`; ingest 走 gateway bypass).

## UI 表现

- `source !== 'manual'` 的 task / chain 在列表 / 选中抽屉 / 单 task 预览页头部渲染 `<SourceTag>` 角标.
- 角标颜色按 `source` 字符串 hash 到 7 色调色板 (blue / orange / green / red / purple / magenta / cyan), 同 source 颜色稳定.
- web UI 新建表单不暴露 `source` 字段, 默认 `manual`.
