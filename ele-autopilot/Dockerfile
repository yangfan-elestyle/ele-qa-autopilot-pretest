# ele-autopilot — Bun Node server (libSQL embedded + S3/MinIO).
# 跨架构构建用 docker buildx --platform=<目标> (让 @libsql/client native addon 装对二进制).
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

ENV NODE_ENV=production
ENV PORT=8080
# libSQL 库文件挂 volume /data (compose 提供); DATABASE_URL 由 env 覆盖.
ENV DATABASE_URL=file:/data/autopilot.db
VOLUME ["/data"]
EXPOSE 8080

# server.ts: 建 libSQL+S3 client, 跑 migrations, RR7 handler + runWithBindings.
CMD ["bun", "server.ts"]
