# ele-autopilot-local

macOS 本地浏览器自动化 HTTP 服务. `browser-use` + FastAPI + Gemini, uv. 打 tag 后 Actions 构建 wheel 推到 Cloudflare R2, 用户从 gateway landing 一键安装.

## 安装

打开 gateway landing (`https://qa.<account-sub>.workers.dev/`) → "本地 agent 安装" 区块, 复制三条命令依次执行. 等价于:

```bash
curl -fsSL <gateway host>/install.sh | bash
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
