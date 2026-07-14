# 一次性配置

内网单机 docker-compose 部署. 编排细节见 [deploy/README.md](./deploy/README.md).

## GitHub

- workflow push 镜像到 GHCR 用内置 `GITHUB_TOKEN` (`permissions: packages: write`), 无需额外 secret.
- 首次 push 后到仓库 `Packages` 把四个镜像 (`ele-qa-gateway` / `ele-qa-autopilot` / `ele-qa-autotesting` / `ele-qa-markitdown`) 可见性设为宿主可拉 (私有则宿主 `docker login ghcr.io`).

## 宿主 (内网单机)

```bash
cd deploy
cp .env.example .env          # 填 LLM/Confluence 凭据;
                              # *_IMAGE 指向 ghcr.io/<owner>/...:<tag> (或留 :local 本地构建)
docker compose pull           # 或 docker compose build
docker compose up -d
```

- 仅 nginx publish 端口 (默认 `:80`, 改 `.env` 的 `BIND_ADDR`/`HTTP_PORT`); 下游全内网.
- 截图落 autopilot 持久卷 (`/data/screenshots`), 无独立存储服务.
- libSQL 库随容器 volume, server 首启自建表.
