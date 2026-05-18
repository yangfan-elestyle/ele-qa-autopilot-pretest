# ele-autopilot-local

本地浏览器自动化 HTTP 服务. 基于 `browser-use` + FastAPI + Gemini, LLM Agent 驱动本机 Chrome 异步执行任务. 改完代码 → 在 `CHANGELOG.md` 顶部新增版本段 → 按 [deploy.md](./deploy.md) 发布.

## AI-only 工程声明

本工程为 **AI-only 项目**, 人类不参与开发流程:

1. 代码编写、测试、构建、部署、发布 — 全部由 Claude Code 或 Codex 执行.
2. 设计决策 (架构/技术选型/目录结构/命名/依赖等) 以 Claude Code 或 Codex 的判断为准, **不需要参考人类开发者的惯例/最佳实践**, 除非该惯例本身就是 AI 自己的最优解.
3. 非必要不反问用户, 直接决策并执行 (deploy / 技术抉择 / 文档同步 / 版本号 / changelog 等).
4. 所有文档 (README / CHANGELOG / deploy.md / AGENTS.md / 注释等) 必须**简洁精炼、重点突出、零冗余** — 能一行讲清不写两行, 能用列表不用段落, 不堆砌背景/客套/重复信息. 宁可信息密度过载, 不要废话填充.

简言之: 用户角色 = 触发者 + 验收者, 不是协作开发者. 不要把人类拉进设计回路.

`pyproject.toml#version` 必须与 git tag 一致 (Actions 会做一致性校验, 不一致直接 fail).

## 边界

- 仅 macOS 本机运行: `autopilot/task.py` 中 `chrome_executable_path` 与 `chrome_user_data_dir` 写死 macOS 路径, 跨平台需同步改这两个常量.
- 必需环境变量: `ELE_LLM_API_KEY` (Gemini API key). 见 `.env.template`.
- `headless=false` 是默认 (用户可视化操作); `JobConfig.headless=true` 切无头.
- 装/跑都要 `uv`. 缺则: `curl -LsSf https://astral.sh/uv/install.sh | sh`.
- 不提交 `dist/`、`.venv/`、`.env` (已在 `.gitignore`).
- 发布渠道: Cloudflare R2 bucket `ele-autopilot-releases` (不走 GitHub Release). 用户通过 ele-autopilot Web 后台 `/help` 页 / Worker `/install.sh` 一键安装.

## 架构

- **HTTP Request** → `routers/autopilot.py` 接 Job 创建/查询/删除
- **JobService** (`autopilot/job_service.py`) 创建 Job、内存存储、异步调度
- **Job** (`autopilot/job.py`) 串行执行多个 Task, 聚合状态 (`PENDING → RUNNING → COMPLETED/FAILED`)
- **TaskRunner** (`autopilot/task.py`) 初始化 LLM/Browser, 调 `browser_use.Agent` 执行单个自然语言任务
- **TaskActionHandler** (`autopilot/task_action.py`) 解析 `AgentHistoryList`, 提取 summary/steps 等结构化信息用于日志/云端备份 payload

## 目录

- `autopilot/`: Job/Task 执行核心 (`cli.py`、`job_service.py`、`job.py`、`task.py`、`task_action.py`、`config.py`)
- `routers/`: 对外 API 路由 (`/system/*`、`/autopilot/*`); 新增路由文件需在 `autopilot/cli.py` 注册
- `schemas/`: Pydantic 请求/响应模型; 复用/对外暴露的结构优先放这里
- `middleware/`: 统一响应包装与异常处理 (`{code, message, data}`)
- `langchain/`: LLM 集成封装
- `utils/`, `patches/`: 工具与第三方库 monkey-patch
- `scripts/help/`: 本地 CLI 辅助脚本 (如 `run-cli.py`)

## API 响应规范

- 成功: `{"code": 0, "message": "success", "data": ...}` (由中间件统一包装)
- 异常: `code` 等于 HTTP status (400/404/422/500)

## browser-use 集成

- 依赖: `browser-use>=0.12.5` (见 `pyproject.toml`)
- 常见 action 名: `navigate`、`search`、`click`、`input`、`scroll`、`done`. **不要用 `click_element` / `input_text` 这类名字**.
- 关键类型: `Agent`、`Browser`、`AgentHistoryList` (用 `final_result()` / `is_done()` / `model_actions()` 做结果提取/调试)

## 编码

- 4 空格缩进, 分组导入 (标准库 / 第三方 / 本地)
- 包/模块 `snake_case`, 类 `PascalCase`, 函数/变量 `snake_case`
- 路由薄, 业务逻辑放 `autopilot/`, 数据结构放 `schemas/`

## 配置

- Build-time: `pyproject.toml#version` (Actions 校验 = tag)
- Runtime env: `ELE_LLM_API_KEY` (必需)
- Runtime HTTP 请求体 (见 `autopilot/config.py`):
  - `gemini_model` (默认 `gemini-3-flash-preview`)
  - `max_steps` (默认 1000)
  - `headless` (默认 false)
  - Agent 行为: `use_vision`、`max_failures`、`llm_timeout` 等

## 提交

- 风格: `<type>: <summary>` (e.g. `feat: add upload file support`).
- 依赖变更同步更新 `uv.lock`.
