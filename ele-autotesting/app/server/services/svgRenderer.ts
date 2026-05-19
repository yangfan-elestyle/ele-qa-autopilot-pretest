import { Resvg, initWasm } from '@resvg/resvg-wasm'
// @ts-ignore WASM module shipped via Wrangler CompiledWasm rule
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'

const FONT_URLS = [
  'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf',
  'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf',
] as const

let wasmInitPromise: Promise<void> | null = null
let fontBuffersPromise: Promise<Uint8Array[]> | null = null

const ensureWasmReady = (): Promise<void> => {
  if (!wasmInitPromise) {
    wasmInitPromise = initWasm(resvgWasm as WebAssembly.Module).catch((err) => {
      wasmInitPromise = null
      throw err
    })
  }
  return wasmInitPromise
}

const fetchFontWithCache = async (url: string): Promise<Uint8Array> => {
  const cacheKey = new Request(url, { method: 'GET' })
  const cache = (caches as unknown as { default: Cache }).default
  const cached = await cache.match(cacheKey)
  if (cached) {
    return new Uint8Array(await cached.arrayBuffer())
  }

  const res = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } })
  if (!res.ok) throw new Error(`Failed to fetch font ${url}: HTTP ${res.status}`)
  const buf = await res.arrayBuffer()

  const cacheable = new Response(buf, {
    status: 200,
    headers: { 'Content-Type': 'font/otf', 'Cache-Control': 'public, max-age=2592000' },
  })
  await cache.put(cacheKey, cacheable.clone())
  return new Uint8Array(buf)
}

const ensureFontBuffers = (): Promise<Uint8Array[]> => {
  if (!fontBuffersPromise) {
    fontBuffersPromise = Promise.all(FONT_URLS.map(fetchFontWithCache)).catch((err) => {
      fontBuffersPromise = null
      throw err
    })
  }
  return fontBuffersPromise
}

export const renderSvgToPng = async (svg: string, width?: number, height?: number): Promise<Uint8Array> => {
  const [, fontBuffers] = await Promise.all([ensureWasmReady(), ensureFontBuffers()])

  const fitTo =
    width && width > 0
      ? { mode: 'width' as const, value: Math.round(width) }
      : height && height > 0
        ? { mode: 'height' as const, value: Math.round(height) }
        : { mode: 'original' as const }

  const renderer = new Resvg(svg, {
    fitTo,
    font: {
      fontBuffers,
      defaultFontFamily: 'Noto Sans CJK SC',
      sansSerifFamily: 'Noto Sans CJK SC',
    },
  })

  try {
    const rendered = renderer.render()
    try {
      return rendered.asPng()
    } finally {
      rendered.free()
    }
  } finally {
    renderer.free()
  }
}
