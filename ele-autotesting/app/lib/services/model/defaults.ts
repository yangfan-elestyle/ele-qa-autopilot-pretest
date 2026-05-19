import { ModelConfig } from './types'

export const defaultModels: Record<string, ModelConfig> = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.2',
    apiKey: '',
    enabled: false,
    provider: 'openai',
    llmParams: { timeout: 600000, reasoning_effort: 'high' },
  },
  gemini: {
    name: 'Gemini',
    baseURL: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-pro',
    apiKey: '',
    enabled: false,
    provider: 'gemini',
    llmParams: { timeout: 600000, temperature: 0.1, topP: 0.7 },
  },
  custom: {
    name: 'Custom',
    baseURL: '',
    defaultModel: '',
    apiKey: '',
    enabled: false,
    provider: 'custom',
    llmParams: {},
  },
}
