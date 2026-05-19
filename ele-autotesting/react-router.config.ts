import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // 浏览器 URL 走 gateway `/autotest/*`; 通过 basename 让 SSR 渲染的 <Link>/<NavLink>
  // 与 client 端 BrowserRouter 都基于 `/autotest` 解析, 避免 hydration 后页面变 404.
  basename: "/autotest",
  future: {
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
