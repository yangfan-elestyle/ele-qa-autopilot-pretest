import { getOpenAIClient } from '../config/openai.ts'
import { getGeminiClient } from '../config/gemini.ts'
import { toDataUrl } from '../utils/imageUtils.ts'
import type { ServerConfig } from '../types/env.ts'

export interface ImageResearchOptions {
  config: ServerConfig
  provider?: 'openai' | 'gemini'
  prompt?: string
  imageBase64: string
  mime?: string
}

export interface ImageResearchResult {
  text: string
  model: string
  usage?: unknown
  finish_reason?: string
}

function extractBase64Payload(imageBase64: string): string | null {
  if (!imageBase64) return null
  const trimmed = String(imageBase64).trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('data:')) return trimmed
  const commaIndex = trimmed.indexOf(',')
  if (commaIndex === -1) return null
  return trimmed.slice(commaIndex + 1)
}

async function analyzeWithOpenAI(
  config: ServerConfig,
  prompt: string,
  imageBase64: string,
  mime: string,
): Promise<ImageResearchResult> {
  const { apiKey, visionModel } = config.openai
  if (!apiKey) throw new Error('Missing QA_IMAGE_RESEARCH_OPENAI_API_KEY')

  const imageUrl = toDataUrl(imageBase64, mime)
  if (!imageUrl) throw new Error('Invalid image data')

  const client = getOpenAIClient(apiKey)
  const response = await client.chat.completions.create(
    {
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    },
    { timeout: 600000 },
  )

  const choice = response.choices?.[0]
  return {
    text: choice?.message?.content || '',
    model: response.model || visionModel,
    usage: response.usage,
    finish_reason: choice?.finish_reason || undefined,
  }
}

async function analyzeWithGemini(
  config: ServerConfig,
  prompt: string,
  imageBase64: string,
  mime: string,
): Promise<ImageResearchResult> {
  const { apiKey, visionModel } = config.gemini
  const ai = getGeminiClient(apiKey)
  if (!ai) throw new Error('Missing QA_IMAGE_RESEARCH_GEMINI_API_KEY')

  const base64 = extractBase64Payload(imageBase64)
  if (!base64) throw new Error('Invalid image data')

  const response = await ai.models.generateContent({
    model: visionModel,
    contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: base64 } }] }],
  })

  return {
    text: (response.text ?? '').trim(),
    model: visionModel,
    usage: response.usageMetadata,
    finish_reason: response.candidates?.[0]?.finishReason || undefined,
  }
}

/**
 * Analyze an image using OpenAI or Gemini vision models
 */
export async function analyzeImage(options: ImageResearchOptions): Promise<ImageResearchResult> {
  const provider = options.provider || 'gemini'
  const prompt = options.prompt && options.prompt.trim().length > 0 ? options.prompt.trim() : 'deep research this image.'
  const imageBase64 = options.imageBase64
  const mime = options.mime || 'image/png'

  if (!imageBase64) throw new Error('Missing imageBase64')

  return provider === 'openai'
    ? analyzeWithOpenAI(options.config, prompt, imageBase64, mime)
    : analyzeWithGemini(options.config, prompt, imageBase64, mime)
}
