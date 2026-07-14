// ele-autopilot Node/Bun 运行时 env.
// 持久化: libSQL embedded (DATABASE_URL=file:/data/autopilot.db); 对象存储: MinIO (S3 兼容);
// 身份: gateway 注入的 X-Auth-User-Email header.

export interface Env {
  DATABASE_URL: string;
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_FORCE_PATH_STYLE: boolean;
  SCREENSHOTS_BUCKET: string;
  ALLOWED_EMAIL_DOMAIN: string;
  PORT: number;
}

function required(name: string, value: string | undefined): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(`ele-autopilot: 缺少必填环境变量 ${name}`);
  return v;
}

export function readEnv(): Env {
  const e = process.env;
  const domain = (e.ALLOWED_EMAIL_DOMAIN ?? "").trim() || "@elestyle.jp";
  return {
    DATABASE_URL: (e.DATABASE_URL ?? "").trim() || "file:/data/autopilot.db",
    S3_ENDPOINT: required("S3_ENDPOINT", e.S3_ENDPOINT),
    S3_REGION: (e.S3_REGION ?? "").trim() || "us-east-1",
    S3_ACCESS_KEY_ID: required("S3_ACCESS_KEY_ID", e.S3_ACCESS_KEY_ID),
    S3_SECRET_ACCESS_KEY: required("S3_SECRET_ACCESS_KEY", e.S3_SECRET_ACCESS_KEY),
    S3_FORCE_PATH_STYLE: (e.S3_FORCE_PATH_STYLE ?? "true").toLowerCase() !== "false",
    SCREENSHOTS_BUCKET: (e.SCREENSHOTS_BUCKET ?? "").trim() || "ele-autopilot-screenshots",
    ALLOWED_EMAIL_DOMAIN: domain.startsWith("@") ? domain : `@${domain}`,
    PORT: Number(e.PORT) || 8080,
  };
}
