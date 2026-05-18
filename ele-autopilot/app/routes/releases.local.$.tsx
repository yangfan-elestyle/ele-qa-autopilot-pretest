import type { LoaderFunctionArgs } from 'react-router';

import { getBindings } from '@/lib/bindings';
import { r2KeyFromRelPath } from '@/lib/screenshots';

function contentTypeFor(name: string): string {
  if (name.endsWith('.whl')) return 'application/octet-stream';
  if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) return 'application/gzip';
  if (name.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (name.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}

function cacheControlFor(key: string): string {
  // latest.txt 短缓存让发版后快速反映; 其他按版本路径不可变, 长缓存.
  if (key.endsWith('/latest.txt') || key === 'local/latest.txt') {
    return 'public, max-age=60';
  }
  return 'public, max-age=31536000, immutable';
}

export async function loader({ params }: LoaderFunctionArgs) {
  const rel = params['*'] ?? '';
  const safe = r2KeyFromRelPath(rel);
  if (!safe) return new Response('Not found', { status: 404 });

  const key = `local/${safe}`;
  const { RELEASES } = getBindings();
  const obj = await RELEASES.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType ?? contentTypeFor(safe));
  headers.set('Cache-Control', cacheControlFor(key));
  headers.set('ETag', obj.httpEtag);
  return new Response(obj.body, { headers });
}
