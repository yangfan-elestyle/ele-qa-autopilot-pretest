import type { Container } from '@cloudflare/containers'

export interface Env {
  ASSETS: Fetcher
  MARKITDOWN: DurableObjectNamespace<Container>
  DB: D1Database

  /**
   * Cloudflare Workers VPC service binding 反向到 MeterSphere (`qa.elepay.link`).
   * 资源 ID / 拓扑 / 复用 harness tunnel `ele-server` 的细节见 PLAN-vpc.md.
   * 调用形态: `env.METERSPHERE.fetch('https://backend/{ms-path}', { method, headers, body })`.
   * Host 部分是 binding placeholder, 不进 origin; VPC service 改写到 qa.elepay.link:443.
   */
  METERSPHERE: Fetcher

  /**
   * Cloudflare Workers VPC service binding 反向到 ele-fly 上的 agentic-loop:3000
   * (即 ele-harness 的后端 HTTP API). 复用 harness 的 service `agentic-loop-backend`,
   * service_id 在 wrangler.jsonc 写明; 这条 binding 让 autotesting Worker 直连 agentic-loop
   * 容器, 绕过 harness Worker + CF Access. 本期为打通链路 (传话人) 用; 后续真要套权限层时
   * 切回公网 `harness.<account>.workers.dev` + CF Access service token 即可.
   */
  AGENTIC_LOOP: Fetcher

  /**
   * Service binding 直连 ele-autopilot Worker. 调用形态 `env.AUTOPILOT.fetch('http://autopilot/api/v1/ingest/tasks', ...)`.
   * 用 binding 而非公网 fetch 是为了避免 autotesting Worker fetch 自己同域
   * `qa.<sub>.workers.dev` 触发 Cloudflare 1101 (self-subrequest cycle).
   * 契约见 ele-autopilot/docs/ingest-api.md.
   */
  AUTOPILOT: Fetcher

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
   * 时, resolveOwner 用 `google:<DEV_FALLBACK_EMAIL>` 作 ownerId. 经 `ele-autotesting/.env` +
   * `wrangler dev --env-file ../../.env` 注入. 生产 wrangler.jsonc / secret 绝不可设.
   */
  DEV_FALLBACK_EMAIL?: string
}

export type HonoEnv = {
  Bindings: Env
  Variables: {
    config: ServerConfig
    // 业务路由与 /api/sync/* 都过 resolveOwner, 写入 `google:<email>`; /healthz 等公开路径不写,
    // 所以做成可选 — 读取端 (如 sync 子路由) 用 SyncEnv 收紧成必填.
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
