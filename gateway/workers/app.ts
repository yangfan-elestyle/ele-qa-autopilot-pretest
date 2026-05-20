/**
 * qa gateway — 唯一对外公网入口.
 *
 * 路径分发 (worker 处理顺序):
 *   /healthz       → "ok" (gateway 自检, Bypass)
 *   /index.html    → 301 重定向到 /
 *   Bypass 路径    → 不校验 JWT, 直通 AUTOPILOT (含 /install.sh / /api/* / /releases/* / /assets/*)
 *   其他           → 强制 CF Access JWT 校验 (Google Workspace SSO) 后路由:
 *                    /autotest/* → strip 前缀转发 AUTOTEST
 *                    /          → React Router SSR landing
 *                    其余        → AUTOPILOT 透传
 *
 * CF Access 已在前置网关层 (Zero Trust Self-hosted Application `QA Gateway`) 拦截; 此处
 * verifyAccessJwt 是深度防御. 本地 dev (无 cf-access-jwt-assertion header) 直接放行.
 * Bypass 路径名单必须与 Zero Trust `QA Gateway Bypass` Application 的 Application Domain
 * 名单逐项对齐, 见 ./README 或 AGENTS.md "Access" 段.
 */

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

// CF Access Bypass 路径: 必须与 Zero Trust `QA Gateway Bypass` Application 的
// Application Domain 名单逐项对齐. 改这里前先改 CF 后台, 反之亦然.
function isBypassPath(pathname: string): boolean {
  if (pathname === "/healthz") return true;
  if (pathname === "/install.sh") return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/releases/")) return true;
  if (pathname.startsWith("/assets/")) return true;
  return false;
}

// Access 默认每 6 周轮换签名密钥, jose 内部 JWKS 有 TTL, 模块级缓存避免每次冷启动
// 重复创建 fetcher (cf workers 在 isolate 复用期间共享此变量).
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks(teamDomain: string) {
  if (!cachedJwks) {
    cachedJwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
  }
  return cachedJwks;
}

async function verifyAccessJwt(
  request: Request,
  env: Env,
): Promise<{ email: string } | null> {
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) {
    // 没有 header 一般只有两种场景:
    //   1) 本地 dev: 没有 CF Access 注入 → 放行不阻塞开发;
    //   2) production 配置漏配 (Allow App 没生效 / 整站直连 worker): 也放行
    //      避免一次性把整站打 503; CF Access 一旦回归就会自动拦截.
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
    // 校验失败 = 伪造 / 过期 / aud 不匹配, 必须拒绝
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

    // Bypass 路径: 不校验 JWT, 直通 AUTOPILOT (install / api / releases / assets)
    if (isBypassPath(p)) {
      return forwardTo("AUTOPILOT", env.AUTOPILOT, request);
    }

    // 非 Bypass 路径: 走 JWT 校验, 提取 user (失败 throw Response)
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
