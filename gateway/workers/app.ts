/**
 * qa gateway — 唯一对外公网入口.
 *
 * 路径分发 (worker 处理顺序):
 *   /healthz       → "ok" (gateway 自检, 不进 RR)
 *   /autotest/*    → AUTOTEST (strip /autotest 前缀转发到 ele-autotesting)
 *   /index.html    → 301 重定向到 /
 *   /              → React Router (SSR landing 页)
 *   其他            → AUTOPILOT (透传, 含 /autopilot, /api/*, /screenshots/*, /releases/*, /install.sh, /favicon.ico)
 *
 * 静态资源 (RR 客户端 bundle) 由 wrangler assets binding 优先命中, 命中即返回; 未命中再 fall through 到本 worker.
 * 业务 Worker 已设 workers_dev:false, 仅可经此 gateway 访问.
 */

import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

// service binding fetch 出错时, CF runtime 默认会让异常冒到平台层变成无文案 5xx,
// 运维看到 gateway 报错却不知道是 AUTOPILOT 还是 AUTOTEST 故障. 这里包一层,
// 把目标名标在 status text + 自定义头 + body 里, 同时把堆栈写到 Worker tail.
async function forwardTo(
  name: "AUTOPILOT" | "AUTOTEST",
  binding: Fetcher,
  req: Request,
): Promise<Response> {
  try {
    return await binding.fetch(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[gateway] ${name} fetch failed: ${message}`);
    return new Response(`Bad Gateway: ${name} unreachable`, {
      status: 502,
      statusText: `${name} unreachable`,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-gateway-upstream": name,
      },
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === "/healthz") {
      return new Response("ok", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (p === "/autotest" || p.startsWith("/autotest/")) {
      const stripped = p.slice("/autotest".length) || "/";
      const forwarded = new URL(url);
      forwarded.pathname = stripped;
      return forwardTo("AUTOTEST", env.AUTOTEST, new Request(forwarded, request));
    }

    if (p === "/index.html") {
      const canonical = new URL(url);
      canonical.pathname = "/";
      return Response.redirect(canonical.toString(), 301);
    }

    if (p === "/") {
      return requestHandler(request, { cloudflare: { env, ctx } });
    }

    return forwardTo("AUTOPILOT", env.AUTOPILOT, request);
  },
} satisfies ExportedHandler<Env>;
