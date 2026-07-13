// 身份收口 (Phase B): 放弃 CF Access / Google OIDC, 改内网荣誉制.
//   - 浏览器: gateway 自签明文 cookie (email), 关浏览器不失效靠 Max-Age.
//   - 脚本/CLI: 直接带 X-Auth-User-Email header (荣誉制, 内网边界是唯一防线).
// 校验优先级见 §0.3: 有效 cookie > 入站 header > 无 (302 /login 或 401).
// gateway 是唯一签发/校验方; 转发下游时用解析出的 email 覆盖入站 header, 下游只读一次 header.

import { AUTH_HEADER } from "./constants";

export const COOKIE_NAME = "ele_auth_email";

export interface AuthUser {
  email: string;
}

function extractCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function isAllowedEmail(email: string, domain: string): boolean {
  const e = email.trim().toLowerCase();
  // 单个 @, 后缀匹配, 且 @ 前非空.
  return (
    e.length > domain.length &&
    e.endsWith(domain.toLowerCase()) &&
    e.indexOf("@") === e.length - domain.length &&
    e.split("@")[0].length > 0
  );
}

// 解析请求身份: 有效 cookie 优先 (浏览器无法用 header 冒充他人), 回退入站 header (荣誉制).
export function resolveUser(request: Request, domain: string): AuthUser | null {
  const cookie = extractCookie(request, COOKIE_NAME);
  if (cookie && isAllowedEmail(cookie, domain)) {
    return { email: cookie.trim().toLowerCase() };
  }
  const header = request.headers.get(AUTH_HEADER);
  if (header && isAllowedEmail(header, domain)) {
    return { email: header.trim().toLowerCase() };
  }
  return null;
}

export function buildSetCookie(email: string, maxAge: number): string {
  const value = encodeURIComponent(email.trim().toLowerCase());
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`;
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 极简登录页: 一个 email input. 无密码 (内网荣誉制).
export function loginPage(opts: { next: string; domain: string; error?: string }): string {
  const next = escapeHtml(opts.next || "/");
  const domain = escapeHtml(opts.domain);
  const error = opts.error
    ? `<p class="err">${escapeHtml(opts.error)}</p>`
    : "";
  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>登录 · QA AutoPilot</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0b1020; color: #e6e8ef; }
  .card { width: min(92vw, 360px); padding: 32px 28px; border-radius: 16px;
    background: #151b30; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .sub { margin: 0 0 24px; color: #9aa3bd; font-size: 13px; }
  label { display: block; margin-bottom: 6px; color: #b8c0d8; font-size: 13px; }
  input { width: 100%; padding: 11px 13px; border-radius: 10px; border: 1px solid #2a3355;
    background: #0d1428; color: #e6e8ef; font-size: 15px; }
  input:focus { outline: none; border-color: #4f46e5; }
  button { margin-top: 18px; width: 100%; padding: 11px; border: 0; border-radius: 10px;
    background: #4f46e5; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; }
  button:hover { background: #4338ca; }
  .err { margin: 12px 0 0; color: #fb7185; font-size: 13px; }
  .hint { margin-top: 16px; color: #6b7391; font-size: 12px; }
</style>
</head>
<body>
  <form class="card" method="post" action="/login">
    <h1>QA AutoPilot</h1>
    <p class="sub">输入公司邮箱进入</p>
    <input type="hidden" name="next" value="${next}" />
    <label for="email">公司邮箱</label>
    <input id="email" name="email" type="email" required autofocus
      placeholder="you${domain}" autocomplete="email" />
    ${error}
    <button type="submit">进入</button>
    <p class="hint">仅限 ${domain} 邮箱 · 内网访问</p>
  </form>
</body>
</html>`;
}
