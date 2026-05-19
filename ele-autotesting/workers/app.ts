import { Container, getContainer } from "@cloudflare/containers";
import { createRequestHandler } from "react-router";

export class MarkitdownContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "10m";
  enableInternet = true;
}

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

const MARKITDOWN_PREFIX = "/mcps/markitdown";

function normalizeSub(sub: string): string {
  return sub === "/mcp" || sub === "/sse" ? `${sub}/` : sub;
}

async function handleMarkitdownProxy(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const sub = url.pathname.slice(MARKITDOWN_PREFIX.length) || "/";
  const devUrl = env.MARKITDOWN_DEV_URL?.trim();

  try {
    if (devUrl) {
      const target = new URL(devUrl.replace(/\/+$/, "") + normalizeSub(sub));
      target.search = url.search;
      return await fetch(new Request(target.toString(), request));
    }
    const upstream = new URL(url);
    upstream.pathname = normalizeSub(sub);
    const container = getContainer(env.MARKITDOWN, "singleton");
    return await container.fetch(new Request(upstream.toString(), request));
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`markitdown-proxy failed: ${detail}`);
    return new Response(
      JSON.stringify({ error: "markitdown upstream unavailable", detail }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

const RR_BASENAME = "/autotest";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // gateway 已 strip `/autotest`, 这里 markitdown 旁路按 strip 后路径判断, 不进 RR handler.
    if (url.pathname === MARKITDOWN_PREFIX || url.pathname.startsWith(`${MARKITDOWN_PREFIX}/`)) {
      return handleMarkitdownProxy(request, env);
    }
    // 把 strip 掉的 `/autotest` 加回来, 让 RR basename 剥离机制和 client 端浏览器 URL 对齐.
    const forwarded = new URL(url);
    forwarded.pathname = RR_BASENAME + (url.pathname === "/" ? "" : url.pathname);
    return requestHandler(new Request(forwarded, request), { cloudflare: { env, ctx } });
  },
} satisfies ExportedHandler<Env>;
