import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("models", "routes/models.tsx"),
  route("templates", "routes/templates.tsx"),
  route("history", "routes/history.tsx"),
  route("data", "routes/data.tsx"),
  route("settings", "routes/settings.tsx"),

  route("healthz", "routes/api/healthz.tsx"),
  route("api/sync/items", "routes/api/sync.items.tsx"),
  route("api/sync/items/:key", "routes/api/sync.items.$key.tsx"),
  route("api/sync/batch", "routes/api/sync.batch.tsx"),
  route("stream-proxy", "routes/api/stream-proxy.tsx"),
  route("http-proxy", "routes/api/http-proxy.tsx"),
  route("confluence-parse", "routes/api/confluence-parse.tsx"),
  route("figma-parse", "routes/api/figma-parse.tsx"),
  route("markdown-research", "routes/api/markdown-research.tsx"),
  route("image-research/analyze", "routes/api/image-research.tsx"),
] satisfies RouteConfig;
