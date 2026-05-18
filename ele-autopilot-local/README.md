# ele-autopilot-local

本地浏览器自动化 HTTP 服务. 基于 `browser-use` + FastAPI + Gemini, LLM Agent 驱动本机 Chrome 异步执行任务. 打 tag → Actions 构建 wheel 推到 Cloudflare R2; 用户从 ele-autopilot Web 后台 `/help` 页一键安装.

## 安装

打开 ele-autopilot Web 后台 → 右上 `?` → `/help` 页, 复制命令执行. 等价于:

```bash
curl -fsSL <ele-autopilot host>/install.sh | bash
```

依赖 `uv` (未装时 install.sh 会提示一行 uv 安装命令). 可用 `VERSION=v1.4.9` 覆写版本.

## 使用

```bash
ELE_LLM_API_KEY=<your-gemini-api-key> ele-autopilot
```

启动 FastAPI HTTP 服务于 `0.0.0.0:8000`. 无参数无子命令. API 文档: `http://localhost:8000/docs`.

## 自更新

重跑安装命令即可, 等价于 `uv tool install --reinstall <wheel-url>`.

## 开发

```bash
uv sync
uv run ele-autopilot                                  # 直接启动 (无 reload)
uv run uvicorn autopilot.cli:app --reload             # 开发模式 (热重载)
```
