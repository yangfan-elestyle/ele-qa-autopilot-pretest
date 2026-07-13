// ele-autotesting — Node HTTP 入口 (替代原 CF Worker `ExportedHandler` + Container).
// 启动建 libSQL client (file:) + 跑 migrations, 注入 env; @hono/node-server 起服务.
// markitdown → HTTP sidecar; Hono 404 → 静态 web/dist / SPA index 兜底 (替代 ASSETS binding).

import { serve } from '@hono/node-server'
import { createClient } from '@libsql/client'
import { fileURLToPath } from 'node:url'

import { app } from './app.ts'
import { handleMarkitdownProxy, matchesMarkitdownPath } from './routes/markitdownProxy.ts'
import { createLibsqlDb } from './lib/db.ts'
import { runMigrations } from './lib/migrate.ts'
import { createStaticServer } from './lib/static.ts'
import type { Env } from './types/env.ts'

const e = process.env
const DATABASE_URL = e.DATABASE_URL?.trim() || 'file:/data/autotesting.db'
const MIGRATIONS_DIR =
  e.MIGRATIONS_DIR?.trim() || fileURLToPath(new URL('../migrations/', import.meta.url))
const WEB_DIST_DIR =
  e.WEB_DIST_DIR?.trim() || fileURLToPath(new URL('../../web/dist/', import.meta.url))
const PORT = Number(e.PORT) || 8080

const client = createClient({ url: DATABASE_URL })
// D1 默认开 FK, libSQL 默认关; 显式开启 (autotesting schema 目前无 FK, 前瞻一致).
await client.execute('PRAGMA foreign_keys=ON')
await runMigrations(client, MIGRATIONS_DIR)

const env: Env = {
  DB: createLibsqlDb(client),
  AUTOPILOT_URL: e.AUTOPILOT_URL ?? '',
  METERSPHERE_URL: e.METERSPHERE_URL ?? '',
  AGENTIC_LOOP_URL: e.AGENTIC_LOOP_URL,
  MARKITDOWN_URL: e.MARKITDOWN_URL,
  MARKITDOWN_DEV_URL: e.MARKITDOWN_DEV_URL,
  QA_ALTASSIAN_API_KEY: e.QA_ALTASSIAN_API_KEY,
  QA_ALTASSIAN_EMAIL: e.QA_ALTASSIAN_EMAIL,
  QA_IMAGE_RESEARCH_OPENAI_API_KEY: e.QA_IMAGE_RESEARCH_OPENAI_API_KEY,
  QA_IMAGE_RESEARCH_OPENAI_VISION_MODEL: e.QA_IMAGE_RESEARCH_OPENAI_VISION_MODEL,
  QA_IMAGE_RESEARCH_GEMINI_API_KEY: e.QA_IMAGE_RESEARCH_GEMINI_API_KEY,
  QA_IMAGE_RESEARCH_GEMINI_VISION_MODEL: e.QA_IMAGE_RESEARCH_GEMINI_VISION_MODEL,
  DEV_FALLBACK_EMAIL: e.DEV_FALLBACK_EMAIL,
  PORT,
}

const staticServer = createStaticServer(WEB_DIST_DIR)

async function rootFetch(request: Request): Promise<Response> {
  const url = new URL(request.url)

  if (matchesMarkitdownPath(url.pathname)) {
    return handleMarkitdownProxy(request, env)
  }

  const resp = await app.fetch(request, env)
  if (resp.status !== 404) return resp

  // Hono 404: 静态资源 / SPA 兜底 (仅 GET/HEAD 且非 /api).
  if ((request.method === 'GET' || request.method === 'HEAD') && !url.pathname.startsWith('/api/')) {
    const asset = await staticServer.serveAsset(url.pathname)
    if (asset) return asset
    return staticServer.spaFallback()
  }
  return resp
}

serve({ fetch: rootFetch, port: PORT }, (info) => {
  console.log(`[autotesting] listening on http://0.0.0.0:${info.port}`)
})
