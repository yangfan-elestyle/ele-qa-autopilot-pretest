import { Hono, Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { analyzeImage } from '../services/imageResearchService.ts'
import type { HonoEnv } from '../types/env.ts'

const router = new Hono<HonoEnv>()

router.post('/analyze', async (c: Context<HonoEnv>) => {
  const body = await c.req.json().catch(() => ({}))

  const providerInput = body?.provider ? String(body.provider).toLowerCase() : 'gemini'
  const provider: 'openai' | 'gemini' = providerInput === 'openai' ? 'openai' : 'gemini'
  const prompt = String(body?.prompt || '').trim()
  const imageBase64 = body?.imageBase64 || body?.image || body?.image_base64
  const mime = body?.mime || body?.contentType || 'image/png'

  if (!imageBase64) {
    return c.json({ error: 'Missing imageBase64' }, 400)
  }

  try {
    const result = await analyzeImage({
      config: c.get('config'),
      provider,
      prompt,
      imageBase64,
      mime,
    })
    return c.json(result, 200)
  } catch (err: any) {
    const status = normalizeErrorStatus(err?.status)
    return c.json({ error: err?.message || 'Image analysis failed' }, status)
  }
})

export default router

function normalizeErrorStatus(status: unknown, fallback: ContentfulStatusCode = 500): ContentfulStatusCode {
  if (typeof status !== 'number') return fallback
  if (status < 200 || status > 599) return fallback
  if (status === 204 || status === 205 || status === 304) return fallback
  return status as ContentfulStatusCode
}
