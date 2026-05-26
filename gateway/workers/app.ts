// qa gateway 唯一对外公网入口. 路径分发 / Access 规则见 ./README.md 与 ./AGENTS.md.
// verifyAccessJwt 是深度防御 (CF Access 前置网关已拦截), 本地 dev 缺 header 时放行.
// JWT 校验逻辑与 ele-autopilot/lib/access-auth.ts 同构: 优先 `cf-access-jwt-assertion` header,
// 回退 `CF_Authorization` cookie. 当前所有非 Bypass 路径都走 CF Access Allow App, header 必有;
// cookie 回退是为与 autopilot 参考实现对齐, 同时为未来可能新增的 Bypass 路径预留兜底.

import { createRequestHandler } from "react-router";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
    user: { email: string } | null;
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

// 把 service binding 出错标到 status text / x-gateway-upstream / body, 方便定位是哪个 upstream 挂了.
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

// 必须与 Zero Trust `QA Gateway Bypass` Application 的 Domain 名单双向锁同步.
function isBypassPath(pathname: string): boolean {
  if (pathname === "/healthz") return true;
  if (pathname === "/install.sh") return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/releases/")) return true;
  if (pathname.startsWith("/assets/")) return true;
  return false;
}

// 模块级缓存 JWKS fetcher, 避免冷启动重复创建; jose 内部按密钥 TTL 自动刷新.
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks(teamDomain: string) {
  if (!cachedJwks) {
    cachedJwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
  }
  return cachedJwks;
}

function extractCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return part.slice(eq + 1).trim();
      }
    }
  }
  return null;
}

async function verifyAccessJwt(
  request: Request,
  env: Env,
): Promise<{ email: string } | null> {
  const token =
    request.headers.get("cf-access-jwt-assertion") ??
    extractCookie(request, "CF_Authorization");
  if (!token) {
    // 本地 dev 无注入, 或生产配置漏配; 两种场景都放行避免整站打 503.
    return null;
  }
  try {
    const { payload }: { payload: JWTPayload } = await jwtVerify(
      token,
      getJwks(env.TEAM_DOMAIN),
      {
        issuer: env.TEAM_DOMAIN,
        audience: env.POLICY_AUD,
      },
    );
    const email = typeof payload.email === "string" ? payload.email : "";
    return { email };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[gateway] CF Access JWT verify failed: ${message}`);
    throw new Response("Forbidden: invalid CF Access token", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === "/healthz") {
      return new Response("ok", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (p === "/index.html") {
      const canonical = new URL(url);
      canonical.pathname = "/";
      return Response.redirect(canonical.toString(), 301);
    }

    if (isBypassPath(p)) {
      return forwardTo("AUTOPILOT", env.AUTOPILOT, request);
    }

    let user: { email: string } | null;
    try {
      user = await verifyAccessJwt(request, env);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    if (p === "/autotest" || p.startsWith("/autotest/")) {
      const stripped = p.slice("/autotest".length) || "/";
      const forwarded = new URL(url);
      forwarded.pathname = stripped;
      return forwardTo("AUTOTEST", env.AUTOTEST, new Request(forwarded, request));
    }

    if (p === "/") {
      return requestHandler(request, { cloudflare: { env, ctx }, user });
    }

    return forwardTo("AUTOPILOT", env.AUTOPILOT, request);
  },
} satisfies ExportedHandler<Env>;
