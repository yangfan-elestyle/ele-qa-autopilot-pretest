import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import pkg from "./package.json";

export default defineConfig({
  // 公网入口在 gateway `/autotest/*` 下; RR7 的 `basename` 只管路由匹配, 不影响
  // 构建产物里 SSR HTML 引用的 client asset URL. 必须用 vite `base` 让所有 emit
  // 的资源 URL 带 `/autotest/` 前缀, 浏览器才能加载到 hydration bundle.
  base: "/autotest/",
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    reactRouter(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      // handlebars 的主入口在 Node.js 端会引用 require.extensions + node:fs,
      // Cloudflare Workers 不支持 node:fs, alias 到浏览器 bundle (不含 fs 路径) 即可.
      handlebars: "handlebars/dist/handlebars.js",
    },
  },
  server: {
    port: 18181,
  },
});
