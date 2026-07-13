// 身份校验: 读 gateway 注入的 X-Auth-User-Email header.
//
// 背景: gateway 统一收口鉴权后, 除少数 bypass 端点外, 所有转发都带 gateway 解析出的 email
// (荣誉制, 内网边界是唯一防线). 下游只需读一次 header, 不再各自校验 JWT / cookie.
//
// 高敏感路由 (e.g. settings/llm-key) 仍在 loader/action 内 requireAccessUser + email 域校验,
// 作为深度防御 (直连下游需自带合法 header).

import { AUTH_HEADER } from './constants';

export type AccessUser = { email: string };

/**
 * 身份来源 seam. Phase B 实现 = 读 X-Auth-User-Email header.
 *   - 无凭据 → null (由 requireAccessUser 决定是否 401)
 */
export interface AuthProvider {
  verify(request: Request): Promise<AccessUser | null>;
}

function verifyHeader(request: Request): AccessUser | null {
  const email = request.headers.get(AUTH_HEADER)?.trim().toLowerCase();
  if (!email) return null;
  return { email };
}

export function getAuthProvider(): AuthProvider {
  return { verify: (request) => Promise.resolve(verifyHeader(request)) };
}

/**
 * 强制校验身份, 返回已登录用户. 缺 header 抛 401 Response (caller try/catch 后返回客户端).
 */
export async function requireAccessUser(request: Request): Promise<AccessUser> {
  const user = await getAuthProvider().verify(request);
  if (!user) {
    throw new Response('Unauthorized: missing identity', { status: 401 });
  }
  return user;
}

/**
 * 要求 email 以指定后缀结尾 (e.g. '@elestyle.jp'). 不匹配抛 403.
 */
export function requireEmailDomain(user: AccessUser, suffix: string): void {
  if (!user.email.toLowerCase().endsWith(suffix.toLowerCase())) {
    throw new Response('Forbidden: email domain not allowed', { status: 403 });
  }
}
