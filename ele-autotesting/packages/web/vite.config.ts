import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import path from 'path'
import { readFileSync } from 'fs'
import vueDevtools from 'vite-plugin-vue-devtools'

const rootPkg = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'),
) as { version: string }

// dev 时所有同源 API 请求通过 vite proxy 转发到 wrangler dev (端口 8787)。
// 生产环境前后端同源由 Workers Static Assets 直供，无需 proxy。
const WORKER_DEV_TARGET = 'http://127.0.0.1:8787'

const PROXIED_PATHS = [
  '/healthz',
  '/config.js',
  '/confluence-parse',
  '/figma-parse',
  '/stream-proxy',
  '/http-proxy',
  '/image-research',
  '/markdown-research',
  '/mcps',
  '/api',
]

export default defineConfig(({ command }) => {
  const proxy = Object.fromEntries(
    PROXIED_PATHS.map((p) => [p, { target: WORKER_DEV_TARGET, changeOrigin: true }]),
  )

  return {
    // 生产构建时挂在 /autotest/ 子路径下, 让 gateway (qa) 透过 service binding 转发到 ele-autotesting Worker.
    // dev 模式保留根路径 '/' 避免本地访问 http://127.0.0.1:18181 时 404.
    base: command === 'build' ? '/autotest/' : '/',
    define: {
      __APP_VERSION__: JSON.stringify(rootPkg.version),
    },
    plugins: [vue(), vueDevtools()],
    server: {
      port: 18181,
      host: true,
      fs: {
        allow: ['..'],
      },
      hmr: true,
      proxy,
      watch: {
        ignored: ['!**/node_modules/@prompt-optimizer/**'],
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
    },
    publicDir: 'public',
    resolve: {
      preserveSymlinks: true,
      alias: {
        '@': resolve(__dirname, 'src'),
        '@prompt-optimizer/core': path.resolve(__dirname, '../core'),
        '@prompt-optimizer/ui': path.resolve(__dirname, '../ui'),
        '@prompt-optimizer/web': path.resolve(__dirname, '../web'),
      },
    },
    optimizeDeps: {
      include: ['element-plus'],
    },
  }
})
