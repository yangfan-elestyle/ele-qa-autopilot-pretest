// qa gateway — Node/Bun HTTP 入口 (替代原 CF Worker `workers/app.ts`).
// 唯一对外入口: 路径分发 + 身份收口 + 下游转发. 详见 ./README.md / ./AGENTS.md.
//
// 与 CF 版差异 (Phase B):
//   - service binding → 内网 HTTP fetch (AUTOPILOT_URL / AUTOTEST_URL).
//   - CF Access JWT → gateway 自签 cookie / X-Auth-User-Email 荣誉制 (lib/auth.ts).
//   - assets binding → 本地 build/client 静态托管 (Bun.file), 缺失则透传下游.

import { createRequestHandler, type ServerBuild } from "react-router";
import { fileURLToPath } from "node:url";
import { join, normalize, sep } from "node:path";

import { readEnv, type Env } from "./lib/env";
import { AUTH_HEADER } from "./lib/constants";
import {
  buildClearCookie,
  buildSetCookie,
  isAllowedEmail,
  loginPage,
  resolveUser,
  type AuthUser,
} from "./lib/auth";

declare module "react-router" {
  interface AppLoadContext {
    env: Env;
    user: AuthUser | null;
  }
}

const env = readEnv();
const MODE =
  process.env.NODE_ENV === "development" ? "development" : "production";

// 构建产物 (react-router build 产出). 运行时动态 import, 避免 typecheck 依赖构建物.
const build = (await import(
  new URL("./build/server/index.js", import.meta.url).href
)) as unknown as ServerBuild;
const rrHandler = createRequestHandler(build, MODE);

const CLIENT_DIR = fileURLToPath(new URL("./build/client", import.meta.url));

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function acceptsHtml(request: Request): boolean {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

// gateway 自己构建产物的静态托管 (landing 页 client assets). 目录穿越防护.
async function serveStatic(pathname: string): Promise<Response | null> {
  let rel: string;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (rel.includes("\0")) return null;
  const full = normalize(join(CLIENT_DIR, rel));
  if (full !== CLIENT_DIR && !full.startsWith(CLIENT_DIR + sep)) return null;
  const file = Bun.file(full);
  if (!(await file.exists())) return null;
  const headers = new Headers();
  if (pathname.startsWith("/assets/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return new Response(file, { headers });
}

// service binding → 内网 HTTP. 转发时删入站 AUTH_HEADER (防伪造透传), 再按需注入已解析 email.
async function forward(
  base: string,
  request: Request,
  url: URL,
  email: string | null,
  rewritePath?: string,
): Promise<Response> {
  const target = base + (rewritePath ?? url.pathname) + url.search;
  const headers = new Headers(request.headers);
  headers.delete(AUTH_HEADER);
  headers.delete("host");
  if (email) headers.set(AUTH_HEADER, email);
  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  try {
    const fwd = new Request(target, {
      method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
      // 流式转发请求体需要 half-duplex (undici / Bun).
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit);
    return await fetch(fwd);
  } catch (err) {
    const name = base === env.AUTOPILOT_URL ? "AUTOPILOT" : "AUTOTEST";
    console.error(
      `[gateway] ${name} fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return new Response(`Bad Gateway: ${name} unreachable`, {
      status: 502,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-gateway-upstream": name,
      },
    });
  }
}

// 免鉴权路径 (机器消费 / 登录页自身): 网络边界是真实防线, 这些端点天生无浏览器身份.
//   - /healthz (LB 探活)
//   - /login (GET/POST) + /logout (登录页自身)
//   - /install.sh + /releases/* (装机脚本 curl, 无 cookie)
//   - /api/v1/ingest/* (外部录入, 契约无鉴权)
//   - /api/jobs/*/callback/* (本地 agent 回调, 无 cookie)
function isBypass(pathname: string): boolean {
  if (pathname === "/healthz") return true;
  if (pathname === "/login" || pathname === "/logout") return true;
  if (pathname === "/install.sh") return true;
  if (pathname.startsWith("/releases/")) return true;
  if (pathname.startsWith("/api/v1/ingest/")) return true;
  if (/^\/api\/jobs\/[^/]+\/callback\//.test(pathname)) return true;
  return false;
}

async function handleLoginPost(request: Request): Promise<Response> {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const next = String(form.get("next") ?? "/") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (!isAllowedEmail(email, env.ALLOWED_EMAIL_DOMAIN)) {
    return new Response(
      loginPage({
        next: safeNext,
        domain: env.ALLOWED_EMAIL_DOMAIN,
        error: `请输入有效的 ${env.ALLOWED_EMAIL_DOMAIN} 邮箱`,
      }),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: safeNext,
      "set-cookie": buildSetCookie(email, env.COOKIE_MAX_AGE),
    },
  });
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const p = url.pathname;
  const method = request.method;

  if (p === "/healthz") return textResponse("ok");

  if (p === "/index.html") {
    const canonical = new URL(url);
    canonical.pathname = "/";
    return Response.redirect(canonical.toString(), 301);
  }

  // 登录页自身.
  if (p === "/login") {
    if (method === "POST") return handleLoginPost(request);
    const next = url.searchParams.get("next") ?? "/";
    return new Response(
      loginPage({ next, domain: env.ALLOWED_EMAIL_DOMAIN }),
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
  if (p === "/logout") {
    return new Response(null, {
      status: 302,
      headers: { location: "/login", "set-cookie": buildClearCookie() },
    });
  }

  // 静态资源优先 (gateway 自己的构建产物); 命中即返回, 否则继续路由.
  if (method === "GET" || method === "HEAD") {
    const stat = await serveStatic(p);
    if (stat) return stat;
  }

  // 免鉴权机器端点: 直接透传下游, 不注入身份.
  if (isBypass(p)) {
    if (p.startsWith("/api/") || p === "/install.sh" || p.startsWith("/releases/")) {
      return forward(env.AUTOPILOT_URL, request, url, null);
    }
    return textResponse("not found", 404);
  }

  // 统一鉴权.
  const user = resolveUser(request, env.ALLOWED_EMAIL_DOMAIN);
  if (!user) {
    if (acceptsHtml(request)) {
      const next = encodeURIComponent(p + url.search);
      return new Response(null, {
        status: 302,
        headers: { location: `/login?next=${next}` },
      });
    }
    return textResponse("Unauthorized", 401);
  }

  // /autotest/* → ele-autotesting (剥前缀), 注入 email.
  if (p === "/autotest" || p.startsWith("/autotest/")) {
    const stripped = p.slice("/autotest".length) || "/";
    return forward(env.AUTOTEST_URL, request, url, user.email, stripped);
  }

  // landing 页由本 gateway RR 应用 SSR.
  if (p === "/") {
    return rrHandler(request, { env, user });
  }

  // 其余 → ele-autopilot, 注入 email.
  return forward(env.AUTOPILOT_URL, request, url, user.email);
}

const server = Bun.serve({
  port: env.PORT,
  idleTimeout: 120,
  fetch(request) {
    return handle(request).catch((err) => {
      console.error("[gateway] unhandled:", err);
      return textResponse("Internal Server Error", 500);
    });
  },
});

console.log(`[gateway] listening on http://0.0.0.0:${server.port} (mode=${MODE})`);
