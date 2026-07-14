import type { LoaderFunctionArgs } from 'react-router';
import { resolve, sep } from 'node:path';

import { r2KeyFromRelPath } from '@/lib/screenshots';

// 发布产物根: 镜像构建期 Dockerfile 把 local/<合规 wheel> + local/latest.txt 铺到 /app/releases.
// wheel 用 uv build 合规原名 (install.sh 按 latest.txt 拼名下载), latest.txt 供 gateway landing 展示版本.
// dev (react-router dev) 下无此目录, releases/install 走不通属预期 (gateway landing 客户端兜底).
const RELEASES_DIR = resolve(process.cwd(), 'releases');

function contentTypeFor(name: string): string {
  if (name.endsWith('.whl')) return 'application/octet-stream';
  if (name.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

export async function loader({ params }: LoaderFunctionArgs) {
  const rel = params['*'] ?? '';
  const safe = r2KeyFromRelPath(rel);
  if (!safe) return new Response('Not found', { status: 404 });

  // r2KeyFromRelPath 已挡 `..` / 控制字符 / 非法字符; 再校验 resolve 后仍在根内 (纵深防御).
  const full = resolve(RELEASES_DIR, safe);
  if (full !== RELEASES_DIR && !full.startsWith(RELEASES_DIR + sep)) {
    return new Response('Not found', { status: 404 });
  }

  const file = Bun.file(full);
  if (!(await file.exists())) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  headers.set('Content-Type', contentTypeFor(safe));
  // 固定名 wheel / latest.txt 内容随镜像版本变, 不能 immutable; 短缓存让发版后快速反映.
  headers.set('Cache-Control', 'public, max-age=60');
  return new Response(file, { headers });
}
