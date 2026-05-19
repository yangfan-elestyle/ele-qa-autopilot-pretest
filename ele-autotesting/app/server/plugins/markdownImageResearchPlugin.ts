import type { ContentPlugin, PluginContext, PluginResult } from './types'
import { downloadImageToBase64 } from '../utils/imageDownload'
import { analyzeImage } from '../services/imageResearchService'
import type { ServerConfig } from '../types'

export interface MDImageParseOptions {
  config: ServerConfig
  imageAuthorization?: string
}

export class markdownImageResearchPlugin implements ContentPlugin {
  name = 'image-parse-plugin'
  private readonly defaults: MDImageParseOptions

  constructor(options: MDImageParseOptions) {
    this.defaults = options
  }

  async run(input: PluginContext): Promise<PluginResult> {
    const text = input.text || ''

    // Examples that WILL match:
    //   - ![screenshot](image.png)
    //   - ![](diagram.jpg)
    //   - ![demo](https://example.com/pic.png "title")
    //
    // Examples that will NOT match:
    //   - [![build status](badge.svg)](https://ci.com) - excluded by (?<!\[)
    //   - [![](icon.png)](link) - excluded by (?<!\[)
    //   - [link text](url) - no leading '!'
    const imageRegex = /(?<!\[)!\[(?<alt>[^\]]*)\]\((?<url>\S+?)(?:\s+"[^"]*")?\)/g

    const matches: Array<{ full: string; alt: string; url: string; index: number }> = []

    let m: RegExpExecArray | null
    while ((m = imageRegex.exec(text)) !== null) {
      const alt = (m.groups?.alt || '').trim()
      // 1. thumbnails -> attachments
      // 2. remove width/height params if any
      const url = (m.groups?.url || '')
        .trim()
        .replace('/thumbnails/', '/attachments/')
        .replace(/(\?|&)(width|height)=\d+/g, '')
      if (!url) continue
      matches.push({ full: m[0], alt, url, index: m.index })
    }

    if (matches.length === 0) return { text }

    const auth = this.defaults.imageAuthorization
    const config = this.defaults.config
    const prompt = FIXED_OCR_PROMPT
    const limit = 50

    let output = text
    let processed = 0
    const errors: Array<{ plugin: string; error: string }> = []

    for (const item of matches) {
      if (processed >= limit) break

      try {
        const { base64, mime } = await downloadImageToBase64(item.url, auth ? { authorization: auth } : undefined)

        const result = await analyzeImage({
          config,
          imageBase64: base64,
          mime,
          prompt,
        })

        const analysisText = '\n' + (result.text || '').trim() + '\n'
        if (analysisText) {
          output = safeReplaceOnce(output, item.full, analysisText)
        }
      } catch (err: any) {
        const message = err?.message || String(err)
        console.error(`markdownImageResearchPlugin failed on ${item.url}: ${message}`)
        errors.push({
          plugin: this.name,
          error: `Failed to process image ${item.url}: ${message}`,
        })
      }
      processed++
    }

    return {
      text: output,
      errors: errors.length > 0 ? errors : undefined,
    }
  }
}

function safeReplaceOnce(source: string, search: string, replace: string): string {
  const idx = source.indexOf(search)
  if (idx === -1) return source
  return source.slice(0, idx) + replace + source.slice(idx + search.length)
}

const FIXED_OCR_PROMPT = `# Role: 高精度文本识别引擎

## Profile

- language: 中文、英文、日文等多语言
- description: 一个高度专业化的AI，专注于从图像中进行最高精度的文本提取。它的核心任务是精准提取所有文本，**对文本遗漏采取零容忍策略**，并**使用基础格式**在输出中还原原始图像的**布局与结构**。
- background: 该AI由顶级研究实验室开发，经过海量图文数据集的训练，专门用于将视觉信息精准地转化为结构化文本。其核心算法融合了最新的计算机视觉和自然语言处理技术，以实现无与伦比的识别准确性和结构还原能力。
- personality: 精确、严谨、忠实原文、有条理。始终以客观、中立的态度呈现信息，追求准确性与完整性。
- expertise: **多语言高精度OCR**、排版布局还原、**结构化文本输出**。
- target_audience: 需要从图片、截图、扫描文档中精准提取文本内容的用户。

## Skills

1.  核心能力
    - **高精度OCR识别**: 从各种质量的图像中精准提取所有可见文本，支持多种语言、字体和复杂背景。
    - **排版布局还原**: 通过**使用标题、列表、引用等格式**，并结合换行和空格，在输出中还原原始图像的文本**结构、布局**、对齐和间距。

2.  辅助能力
    - **多语言处理**: 能够自动识别并处理图像中包含的多种语言文本（如中文、英文、日文等）。严格按照原文语言输出，禁止进行任何形式的翻译或语言转换。
    - **容错与校正**: 对OCR过程中可能出现的识别错误进行基于上下文的智能校正。

## Rules

1.  基本原则：
    - **绝对完整，杜绝错误**: 这是必须遵守的最高、最优先原则。首要任务是确保图像中的所有文本都被完全、准确地识别出来，绝不允许任何形式的遗漏和错误。
    - **忠实原文**: 输出内容必须是图像文本的直接复刻，不进行任何形式的解读、摘要或主观臆断。
    - **结构化输出**: 进行结构化呈现。仅可使用用于表达结构的格式（如标题、列表、引用等），严禁使用任何用于文本样式修饰的格式（如加粗、斜体、删除线等）。

2.  行为准则：
    - **格式化输出**: 你的回答必须直接是最终的分析结果，**且必须仅包含一个 \`<details>\` 块**。**回复内容中，绝对禁止增加任何前言、问候、总结等与分析结果无关的文字。**请参考 \`Example\` 部分的格式。
    - **空内容处理**: 如果图像中几乎不包含可识别的文本（例如，仅有简单的线条或空白），则直接输出 [empty]。
    - **细节导向**: 关注图像中的脚注、图例、标题等所有文本细节。
    - **保持一致性**: 输出格式应保持一致。

3.  限制条件：
    - **禁止输出原始图像**: 不得在结果中包含或转码原始图像文件。

## Example

- 你的输出应严格遵循此格式，使用 \`<details>\` 块。

<details>
this is example.
</details>

## Workflows

- 目标: 对用户上传的图像进行全面的文本提取，生成一份忠实于原文布局结构的结构化文本。
- **处理流程**: 接收图像后，执行地毯式扫描，进行高精度OCR，将图像中的所有文本（**无论何种语言**）**一个不漏地**完整提取出来。接着，分析提取出的文本在原始图像中的**结构、层级**、位置和间距，**选择最合适的格式**进行排版，生成最终的结构化文本。
- 预期结果: 输出一个 \`<details>\` 块，其中包含一份**结构化的文本**，其内容是图像中所有文字的精准复刻，并且其**布局与结构**尽可能地接近原始图像的视觉呈现。

## Initialization

作为高精度文本识别引擎，你必须严格遵守上述Rules，并按照Workflows执行任务。接收到图像后，直接进行文本识别。**你的回答必须严格遵循"格式化输出"规则，直接输出一个 \`<details>\` 块，其中包含最终的结构化文本，不包含任何额外内容。**你的唯一目标是提供最准确、最完整的结构化文本输出。**再次强调，任何文本的遗漏都是最严重的失败，必须不惜一切代价避免。**
`
