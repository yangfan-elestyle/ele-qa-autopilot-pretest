import { Hono, Context } from 'hono'
import { analyzeImage } from '../services/imageResearchService.ts'
import { renderSvgToPng } from '../services/svgRenderer.ts'
import { bytesToBase64 } from '../utils/fileDownload.ts'
import type { HonoEnv } from '../types/env.ts'

const router = new Hono<HonoEnv>()

interface FigmaNode {
  id: string
  name?: string
  type?: string
  children?: FigmaNode[]
  absoluteBoundingBox?: {
    width?: number
    height?: number
  }
}

interface FigmaFileResponse {
  document?: FigmaNode
}

interface FigmaImagesResponse {
  err?: string | null
  images?: Record<string, string>
}

interface ImageAnalysisResult {
  nodeId: string
  imageUrl: string
  success: boolean
  size?: number
  data?: unknown
  error?: string
}

const MIN_DIMENSION = 100
const MAX_ASPECT_RATIO = 5
const PNG_SCALE_FACTOR = 1
const MAX_IMAGES = 50

const normalizeNodeId = (value: string) => value.replace(/-/g, ':')

const parseFigmaUrl = (value: string) => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Invalid Figma URL format')
  }

  if (!url.hostname.endsWith('figma.com')) {
    throw new Error('Invalid Figma URL host')
  }

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length < 3) {
    throw new Error('Invalid Figma URL path')
  }

  const nodeParam = url.searchParams.get('node-id')
  if (!nodeParam) {
    throw new Error('Missing node-id in Figma URL')
  }

  return {
    fileType: segments[0],
    fileKey: segments[1],
    fileName: decodeURIComponent(segments.slice(2).join('/')),
    nodeId: normalizeNodeId(nodeParam),
  }
}

const findNodeById = (node: FigmaNode | undefined, targetId: string): FigmaNode | null => {
  if (!node) return null
  if (node.id === targetId) return node
  if (!node.children) return null
  for (const child of node.children) {
    const found = findNodeById(child, targetId)
    if (found) return found
  }
  return null
}

const fetchSvgAndConvertToBase64Png = async (url: string, width?: number, height?: number) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download SVG: HTTP ${response.status}`)
  }

  const svg = await response.text()
  const scaledWidth = width && width > 0 ? width * PNG_SCALE_FACTOR : undefined
  const scaledHeight = height && height > 0 ? height * PNG_SCALE_FACTOR : undefined
  const png = await renderSvgToPng(svg, scaledWidth, scaledHeight)
  return { base64: bytesToBase64(png), mime: 'image/png' }
}

router.post('/', async (c: Context<HonoEnv>) => {
  const body = await c.req.json().catch(() => ({} as any))

  const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  const token = typeof body?.token === 'string' ? body.token.trim() : ''

  if (!rawUrl) return c.json({ error: 'Missing url parameter' }, 400)
  if (!token) return c.json({ error: 'Missing Figma token' }, 400)

  let parsed
  try {
    parsed = parseFigmaUrl(rawUrl)
  } catch (err: any) {
    return c.json({ error: err?.message || 'Invalid Figma URL' }, 400)
  }

  const headers = { 'X-Figma-Token': token }

  let fileJson: FigmaFileResponse
  try {
    const fileResponse = await fetch(`https://api.figma.com/v1/files/${parsed.fileKey}?depth=3`, { headers })
    if (!fileResponse.ok) {
      // Figma 上游错误响应体可能含 token hint / 请求 ID / 内部栈 — 仅写 Worker 日志, 不回写客户端,
      // 与 confluenceParse.ts 同口径; 客户端只看到 status code, 避免泄漏给浏览器 console.
      const errorText = await fileResponse.text()
      console.error(
        `Figma file ${parsed.fileKey} HTTP ${fileResponse.status}: ${errorText.slice(0, 2000)}`,
      )
      return c.json(
        { error: `Failed to fetch Figma file: HTTP ${fileResponse.status}` },
        fileResponse.status === 404 ? 404 : 400,
      )
    }
    fileJson = (await fileResponse.json()) as FigmaFileResponse
  } catch (err: any) {
    console.error('Figma file request error:', err?.message || err)
    return c.json({ error: 'Failed to fetch Figma file' }, 502)
  }

  const targetNode = findNodeById(fileJson.document, parsed.nodeId)
  if (!targetNode) {
    return c.json({ error: 'Node not found in Figma file', details: { nodeId: parsed.nodeId } }, 404)
  }

  const childNodes = (targetNode.children || []).filter((child): child is FigmaNode => Boolean(child?.id))

  if (!childNodes.length) {
    return c.json(
      {
        success: true,
        message: 'Target node has no children to render',
        file: { type: parsed.fileType, key: parsed.fileKey, name: parsed.fileName },
        nodeId: parsed.nodeId,
        childIds: [],
        images: {},
        imageUrls: [],
        analyses: [],
        childSizeFiltered: 0,
      },
      200,
    )
  }

  let imagesJson: FigmaImagesResponse
  try {
    const params = new URLSearchParams({
      ids: childNodes.map((child) => child.id).join(','),
      format: 'svg',
    })
    const imagesResponse = await fetch(`https://api.figma.com/v1/images/${parsed.fileKey}?${params.toString()}`, { headers })
    if (!imagesResponse.ok) {
      const errorText = await imagesResponse.text()
      console.error(
        `Figma images ${parsed.fileKey} HTTP ${imagesResponse.status}: ${errorText.slice(0, 2000)}`,
      )
      return c.json(
        { error: `Failed to fetch Figma images: HTTP ${imagesResponse.status}` },
        imagesResponse.status === 404 ? 404 : 400,
      )
    }
    imagesJson = (await imagesResponse.json()) as FigmaImagesResponse
  } catch (err: any) {
    console.error('Figma images request error:', err?.message || err)
    return c.json({ error: 'Failed to fetch Figma images' }, 502)
  }

  if (imagesJson.err) {
    // imagesJson.err 来自 Figma API 业务层, 不像 HTTP body 那样会带内部栈, 但同样可能含 file key 等
    // 用户上下文 — 收到 Worker 日志便于排查, 客户端仅看到通用错误信息.
    console.error(`Figma images API error for ${parsed.fileKey}:`, imagesJson.err)
    return c.json({ error: 'Figma images API responded with error' }, 400)
  }

  const images = imagesJson.images || {}

  const sizedChildren = childNodes.map((child) => {
    const box = child.absoluteBoundingBox
    const width = Number(box?.width) || 0
    const height = Number(box?.height) || 0
    return { nodeId: child.id, size: Math.max(width, height), width, height, imageUrl: images[child.id] }
  })

  const sizedWithImages = sizedChildren.filter(
    (item): item is { nodeId: string; size: number; width: number; height: number; imageUrl: string } => Boolean(item.imageUrl),
  )

  const filteredByDimension = sizedWithImages.filter((item) => item.width >= MIN_DIMENSION && item.height >= MIN_DIMENSION)
  const filteredByAspect = filteredByDimension.filter((item) => {
    const maxSide = Math.max(item.width, item.height)
    const minSide = Math.min(item.width, item.height)
    if (minSide === 0) return false
    return maxSide / minSide <= MAX_ASPECT_RATIO
  })

  const childSizeFiltered = sizedWithImages.length - filteredByAspect.length
  const selectedImages = filteredByAspect.slice(0, MAX_IMAGES)
  const imageUrls = selectedImages.map((item) => item.imageUrl)

  const config = c.get('config')
  const analyses: ImageAnalysisResult[] = []

  for (const item of selectedImages) {
    try {
      const { base64, mime } = await fetchSvgAndConvertToBase64Png(item.imageUrl, item.width, item.height)

      const result = await analyzeImage({
        config,
        prompt,
        imageBase64: base64,
        mime,
      })

      analyses.push({ nodeId: item.nodeId, imageUrl: item.imageUrl, size: item.size, success: true, data: result })
    } catch (error: any) {
      console.error(`Image research failed for ${item.nodeId}: ${error?.message || error}`)
      analyses.push({
        nodeId: item.nodeId,
        imageUrl: item.imageUrl,
        size: item.size,
        success: false,
        error: error?.message || String(error),
      })
    }
  }

  return c.json(
    {
      success: true,
      file: { type: parsed.fileType, key: parsed.fileKey, name: parsed.fileName },
      nodeId: parsed.nodeId,
      childIds: childNodes.map((child) => child.id),
      images,
      imageUrls,
      analyses,
      childSizeFiltered,
      prompt: prompt || `Analyze Figma node ${parsed.nodeId}`,
    },
    200,
  )
})

export default router
