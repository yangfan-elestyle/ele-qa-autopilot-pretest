import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'

// 静态资源服务 (替代 CF ASSETS binding). 服务 web/dist (Vue SPA 构建产物) + SPA index 兜底.
// 注意: gateway 转发时已剥掉 /autotest 前缀, 故此处按剥后路径映射到 web/dist.

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
}

async function fileResponse(fullPath: string, pathname: string): Promise<Response | null> {
  try {
    const s = await stat(fullPath)
    if (!s.isFile()) return null
    const buf = new Uint8Array(await readFile(fullPath))
    const headers = new Headers({
      'content-type': TYPES[extname(fullPath).toLowerCase()] ?? 'application/octet-stream',
    })
    if (pathname.startsWith('/assets/')) {
      headers.set('cache-control', 'public, max-age=31536000, immutable')
    }
    return new Response(buf, { headers })
  } catch {
    return null
  }
}

export function createStaticServer(rootDir: string) {
  // 去尾分隔符, 否则 `root + sep` 会出现双斜杠, 目录穿越守卫误拒合法文件.
  const root = normalize(rootDir).replace(/[/\\]+$/, '')
  return {
    async serveAsset(pathname: string): Promise<Response | null> {
      let rel: string
      try {
        rel = decodeURIComponent(pathname)
      } catch {
        return null
      }
      if (rel.includes('\0')) return null
      const full = normalize(join(root, rel))
      if (full !== root && !full.startsWith(root + sep)) return null
      return fileResponse(full, pathname)
    },
    // SPA 兜底: 未命中静态文件的路由返回 index.html, 交前端 router 处理.
    async spaFallback(): Promise<Response> {
      const idx = await fileResponse(join(root, 'index.html'), '/index.html')
      return idx ?? new Response('Not found', { status: 404 })
    },
  }
}
