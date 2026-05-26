// CF Access JWT 校验 - 给 /api/admin/* 高敏感端点 (e.g. settings/llm-key) 自保护用.
//
// 背景: gateway `QA Gateway Bypass` Application 对 /api/* 整段 bypass + Everyone,
// 业务 Worker 不能依赖 gateway JWT 校验. 高敏感路由必须自己校验 cookie/header.
//
// JWT 来源 (按顺序):
// 1. `cf-access-jwt-assertion` header — Allow App 路径下由 CF Access 注入
// 2. `CF_Authorization` cookie — Bypass 路径下 CF 不注入 header, 但浏览器仍携带 cookie
//
// 校验通过返回 email; 失败抛 Response (401 / 403). caller try/catch 后返回给客户端.
// 配套要求: wrangler.jsonc#vars 持有 TEAM_DOMAIN / POLICY_AUD (与 gateway 同源).

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks(teamDomain: string) {
  if (!cachedJwks) {
    cachedJwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
  }
  return cachedJwks;
}

function extractCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
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

type AccessEnv = { TEAM_DOMAIN?: string; POLICY_AUD?: string };

export type AccessUser = { email: string };

/**
 * 强制校验 CF Access JWT, 返回已登录用户. 校验失败抛 Response.
 *
 * - 缺 TEAM_DOMAIN/POLICY_AUD 配置: 500 (不放行, 防止配置漂移退化成无鉴权)
 * - 缺 token: 401
 * - token 无效: 403
 */
export async function requireAccessUser(
  request: Request,
  env: AccessEnv,
): Promise<AccessUser> {
  if (!env.TEAM_DOMAIN || !env.POLICY_AUD) {
    throw new Response('Access not configured', { status: 500 });
  }

  const token =
    request.headers.get('cf-access-jwt-assertion') ??
    extractCookie(request, 'CF_Authorization');
  if (!token) {
    throw new Response('Unauthorized: missing CF Access token', { status: 401 });
  }

  try {
    const { payload }: { payload: JWTPayload } = await jwtVerify(
      token,
      getJwks(env.TEAM_DOMAIN),
      { issuer: env.TEAM_DOMAIN, audience: env.POLICY_AUD },
    );
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (!email) {
      throw new Response('Forbidden: token missing email', { status: 403 });
    }
    return { email };
  } catch (err) {
    if (err instanceof Response) throw err;
    throw new Response('Forbidden: invalid CF Access token', { status: 403 });
  }
}

/**
 * 要求 email 以指定后缀结尾 (e.g. '@elestyle.jp'). 不匹配抛 403.
 */
export function requireEmailDomain(user: AccessUser, suffix: string): void {
  if (!user.email.toLowerCase().endsWith(suffix.toLowerCase())) {
    throw new Response('Forbidden: email domain not allowed', { status: 403 });
  }
}
