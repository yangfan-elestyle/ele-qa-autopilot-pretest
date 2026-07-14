# ele-autotesting

- native `@libsql/client` / `@resvg/resvg-js` 必须 esbuild external, 勿打进 bundle; `svgRenderer.ts` 依赖系统字体 (容器装 fonts-noto-cjk).
- 生产路径前缀 `/autotest` (gateway 剥掉): web `BASE_URL` / UI `apiBase` / core `setProxyBasePath()` 及 `/stream-proxy` `/http-proxy` 必须同带此前缀, 否则错转 AUTOPILOT.
- 前端 `migrationFlagKey` 固定占位 `cf-access`, 勿改值 (改了触发存量用户本地→云端重同步).
- 只用 pnpm (`engines.node >= 24`); 新 migration `packages/server/migrations/000N_*.sql` 递增 (纯 SQLite, 首启幂等 apply), 勿 DROP / RENAME 已有列.
