# ele-autopilot-local

macOS 本地浏览器自动化 HTTP 服务. `browser-use` + FastAPI + Gemini, uv. 随 autopilot 镜像 lockstep 发布 (localwheel 阶段打 wheel 进镜像), 经 gateway landing 一键装; 发布流程见 [../workflow.md](../workflow.md).

## 安装

打开 gateway landing (内网入口, 如 `http://<内网 IP>/`) → "本地 agent 安装" 区块, 复制三条命令依次执行. 等价于:

```bash
curl -fsSL <gateway host>/install.sh | bash
```

依赖 `uv` (未装时 install.sh 会提示一行 uv 安装命令). 可用 `VERSION=v1.4.9` 覆写版本.

## 使用

```bash
ele-autopilot
```

启动 FastAPI HTTP 服务于 `0.0.0.0:8000`. 无参数无子命令. LLM API Key 由 autopilot 集成中心通过 `/autopilot/run` payload 下发, 无需本地配置. API 文档: `http://localhost:8000/docs`.

## 自更新

重跑安装命令即可, 等价于 `uv tool install --reinstall <wheel-url>`.

## 开发

```bash
uv sync
uv run ele-autopilot                                  # 直接启动 (无 reload)
uv run uvicorn autopilot.cli:app --reload             # 开发模式 (热重载)
```
