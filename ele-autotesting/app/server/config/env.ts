import type { ServerConfig } from '../types'

export function loadServerConfig(env: Env): ServerConfig {
  const config: ServerConfig = {
    openai: {
      apiKey: env.QA_IMAGE_RESEARCH_OPENAI_API_KEY || '',
      visionModel: env.QA_IMAGE_RESEARCH_OPENAI_VISION_MODEL || 'gpt-4o-mini',
    },
    gemini: {
      apiKey: env.QA_IMAGE_RESEARCH_GEMINI_API_KEY || '',
      visionModel: env.QA_IMAGE_RESEARCH_GEMINI_VISION_MODEL || 'gemini-2.5-flash',
    },
    confluence: {
      token: env.QA_ALTASSIAN_API_KEY || '',
      email: env.QA_ALTASSIAN_EMAIL || '',
      authorization: '',
    },
  }

  if (config.confluence.email && config.confluence.token) {
    const raw = `${config.confluence.email}:${config.confluence.token}`
    config.confluence.authorization = `Basic ${btoa(raw)}`
  }

  return config
}
