import OpenAI from 'openai'

let cachedClient: OpenAI | null = null
let cachedKey = ''

export function getOpenAIClient(apiKey: string): OpenAI {
  const key = apiKey || 'dummy-key'
  if (!cachedClient || cachedKey !== key) {
    cachedClient = new OpenAI({ apiKey: key })
    cachedKey = key
  }
  return cachedClient
}
