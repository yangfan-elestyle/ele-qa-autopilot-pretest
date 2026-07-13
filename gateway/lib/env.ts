// Gateway Node/Bun 运行时 env.
// 下游全部走内网 HTTP; 身份由 gateway 自签 cookie / X-Auth-User-Email header 荣誉制收口.

export interface Env {
  // 下游内网 HTTP base (compose service name), 必填. 无尾斜杠.
  AUTOPILOT_URL: string;
  AUTOTEST_URL: string;
  // 允许登录的邮箱后缀, 默认 @elestyle.jp.
  ALLOWED_EMAIL_DOMAIN: string;
  // 登录 cookie 存活秒数 (RFC 6265: 无 Max-Age = session cookie, 关浏览器即失效;
  // 浏览器持久 cookie 上限约 400 天, 故默认 400 天而非"永不过期").
  COOKIE_MAX_AGE: number;
  // 监听端口.
  PORT: number;
}

function stripTrailingSlash(v: string): string {
  return v.replace(/\/+$/, "");
}

export function readEnv(): Env {
  const e = process.env;
  const autopilot = stripTrailingSlash((e.AUTOPILOT_URL ?? "").trim());
  const autotest = stripTrailingSlash((e.AUTOTEST_URL ?? "").trim());
  if (!autopilot || !autotest) {
    throw new Error(
      "gateway: AUTOPILOT_URL 与 AUTOTEST_URL 必须配置 (compose service URL, 如 http://autopilot:8080)",
    );
  }
  const domain = (e.ALLOWED_EMAIL_DOMAIN ?? "").trim() || "@elestyle.jp";
  return {
    AUTOPILOT_URL: autopilot,
    AUTOTEST_URL: autotest,
    ALLOWED_EMAIL_DOMAIN: domain.startsWith("@") ? domain : `@${domain}`,
    COOKIE_MAX_AGE: Number(e.COOKIE_MAX_AGE) || 34560000,
    PORT: Number(e.PORT) || 8080,
  };
}
