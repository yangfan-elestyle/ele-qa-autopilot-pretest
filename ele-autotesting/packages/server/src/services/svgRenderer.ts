import { Resvg } from '@resvg/resvg-js'

// Phase B: @resvg/resvg-wasm → @resvg/resvg-js (native, 无 initWasm / CompiledWasm).
// 字体: resvg-js 不支持 fontBuffers, 改用系统字体 (loadSystemFonts). 容器需装 CJK 字体
// (Dockerfile: fonts-noto-cjk). 这也去掉了原 wasm 版运行时从 jsdelivr 拉字体的公网出站依赖
// (更适合内网部署), 同时移除 caches.default / cf: fetch 选项 (workerd 专有).

export const renderSvgToPng = async (
  svg: string,
  width?: number,
  height?: number,
): Promise<Uint8Array> => {
  const fitTo =
    width && width > 0
      ? { mode: 'width' as const, value: Math.round(width) }
      : height && height > 0
        ? { mode: 'height' as const, value: Math.round(height) }
        : { mode: 'original' as const }

  const renderer = new Resvg(svg, {
    fitTo,
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Noto Sans CJK SC',
      sansSerifFamily: 'Noto Sans CJK SC',
    },
  })

  return new Uint8Array(renderer.render().asPng())
}
