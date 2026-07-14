# ele-autopilot — Bun Node server (libSQL embedded + S3/MinIO).
# 跨架构构建用 docker buildx --platform=<目标> (让 @libsql/client native addon 装对二进制).

# ---- 阶段: 构建 ele-autopilot-local wheel, 打进镜像供内网 install.sh 直连 ----
# `local` 命名构建上下文指向 ../ele-autopilot-local
# (compose build.additional_contexts / CI docker/build-push-action build-contexts).
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS localwheel
WORKDIR /src
COPY --from=local . .
# wheel 保留 uv build 的合规原名 (pip/uv 从文件名解析 version/python/abi/platform tag, 不能改名).
# --out-dir /out/local 直接落到 releases/local/; latest.txt 供 install.sh 拼合规文件名 + gateway landing 展示.
RUN uv build --wheel --out-dir /out/local \
 && python3 -c "import tomllib;print(tomllib.load(open('pyproject.toml','rb'))['project']['version'])" > /out/local/latest.txt

FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ele-autopilot-local 发布产物: /app/releases/ele-autopilot-local.whl + /app/releases/local/latest.txt
# (releases.$.tsx 读 FS). 取代原 MinIO releases bucket + 宿主 mc cp 分发链.
COPY --from=localwheel /out ./releases

ENV NODE_ENV=production
ENV PORT=8080
# libSQL 库文件挂 volume /data (compose 提供); DATABASE_URL 由 env 覆盖.
ENV DATABASE_URL=file:/data/autopilot.db
VOLUME ["/data"]
EXPOSE 8080

# server.ts: 建 libSQL+S3 client, 跑 migrations, RR7 handler + runWithBindings.
CMD ["bun", "server.ts"]
