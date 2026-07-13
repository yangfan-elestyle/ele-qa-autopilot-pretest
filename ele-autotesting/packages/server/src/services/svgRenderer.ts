import { Resvg } from '@resvg/resvg-js'

// @resvg/resvg-js (native): 用系统字体渲染 (resvg-js 不支持 fontBuffers, 靠 loadSystemFonts).
// 容器需装 CJK 字体 (Dockerfile: fonts-noto-cjk); 字体走系统安装而非运行时公网拉取, 适合内网.

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
