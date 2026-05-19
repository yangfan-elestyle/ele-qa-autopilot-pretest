export interface AdvancedParameterDefinition {
  id: string
  name: string
  label: string
  description: string
  type: 'number' | 'string' | 'boolean' | 'integer'
  defaultValue?: any
  minValue?: number
  maxValue?: number
  step?: number
  unit?: string
  appliesToProviders: string[]
}

const OPENAI_COMPATIBLE_PROVIDERS = ['openai', 'custom']
const ALL_PROVIDERS = ['openai', 'gemini', 'custom']

export const advancedParameterDefinitions: AdvancedParameterDefinition[] = [
  {
    id: 'common_temperature',
    name: 'temperature',
    label: '温度 (temperature)',
    description: '控制输出随机性。值越高输出越发散，值越低越确定。',
    type: 'number',
    defaultValue: 0.7,
    minValue: 0.0,
    maxValue: 2.0,
    step: 0.1,
    appliesToProviders: ALL_PROVIDERS,
  },
  {
    id: 'openai_reasoning_effort',
    name: 'reasoning_effort',
    label: '推理强度 (reasoning_effort)',
    description: '控制推理模型的思考深度，可选 low/medium/high。',
    type: 'string',
    defaultValue: ['low', 'medium', 'high'],
    appliesToProviders: ['openai'],
  },
  {
    id: 'common_top_p',
    name: 'top_p',
    label: 'Top P',
    description: '核采样阈值，与 temperature 二选一使用即可。',
    type: 'number',
    defaultValue: 1.0,
    minValue: 0.0,
    maxValue: 1.0,
    step: 0.01,
    appliesToProviders: OPENAI_COMPATIBLE_PROVIDERS,
  },
  {
    id: 'openai_max_tokens',
    name: 'max_tokens',
    label: '最大输出 Token (max_tokens)',
    description: '单次响应输出的最大 Token 数。',
    type: 'integer',
    defaultValue: 40000,
    minValue: 1,
    step: 1,
    unit: 'tokens',
    appliesToProviders: OPENAI_COMPATIBLE_PROVIDERS,
  },
  {
    id: 'openai_presence_penalty',
    name: 'presence_penalty',
    label: '出现惩罚 (presence_penalty)',
    description: '提升模型谈论新话题的倾向，值越大越倾向新话题。',
    type: 'number',
    defaultValue: 0,
    minValue: -2.0,
    maxValue: 2.0,
    step: 0.1,
    appliesToProviders: OPENAI_COMPATIBLE_PROVIDERS,
  },
  {
    id: 'openai_frequency_penalty',
    name: 'frequency_penalty',
    label: '频率惩罚 (frequency_penalty)',
    description: '降低模型重复同一表达的倾向，值越大越避免重复。',
    type: 'number',
    defaultValue: 0,
    minValue: -2.0,
    maxValue: 2.0,
    step: 0.1,
    appliesToProviders: OPENAI_COMPATIBLE_PROVIDERS,
  },
  {
    id: 'openai_timeout',
    name: 'timeout',
    label: '请求超时 (timeout)',
    description: 'OpenAI 客户端请求超时时间。',
    type: 'integer',
    defaultValue: 60000,
    minValue: 1000,
    step: 1000,
    unit: 'ms',
    appliesToProviders: OPENAI_COMPATIBLE_PROVIDERS,
  },
  {
    id: 'gemini_maxOutputTokens',
    name: 'maxOutputTokens',
    label: '最大输出 Token (maxOutputTokens)',
    description: 'Gemini 单次响应输出的最大 Token 数。',
    type: 'integer',
    defaultValue: 40000,
    minValue: 1,
    step: 1,
    unit: 'tokens',
    appliesToProviders: ['gemini'],
  },
  {
    id: 'gemini_topP',
    name: 'topP',
    label: 'Top P',
    description: '核采样阈值。',
    type: 'number',
    defaultValue: 1.0,
    minValue: 0.0,
    maxValue: 1.0,
    step: 0.01,
    appliesToProviders: ['gemini'],
  },
  {
    id: 'gemini_topK',
    name: 'topK',
    label: 'Top K',
    description: '仅在概率最高的 K 个候选 Token 中采样。',
    type: 'integer',
    defaultValue: 1,
    minValue: 1,
    step: 1,
    appliesToProviders: ['gemini'],
  },
  {
    id: 'gemini_candidateCount',
    name: 'candidateCount',
    label: '候选数 (candidateCount)',
    description: '同时生成的候选回复数量。',
    type: 'integer',
    defaultValue: 1,
    minValue: 1,
    maxValue: 8,
    step: 1,
    appliesToProviders: ['gemini'],
  },
  {
    id: 'gemini_stopSequences',
    name: 'stopSequences',
    label: '停止序列 (stopSequences)',
    description: '命中后立即停止生成的字符串列表，逗号分隔。',
    type: 'string',
    defaultValue: [],
    appliesToProviders: ['gemini'],
  },
]
