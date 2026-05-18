import { GoogleGenAI } from '@google/genai'

let cachedAi: GoogleGenAI | null = null
let cachedKey = ''

export function getGeminiClient(apiKey: string): GoogleGenAI | null {
  if (!apiKey) return null
  if (!cachedAi || cachedKey !== apiKey) {
    cachedAi = new GoogleGenAI({ apiKey })
    cachedKey = apiKey
  }
  return cachedAi
}
