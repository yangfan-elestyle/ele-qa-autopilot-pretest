// ele-autopilot Node/Bun 运行时 env.
// 持久化: libSQL embedded (DATABASE_URL=file:/data/autopilot.db); 截图: 落 autopilot
// 持久卷目录 (SCREENSHOTS_DIR=/data/screenshots); 身份: gateway 注入的 X-Auth-User-Email header.

export interface Env {
  DATABASE_URL: string;
  SCREENSHOTS_DIR: string;
  ALLOWED_EMAIL_DOMAIN: string;
  PORT: number;
}

export function readEnv(): Env {
  const e = process.env;
  const domain = (e.ALLOWED_EMAIL_DOMAIN ?? "").trim() || "@elestyle.jp";
  return {
    DATABASE_URL: (e.DATABASE_URL ?? "").trim() || "file:/data/autopilot.db",
    SCREENSHOTS_DIR: (e.SCREENSHOTS_DIR ?? "").trim() || "/data/screenshots",
    ALLOWED_EMAIL_DOMAIN: domain.startsWith("@") ? domain : `@${domain}`,
    PORT: Number(e.PORT) || 8080,
  };
}
