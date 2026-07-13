import type { Db } from '../lib/db.ts'

// ele-autotesting Node/Docker 运行时 env (替代 CF Worker Env + wrangler bindings/vars).
// D1 → libSQL (DB 注入); DO+Container markitdown → MARKITDOWN_URL sidecar; VPC/service → 内网 HTTP;
// ASSETS binding → 静态 serve web/dist (见 src/index.ts); CF Access → X-Auth-User-Email header.
export interface Env {
  // libSQL adapter (server 入口建 client 后注入). D1 → 此.
  DB: Db

  // 下游内网 HTTP base (含 scheme, compose service). 寻址见 lib/upstream.ts.
  AUTOPILOT_URL: string
  METERSPHERE_URL: string
  // agentic-loop (ele-harness 后端) 联合迁移后指 compose service; 未就绪时留空, harness 路由自守卫.
  AGENTIC_LOOP_URL?: string

  // markitdown sidecar HTTP 端点 (compose service). DO+Container → 此.
  MARKITDOWN_URL?: string
  // 本地 dev 兜底 (OrbStack 兼容问题时用), 优先级低于 MARKITDOWN_URL.
  MARKITDOWN_DEV_URL?: string

  QA_ALTASSIAN_API_KEY?: string
  QA_ALTASSIAN_EMAIL?: string
  QA_IMAGE_RESEARCH_OPENAI_API_KEY?: string
  QA_IMAGE_RESEARCH_OPENAI_VISION_MODEL?: string
  QA_IMAGE_RESEARCH_GEMINI_API_KEY?: string
  QA_IMAGE_RESEARCH_GEMINI_VISION_MODEL?: string

  // 本地 dev 兜底 owner: 缺身份 header 时 resolveOwner 用 `google:<DEV_FALLBACK_EMAIL>`.
  // 生产不设 (缺身份必 401).
  DEV_FALLBACK_EMAIL?: string

  PORT?: number
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
