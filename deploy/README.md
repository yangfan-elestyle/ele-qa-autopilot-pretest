# deploy — 内网单机 docker-compose

内网单机 docker-compose 承接 gateway + 三业务 + markitdown + MinIO. 迁移背景与决策见 [../plans/20260713-001/feature.md](../plans/20260713-001/feature.md).

## 拓扑

- **nginx**: 唯一对外入口 (裸 http, 绑内网 IP). 全部转发 gateway.
- **gateway**: 身份收口 (cookie / X-Auth-User-Email) + 路径分发 + 静态 landing.
- **autopilot** / **autotesting**: 业务, 各自 libSQL (`/data` volume) + 内网互通; **不对外**.
- **markitdown**: markitdown-mcp sidecar; **不对外**.
- **minio**: 对象存储 (screenshots bucket); **不对外**. (发布产物 wheel 不走对象存储, 随 autopilot 镜像自带.)

安全前提: **仅 nginx publish 端口**. 下游任一暴露端口 → 自带 `X-Auth-User-Email` 即冒充, 统一收口破.

## 本地构建 + 起

```bash
cd deploy
cp .env.example .env          # 改 MINIO_ROOT_PASSWORD 等
docker compose build
docker compose up -d
docker compose ps             # 等 healthy
# 访问 http://<BIND_ADDR>:<HTTP_PORT>/ (默认 :80)
```

## 生产 (GHCR 镜像)

CI (tag `vX.Y.Z`) build+push 四镜像到 GHCR (见 [../deploy.md](../deploy.md)). 宿主:

```bash
cd deploy
# .env 里把 *_IMAGE 指向 ghcr.io/<owner>/...:<tag>
docker compose pull
docker compose up -d
```

## go-live 一次性动作 (代码/编排已就绪, 以下需人工)

1. **GHCR secret**: workflow push 镜像需仓库对 GHCR 有写权限 (`GITHUB_TOKEN` 默认可, 私有 registry 另配).
2. **`.env`**: 填 `MINIO_ROOT_PASSWORD` / LLM / Confluence 凭据; 确认 `METERSPHERE_URL=https://qa.elepay.link` 内网可达; agentic-loop 迁移后填 `AGENTIC_LOOP_URL`.
3. **数据迁移** (从 CF 导出): D1 → `sqlite3 /var/lib/docker/volumes/deploy_autopilot_data/_data/autopilot.db < dump.sql` (含 `settings.llm_api_key`); autotesting 同理. R2 → `mc mirror` 到 MinIO screenshots bucket. (库为空时 server 首启自动建表, 无历史数据可跳过.)
4. **agent wheel**: 随 autopilot 镜像自带 (镜像 localwheel 阶段 `uv build`), 无需人工分发; 版本随镜像 lockstep, install.sh 直连 `/releases/ele-autopilot-local.whl`.
5. **员工机装 agent**: `curl -fsSL http://<内网入口>/install.sh | bash` (install.sh base URL 由 gateway 按 origin 下发, 自动适配内网地址).

## 备份

`docker volume` 三个卷: `deploy_autopilot_data` / `deploy_autotesting_data` / `deploy_minio_data`. 定期快照即可.
