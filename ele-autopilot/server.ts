// ele-autopilot — Node/Bun HTTP 入口.
// 启动时建 libSQL client (file:) + S3 store (MinIO) 各一次, 跑 migrations,
// 每个请求经 runWithBindings 注入 bindings 后交给 RR7 handler. 静态资源由 build/client 托管.

import { createRequestHandler, type ServerBuild } from 'react-router';
import { createClient } from '@libsql/client';
import { fileURLToPath } from 'node:url';
import { join, normalize, sep } from 'node:path';

import { readEnv, type Env } from './lib/env';
import { runWithBindings, type AppBindings } from './lib/bindings';
import { createLibsqlDb } from './lib/db/connection';
import { runMigrations } from './lib/db/migrate';
import { createS3Client, createS3Store } from './lib/object-store';

declare module 'react-router' {
  interface AppLoadContext {
    env: Env;
  }
}

const env = readEnv();
const MODE = process.env.NODE_ENV === 'development' ? 'development' : 'production';

// --- 数据面初始化 (启动一次) ---
const client = createClient({ url: env.DATABASE_URL });
// D1 默认开启 FK, libSQL 默认关闭; 显式开启以保 jobs→job_tasks 等 CASCADE 语义.
await client.execute('PRAGMA foreign_keys=ON');
await runMigrations(client);

const s3 = createS3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
});

const bindings: AppBindings = {
  DB: createLibsqlDb(client),
  SCREENSHOTS: createS3Store(s3, env.SCREENSHOTS_BUCKET),
  RELEASES: createS3Store(s3, env.RELEASES_BUCKET),
};

// --- RR handler + 静态 ---
const build = (await import(
  new URL('./build/server/index.js', import.meta.url).href
)) as unknown as ServerBuild;
const rrHandler = createRequestHandler(build, MODE);

const CLIENT_DIR = fileURLToPath(new URL('./build/client', import.meta.url));

async function serveStatic(pathname: string): Promise<Response | null> {
  let rel: string;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (rel.includes('\0')) return null;
  const full = normalize(join(CLIENT_DIR, rel));
  if (full !== CLIENT_DIR && !full.startsWith(CLIENT_DIR + sep)) return null;
  const file = Bun.file(full);
  if (!(await file.exists())) return null;
  const headers = new Headers();
  if (pathname.startsWith('/assets/')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  return new Response(file, { headers });
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const p = url.pathname;

  if (p === '/healthz') {
    return new Response('ok', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    const stat = await serveStatic(p);
    if (stat) return stat;
  }

  return runWithBindings(bindings, () => rrHandler(request, { env }));
}

const server = Bun.serve({
  port: env.PORT,
  idleTimeout: 120,
  fetch(request) {
    return handle(request).catch((err) => {
      console.error('[autopilot] unhandled:', err);
      return new Response('Internal Server Error', { status: 500 });
    });
  },
});

console.log(`[autopilot] listening on http://0.0.0.0:${server.port} (mode=${MODE})`);
