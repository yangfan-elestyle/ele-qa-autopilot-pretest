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
