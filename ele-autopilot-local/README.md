# ele-autopilot-local

本地浏览器自动化 HTTP 服务. 基于 `browser-use` + FastAPI + Gemini, LLM Agent 驱动本机 Chrome 异步执行任务. 打 tag → GitHub Actions 自动构建 wheel 并发布 release; 用户用 `install.sh` 一键安装.

## 安装

```bash
curl -fsSL https://raw.githubusercontent.com/yangfan-elestyle/ele-autopilot-local-pretest/main/install.sh | bash
```

依赖 `uv` (未装时 install.sh 会提示一行 uv 安装命令). 可用 `VERSION` / `REPO` 覆写.

## 使用

```bash
ELE_LLM_API_KEY=<your-gemini-api-key> ele-autopilot
```

直接启动 FastAPI HTTP 服务于 `0.0.0.0:8000`. 无参数无子命令. 启动后 API 文档:`http://localhost:8000/docs`.

## 自更新

```bash
curl -fsSL https://raw.githubusercontent.com/yangfan-elestyle/ele-autopilot-local-pretest/main/install.sh | bash
```

等价于 `uv tool install --reinstall <wheel-url>`.

## 开发

```bash
git clone https://github.com/yangfan-elestyle/ele-autopilot-local-pretest
cd ele-autopilot-local-pretest
uv sync
uv run ele-autopilot                                  # 直接启动 (无 reload)
uv run uvicorn autopilot.cli:app --reload             # 开发模式 (热重载)
```

## 发布

push `v*` tag 触发 [`.github/workflows/release.yml`](./.github/workflows/release.yml). 流程见 [deploy.md](./deploy.md), 改动记录见 [CHANGELOG.md](./CHANGELOG.md).
