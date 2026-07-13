# ele-autotesting — Node server (Hono, libSQL embedded, esbuild bundle).
# 跨架构构建用 docker buildx --platform=<目标> (让 @libsql/client / @resvg/resvg-js native 装对二进制).
FROM node:24-bookworm

WORKDIR /app
RUN corepack enable

# CJK 字体: @resvg/resvg-js loadSystemFonts 渲染 figma SVG→PNG 需要 (services/svgRenderer.ts).
RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

COPY . .
RUN pnpm install --frozen-lockfile && pnpm run build

ENV NODE_ENV=production
ENV PORT=8080
ENV WEB_DIST_DIR=/app/packages/web/dist
ENV MIGRATIONS_DIR=/app/packages/server/migrations
ENV DATABASE_URL=file:/data/autotesting.db
VOLUME ["/data"]
EXPOSE 8080

CMD ["node", "packages/server/dist/server.mjs"]
