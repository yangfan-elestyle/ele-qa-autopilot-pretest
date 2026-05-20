import type { Container } from '@cloudflare/containers'

export interface Env {
  ASSETS: Fetcher
  MARKITDOWN: DurableObjectNamespace<Container>
  DB: D1Database

  QA_ALTASSIAN_API_KEY?: string
  QA_ALTASSIAN_EMAIL?: string

  QA_IMAGE_RESEARCH_OPENAI_API_KEY?: string
  QA_IMAGE_RESEARCH_OPENAI_VISION_MODEL?: string

  QA_IMAGE_RESEARCH_GEMINI_API_KEY?: string
  QA_IMAGE_RESEARCH_GEMINI_VISION_MODEL?: string

  /**
   * 本地开发兜底：若 OrbStack / Docker 与 wrangler container sidecar 出现
   * setsockoptint 兼容性问题，可在 .dev.vars 设置此变量，
   * `/mcps/markitdown/*` 将反代到该 URL（如 markitdown-cloudflare 实例）。
   * 生产部署绝不应设置。
   */
  MARKITDOWN_DEV_URL?: string

  /**
   * Cloudflare Access (Zero Trust) Team Domain, 用于 cf-access-jwt-assertion 远程 JWKS
   * 校验 (issuer). 与 gateway `vars.TEAM_DOMAIN` 锁同值; 见 packages/server/src/middleware/auth.ts.
   */
  TEAM_DOMAIN: string

  /**
   * Cloudflare Access Application AUD (audience claim). 与 gateway `vars.POLICY_AUD` 锁同值.
   * 改动需同步 CF 后台 `QA Gateway` Application Overview.
   */
  POLICY_AUD: string

  /**
   * 本地 dev 兜底邮箱: 当请求缺 `cf-access-jwt-assertion` (wrangler dev 本地不经 CF Access)
   * 时, resolveOwner 用 `google:<DEV_FALLBACK_EMAIL>` 作 ownerId. 经仓库根 `.env` +
   * `wrangler dev --env-file ../../.env` 注入. 生产 wrangler.jsonc / secret 绝不可设.
   */
  DEV_FALLBACK_EMAIL?: string
}

export type HonoEnv = {
  Bindings: Env
  Variables: {
    config: ServerConfig
    // 仅 /api/sync/* 在 resolveOwner 中间件里写入. 其他路由不会读, 所以做成可选.
    ownerId?: string
  }
}

export interface ServerConfig {
  openai: {
    apiKey: string
    visionModel: string
  }
  gemini: {
    apiKey: string
    visionModel: string
  }
  confluence: {
    token: string
    email: string
    authorization: string
  }
}
