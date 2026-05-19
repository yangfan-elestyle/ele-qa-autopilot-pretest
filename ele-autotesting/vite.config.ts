import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    reactRouter(),
  ],
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
