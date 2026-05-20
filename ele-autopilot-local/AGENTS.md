# ele-autopilot-local

macOS 本地浏览器自动化 HTTP 服务。FastAPI + `browser-use` + Gemini (`ChatGoogle`), uv 管理, LLM Agent 驱动本机 Chrome 执行任务.

版本 / 发布等通用规则见根 [AGENTS.md](../AGENTS.md) 与 [deploy.md](../deploy.md).

## Runtime

- 只支持 macOS: `autopilot/task.py` 写死 Chrome app 路径与 Chrome user data dir; 跨平台改动必须同步这两个常量与 profile 解析逻辑.
- 必需环境变量: `ELE_LLM_API_KEY`; 模板见 `.env.template`.
- 默认可视化运行: `headless=false`; `JobConfig.headless=true` 才无头.
- 安装 / 运行 / 构建都用 `uv`; 缺 `uv` 时按 Astral 官方安装脚本.
- 发布产物不走 GitHub Release; workflow 上传到 R2 `ele-autopilot-releases/local/<ver>/`.

## 执行链路

- `routers/autopilot.py`: `/autopilot/*` Job 创建、查询、停止、删除.
- `autopilot/job_service.py`: 创建 Job、内存存储、异步调度.
- `autopilot/job.py`: 串行执行 Task, 聚合 `PENDING -> RUNNING -> COMPLETED/FAILED`. 状态机与 server `ele-autopilot/lib/db/jobs.ts#syncJobStatusFromTasks` 必须保持一致.
- `autopilot/task.py`: 初始化 LLM / Browser, 调 `browser_use.Agent`.
- `autopilot/task_action.py`: 解析 `AgentHistoryList`, 提取 summary / steps / screenshots 等结构化信息.
- `autopilot/callback.py`: Server 集成模式下回调 `ele-autopilot`.

## 目录

- `autopilot/`: Job / Task 执行核心与 CLI.
- `routers/`: FastAPI 路由; 新路由文件必须在 `autopilot/cli.py` 注册.
- `schemas/`: Pydantic 请求 / 响应模型; 对外结构优先放这里.
- `middleware/`: 统一响应包装与异常处理 (`{code, message, data}`).
- `langchain/`: LangChain -> browser-use LLM 适配.
- `utils/`, `patches/`: 工具函数与第三方库 monkey patch.
- `scripts/help/`: 本地 CLI 辅助脚本.

## API

- 成功响应由中间件包装: `{"code": 0, "message": "success", "data": ...}`.
- 异常 `code` 使用 HTTP status: 400 / 404 / 422 / 500.
- `/autopilot/run` 支持本地模式 `tasks: string[]` 与 Server 集成模式 `tasks: TaskInput[]`; 集成模式需 `job_id` + `callback_url`.

## browser-use

- 依赖: `browser-use>=0.12.5`.
- 常见 action 名: `navigate` / `search` / `click` / `input` / `scroll` / `done`; 不要写 `click_element` / `input_text`.
- 关键类型: `Agent`, `Browser`, `AgentHistoryList`; 用 `final_result()` / `is_done()` / `model_actions()` 做结果提取与调试.
- `TaskRunner._build_agent_kwargs()` 只传非空 config 字段; 空字符串不得覆盖系统提示词.

## 命令

日常开发命令见 [README.md](./README.md#开发); 发布前验证 (`uv build` + version 自检) 见 [deploy.md §本地验证](../deploy.md#2-本地验证).

## 编码

- Python 3.12+, 4 空格缩进; import 分标准库 / 第三方 / 本地.
- 包 / 模块 / 函数 / 变量 `snake_case`; 类 `PascalCase`.
- 路由保持薄; 业务逻辑放 `autopilot/`, 数据结构放 `schemas/`.
- 依赖变更必须同步 `uv.lock`.
