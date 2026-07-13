# qa gateway — Bun Node server. 跨架构构建用 docker buildx --platform=<目标>.
FROM oven/bun:1

WORKDIR /app

# 先装依赖 (利用层缓存)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 源码 + 构建 RR7 产物 (build/server + build/client)
COPY . .
RUN bun run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# server.ts 动态 import build/server/index.js; 静态托管 build/client.
CMD ["bun", "server.ts"]
