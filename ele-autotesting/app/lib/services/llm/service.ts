import type { ILLMService, Message, StreamHandlers, LLMResponse, ModelInfo, ModelOption, ContentPart } from './types'
import type { ModelConfig } from '../model/types'
import { ModelManager } from '../model/manager'
import { APIError, RequestConfigError } from './errors'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { getProxyUrl } from '../../utils/environment'

/**
 * LLM服务实现 - 基于官方SDK
 */
export class LLMService implements ILLMService {
  constructor(private modelManager: ModelManager) {}

  /**
   * 在流式消费过程中让出主线程，避免UI卡顿。
   *
   * 注意：Chrome 对后台 Tab 的 setTimeout 会做强节流（clamp），
   * 如果在每个 chunk 后都 await setTimeout，会导致后台时“看起来不再接收”。
   * 因此：仅在页面可见时才做延迟让出；页面不可见时跳过，让流继续消费/累积。
   */
  private async yieldForUI(delayMs: number = 10): Promise<void> {
    const isDocumentDefined = typeof document !== 'undefined'
    const isPageVisible = !isDocumentDefined || document.visibilityState === 'visible'
    if (!isPageVisible) return
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  /**
   * 验证消息格式
   */
  private validateMessages(messages: Message[]): void {
    if (!Array.isArray(messages)) {
      throw new RequestConfigError('消息必须是数组格式')
    }
    if (messages.length === 0) {
      throw new RequestConfigError('消息列表不能为空')
    }
    messages.forEach((msg) => {
      if (!msg.role || msg.content === undefined || msg.content === null) {
        throw new RequestConfigError('消息格式无效: 缺少必要字段')
      }
      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        throw new RequestConfigError(`不支持的消息类型: ${msg.role}`)
      }
      const c = msg.content as any
      if (typeof c === 'string') return
      if (Array.isArray(c)) {
        // 校验内容片段
        for (const part of c as ContentPart[]) {
          if (!part || typeof part !== 'object') {
            throw new RequestConfigError('内容片段必须是对象')
          }
          if (part.type === 'text') {
            if (typeof (part as any).text !== 'string') {
              throw new RequestConfigError('文本片段缺少text字段或类型错误')
            }
          } else if (part.type === 'image_url') {
            if (typeof (part as any).url !== 'string') {
              throw new RequestConfigError('图片URL片段缺少url字段或类型错误')
            }
          } else if (part.type === 'image_base64') {
            if (typeof (part as any).data !== 'string') {
              throw new RequestConfigError('图片Base64片段缺少data字段或类型错误')
            }
            if (typeof (part as any).mimeType !== 'string') {
              throw new RequestConfigError('图片Base64片段缺少mimeType字段或类型错误')
            }
          } else {
            throw new RequestConfigError(`不支持的内容片段类型: ${(part as any).type}`)
          }
        }
        return
      }
      throw new RequestConfigError('消息内容必须是字符串或内容片段数组')
    })
  }

  /**
   * 将内部 ContentPart[] 映射为 OpenAI chat.completions 消息 content
   */
  private toOpenAIContent(content: string | ContentPart[]): any {
    if (typeof content === 'string') return content
    return content.map((part) => {
      if (part.type === 'text') {
        return { type: 'text', text: part.text }
      }
      if (part.type === 'image_url') {
        return { type: 'image_url', image_url: { url: part.url } }
      }
      const url = `data:${part.mimeType};base64,${part.data}`
      return { type: 'image_url', image_url: { url } }
    })
  }

  /**
   * 将内部 Message 内容映射为 Gemini 的 parts
   */
  private toGeminiParts(content: string | ContentPart[]): any[] {
    if (typeof content === 'string') {
      return content ? [{ text: content }] : []
    }
    const parts: any[] = []
    for (const part of content) {
      if (part.type === 'text') {
        parts.push({ text: part.text })
      } else if (part.type === 'image_url') {
        // Gemini 目前不直接支持远程url图片作为inlineData，这里忽略或可扩展为下载转base64（此处保持简单：传入URL文本）
        parts.push({ text: part.url })
      } else if (part.type === 'image_base64') {
        parts.push({ inlineData: { mimeType: part.mimeType, data: part.data } })
      }
    }
    return parts
  }

  /**
   * 从 system 消息中提取图片（不包括文本），用于合并到用户 parts
   */
  private extractGeminiImagePartsFromSystem(messages: Message[]): any[] {
    const imageParts: any[] = []
    for (const msg of messages) {
      if (msg.role !== 'system') continue
      if (!Array.isArray(msg.content)) continue
      for (const part of msg.content) {
        if (part.type === 'image_base64') {
          imageParts.push({ inlineData: { mimeType: part.mimeType, data: part.data } })
        }
      }
    }
    return imageParts
  }

  /**
   * 提取 Gemini 调用所需的 systemInstruction 与 contents（含 system 图片合并）
   */
  private buildGeminiInput(messages: Message[]): { systemInstruction: string; contents: any[] } {
    const systemMessages = messages.filter((msg) => msg.role === 'system')
    const systemInstruction = systemMessages
      .map((msg) => (typeof msg.content === 'string' ? msg.content : msg.content.map((p) => (p.type === 'text' ? p.text : '')).join('\n')))
      .join('\n')

    const contents = this.formatGeminiContents(messages.filter((msg) => msg.role !== 'system'))

    const sysImageParts = this.extractGeminiImagePartsFromSystem(messages)
    if (sysImageParts.length > 0) {
      let lastUserIndex = -1
      for (let i = contents.length - 1; i >= 0; i--) {
        if (contents[i].role === 'user') {
          lastUserIndex = i
          break
        }
      }
      if (lastUserIndex === -1) {
        contents.push({ role: 'user', parts: sysImageParts })
      } else {
        contents[lastUserIndex].parts = [...(contents[lastUserIndex].parts || []), ...sysImageParts]
      }
    }

    return { systemInstruction, contents }
  }

  /**
   * 验证模型配置
   */
  private validateModelConfig(modelConfig: ModelConfig): void {
    if (!modelConfig) {
      throw new RequestConfigError('模型配置不能为空')
    }
    if (!modelConfig.provider) {
      throw new RequestConfigError('模型提供商不能为空')
    }
    // API key允许为空字符串，某些服务（如Ollama）不需要API key
    if (!modelConfig.defaultModel) {
      throw new RequestConfigError('默认模型不能为空')
    }
    if (!modelConfig.enabled) {
      throw new RequestConfigError('模型未启用')
    }
  }

  /**
   * 获取OpenAI实例
   */
  private getOpenAIInstance(modelConfig: ModelConfig, isStream: boolean = false): OpenAI {
    const apiKey = modelConfig.apiKey || ''

    // 处理baseURL，如果以'/chat/completions'结尾则去掉
    let processedBaseURL = modelConfig.baseURL
    if (processedBaseURL?.endsWith('/chat/completions')) {
      processedBaseURL = processedBaseURL.slice(0, -'/chat/completions'.length)
    }

    // 使用代理处理跨域问题
    let finalBaseURL = processedBaseURL
    if (processedBaseURL) {
      finalBaseURL = getProxyUrl(processedBaseURL, isStream)
      console.log(`使用 ${isStream ? '流式' : ''}API 代理:`, finalBaseURL)
    }

    // 创建OpenAI实例配置
    const defaultTimeout = isStream ? 90000 : 60000
    const timeout = modelConfig.llmParams?.timeout !== undefined ? modelConfig.llmParams.timeout : defaultTimeout

    const config: any = {
      apiKey: apiKey,
      baseURL: finalBaseURL,
      timeout: timeout,
      maxRetries: isStream ? 2 : 3,
    }

    // In any browser-like environment, we must set this flag to true
    // to bypass the SDK's environment check.
    if (typeof window !== 'undefined') {
      config.dangerouslyAllowBrowser = true
      console.log('[LLM Service] Browser-like environment detected. Setting dangerouslyAllowBrowser=true.')
    }

    const instance = new OpenAI(config)

    return instance
  }

  /**
   * 获取Gemini客户端
   */
  private getGeminiClient(modelConfig: ModelConfig): GoogleGenAI {
    const apiKey = modelConfig.apiKey || ''

    // 处理baseURL，如果以'/v1beta'结尾则去掉
    let processedBaseURL = modelConfig.baseURL
    if (processedBaseURL?.endsWith('/v1beta')) {
      processedBaseURL = processedBaseURL.slice(0, -'/v1beta'.length)
    }
    let finalBaseURL = processedBaseURL
    if (processedBaseURL) {
      finalBaseURL = getProxyUrl(processedBaseURL, true)
      console.log('使用流式API代理:', finalBaseURL)
    }

    return new GoogleGenAI({
      apiKey,
      httpOptions: finalBaseURL ? { baseUrl: finalBaseURL } : undefined,
    })
  }

  /**
   * 将消息数组格式化为 Gemini generateContent 所需的 contents
   */
  private formatGeminiContents(messages: Message[]): any[] {
    const formatted: any[] = []
    for (const msg of messages) {
      if (msg.role === 'user') {
        formatted.push({ role: 'user', parts: this.toGeminiParts(msg.content) })
      } else if (msg.role === 'assistant') {
        formatted.push({ role: 'model', parts: this.toGeminiParts(msg.content) })
      }
    }
    return formatted
  }

  /**
   * 发送消息（流式，支持结构化和传统格式）
   */
  async sendMessageStream(messages: Message[], provider: string, callbacks: StreamHandlers): Promise<void> {
    try {
      console.log('开始流式请求:', {
        provider,
        messagesCount: messages.length,
      })
      this.validateMessages(messages)

      const modelConfig = await this.modelManager.getModel(provider)
      if (!modelConfig) {
        throw new RequestConfigError(`模型 ${provider} 不存在`)
      }

      this.validateModelConfig(modelConfig)

      console.log('获取到模型实例:', {
        provider: modelConfig.provider,
        model: modelConfig.defaultModel,
      })

      if (modelConfig.provider === 'gemini') {
        await this.streamGeminiMessage(messages, modelConfig, callbacks)
      } else {
        // OpenAI 兼容格式的 API，包括自定义模型
        await this.streamOpenAIMessage(messages, modelConfig, callbacks)
      }
    } catch (error) {
      console.error('流式请求失败:', error)
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * 处理流式内容中的think标签（用于流式场景）
   */
  private processStreamContentWithThinkTags(content: string, callbacks: StreamHandlers, thinkState: { isInThinkMode: boolean; buffer: string }): void {
    // 如果没有推理回调，直接发送到主要内容流
    if (!callbacks.onReasoningToken) {
      callbacks.onToken(content)
      return
    }

    // 将新内容添加到缓冲区
    thinkState.buffer += content
    let remaining = thinkState.buffer
    let processed = ''

    while (remaining.length > 0) {
      if (!thinkState.isInThinkMode) {
        // 不在think模式中，查找<think>标签
        const thinkStartIndex = remaining.indexOf('<think>')

        if (thinkStartIndex !== -1) {
          // 找到了开始标签
          // 发送开始标签前的内容到主要流
          if (thinkStartIndex > 0) {
            const beforeThink = remaining.slice(0, thinkStartIndex)
            callbacks.onToken(beforeThink)
            processed += beforeThink + '<think>'
          } else {
            processed += '<think>'
          }

          // 进入think模式
          thinkState.isInThinkMode = true
          remaining = remaining.slice(thinkStartIndex + 7) // 7 = '<think>'.length
        } else {
          // 没有找到开始标签
          // 检查buffer末尾是否可能是不完整的标签开始
          if (
            remaining.endsWith('<') ||
            remaining.endsWith('<t') ||
            remaining.endsWith('<th') ||
            remaining.endsWith('<thi') ||
            remaining.endsWith('<thin') ||
            remaining.endsWith('<think')
          ) {
            // 可能是不完整的标签，保留在buffer中等待更多内容
            thinkState.buffer = remaining
            return
          } else {
            // 确定没有标签，发送所有内容到主要流
            callbacks.onToken(remaining)
            processed += remaining
            remaining = ''
          }
        }
      } else {
        // 在think模式中，查找</think>标签
        const thinkEndIndex = remaining.indexOf('</think>')

        if (thinkEndIndex !== -1) {
          // 找到了结束标签
          // 发送结束标签前的内容到推理流
          if (thinkEndIndex > 0) {
            const thinkContent = remaining.slice(0, thinkEndIndex)
            callbacks.onReasoningToken(thinkContent)
          }

          // 退出think模式
          thinkState.isInThinkMode = false
          processed += remaining.slice(0, thinkEndIndex) + '</think>'
          remaining = remaining.slice(thinkEndIndex + 8) // 8 = '</think>'.length
        } else {
          // 没有找到结束标签
          // 检查buffer末尾是否可能是不完整的结束标签
          if (
            remaining.endsWith('<') ||
            remaining.endsWith('</') ||
            remaining.endsWith('</t') ||
            remaining.endsWith('</th') ||
            remaining.endsWith('</thi') ||
            remaining.endsWith('</thin') ||
            remaining.endsWith('</think')
          ) {
            // 可能是不完整的结束标签，保留在buffer中等待更多内容
            thinkState.buffer = remaining
            return
          } else {
            // 确定是think内容，发送到推理流
            callbacks.onReasoningToken(remaining)
            processed += remaining
            remaining = ''
          }
        }
      }
    }

    // 更新缓冲区为已处理的内容
    thinkState.buffer = ''
  }

  /**
   * 流式发送OpenAI消息
   */
  private async streamOpenAIMessage(messages: Message[], modelConfig: ModelConfig, callbacks: StreamHandlers): Promise<void> {
    try {
      // 获取流式OpenAI实例
      const openai = this.getOpenAIInstance(modelConfig, true)

      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      console.log('开始创建流式请求...')
      const {
        timeout, // Handled in getOpenAIInstance
        model: llmParamsModel, // Avoid overriding main model
        messages: llmParamsMessages, // Avoid overriding main messages
        stream: llmParamsStream, // Avoid overriding main stream flag
        ...restLlmParams
      } = modelConfig.llmParams || {}

      const completionConfig: any = {
        model: modelConfig.defaultModel,
        messages: formattedMessages.map((m) => ({ role: m.role, content: this.toOpenAIContent(m.content) })),
        stream: true, // Essential for streaming
        ...restLlmParams, // User-defined parameters from llmParams
      }

      // 直接使用流式响应，无需类型转换
      const stream = await openai.chat.completions.create(completionConfig)

      console.log('成功获取到流式响应')

      // 使用类型断言来确保TypeScript知道这是流式响应
      let accumulatedReasoning = ''
      let accumulatedContent = ''

      // think标签状态跟踪
      const thinkState = { isInThinkMode: false, buffer: '' }

      for await (const chunk of stream as any) {
        // 处理推理内容（部分 OpenAI 兼容提供商在 delta 中提供 reasoning_content）
        const reasoningContent = chunk.choices[0]?.delta?.reasoning_content || ''
        if (reasoningContent) {
          accumulatedReasoning += reasoningContent

          // 如果有推理回调，发送推理内容
          if (callbacks.onReasoningToken) {
            callbacks.onReasoningToken(reasoningContent)
          }
          await this.yieldForUI(10)
        }

        // 处理主要内容
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          accumulatedContent += content

          // 使用流式think标签处理
          this.processStreamContentWithThinkTags(content, callbacks, thinkState)

          await this.yieldForUI(10)
        }
      }

      console.log('流式响应完成')

      // 构建完整响应
      const response: LLMResponse = {
        content: accumulatedContent,
        reasoning: accumulatedReasoning || undefined,
        metadata: {
          model: modelConfig.defaultModel,
        },
      }

      callbacks.onComplete(response)
    } catch (error) {
      console.error('流式处理过程中出错:', error)
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * 流式发送Gemini消息
   */
  private async streamGeminiMessage(messages: Message[], modelConfig: ModelConfig, callbacks: StreamHandlers): Promise<void> {
    const { systemInstruction, contents } = this.buildGeminiInput(messages)

    if (contents.length === 0) {
      const response: LLMResponse = {
        content: '',
        metadata: {
          model: modelConfig.defaultModel,
        },
      }
      callbacks.onComplete(response)
      return
    }

    try {
      console.log('开始创建Gemini流式请求...')
      const ai = this.getGeminiClient(modelConfig)
      const generationConfig = this.buildGeminiGenerationConfig(modelConfig.llmParams)
      const config: any = { ...generationConfig }
      if (systemInstruction) {
        config.systemInstruction = systemInstruction
      }
      const stream = await ai.models.generateContentStream({
        model: modelConfig.defaultModel,
        contents,
        config,
      })

      console.log('成功获取到流式响应')

      let accumulatedContent = ''

      for await (const chunk of stream) {
        const text = chunk.text ?? ''
        if (text) {
          accumulatedContent += text
          callbacks.onToken(text)
          // 添加小延迟，让UI有时间更新（仅在页面可见时生效）
          await this.yieldForUI(10)
        }
      }

      console.log('流式响应完成')

      // 构建完整响应
      const response: LLMResponse = {
        content: accumulatedContent,
        metadata: {
          model: modelConfig.defaultModel,
        },
      }

      callbacks.onComplete(response)
    } catch (error) {
      console.error('流式处理过程中出错:', error)
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * 获取模型列表，以下拉选项格式返回
   * @param provider 提供商标识
   * @param customConfig 自定义配置（可选）
   */
  async fetchModelList(provider: string, customConfig?: Partial<ModelConfig>): Promise<ModelOption[]> {
    try {
      // 获取基础配置
      let modelConfig = await this.modelManager.getModel(provider)

      // 如果提供了自定义配置，则合并到基础配置
      if (customConfig) {
        modelConfig = {
          ...modelConfig,
          ...(customConfig as ModelConfig),
        }
      }

      if (!modelConfig) {
        console.warn(`模型 ${provider} 不存在，使用自定义配置`)
        if (!customConfig) {
          throw new RequestConfigError(`模型 ${provider} 不存在`)
        }
        modelConfig = customConfig as ModelConfig
      }

      // 验证必要的配置（仅验证API URL）
      if (!modelConfig.baseURL) {
        throw new RequestConfigError('API URL不能为空')
      }
      // API key允许为空字符串，某些服务（如Ollama）不需要API key

      let models: ModelInfo[] = []

      // 根据不同提供商实现不同的获取模型列表逻辑
      console.log(`获取 ${modelConfig.name || provider} 的模型列表`)

      if (provider === 'gemini' || modelConfig.provider === 'gemini') {
        models = await this.fetchGeminiModelsInfo(modelConfig)
      } else {
        // OpenAI 兼容格式的 API
        models = await this.fetchOpenAICompatibleModelsInfo(modelConfig)
      }

      // 转换为选项格式
      return models.map((model) => ({
        value: model.id,
        label: model.name,
      }))
    } catch (error: any) {
      console.error('获取模型列表失败:', error)
      if (error instanceof RequestConfigError || error instanceof APIError) {
        throw error
      }
      throw new APIError(`获取模型列表失败: ${error.message}`)
    }
  }

  /**
   * 获取 Gemini 模型信息（通过 @google/genai SDK 调用 provider 真实 API）
   */
  private async fetchGeminiModelsInfo(modelConfig: ModelConfig): Promise<ModelInfo[]> {
    const ai = this.getGeminiClient(modelConfig)

    try {
      const pager = await ai.models.list()
      const collected: ModelInfo[] = []

      for await (const m of pager) {
        // 仅保留支持 generateContent 的模型；SDK 未提供 supportedActions 时不过滤
        if (m.supportedActions && !m.supportedActions.includes('generateContent')) continue

        const rawName = m.name || ''
        const id = rawName.startsWith('models/') ? rawName.slice('models/'.length) : rawName
        if (!id) continue

        collected.push({ id, name: id })
      }

      collected.sort((a, b) => a.id.localeCompare(b.id))

      if (collected.length === 0) {
        throw new APIError('EMPTY_MODEL_LIST: API returned empty model list')
      }

      return collected
    } catch (error: any) {
      console.error('Failed to fetch Gemini model list:', error)

      if (error instanceof APIError || error instanceof RequestConfigError) {
        throw error
      }

      const msg = error?.message ?? String(error)
      if (msg.includes('Failed to fetch') || msg.includes('Connection error') || msg.includes('fetch failed')) {
        throw new APIError(`CONNECTION_FAILED: ${msg}`)
      }
      throw new APIError(`UNKNOWN_ERROR: ${msg}`)
    }
  }

  /**
   * 获取OpenAI兼容API的模型信息
   */
  private async fetchOpenAICompatibleModelsInfo(modelConfig: ModelConfig): Promise<ModelInfo[]> {
    const openai = this.getOpenAIInstance(modelConfig)

    try {
      const response = await openai.models.list()

      if (response && response.data && Array.isArray(response.data)) {
        const models = response.data
          .map((model) => ({
            id: model.id,
            name: model.id,
          }))
          .sort((a, b) => a.id.localeCompare(b.id))

        if (models.length === 0) {
          throw new APIError('EMPTY_MODEL_LIST: API returned empty model list')
        }

        return models
      }

      // 返回格式不对，抛出标准化错误信息
      throw new APIError(`INVALID_RESPONSE_FORMAT: ${JSON.stringify(response)}`)
    } catch (error: any) {
      console.error('Failed to fetch model list:', error)

      // Core层只负责技术判断，抛出标准化的英文错误信息
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Connection error'))) {
        // 检查是否是真正的跨域错误
        // 跨域错误的特征：不同origin + 没有明显的DNS/连接错误
        const errorString = error.toString()
        let isCrossOriginError = false

        if (modelConfig.baseURL && typeof window !== 'undefined') {
          try {
            const apiUrl = new URL(modelConfig.baseURL)
            const currentUrl = new URL(window.location.href)

            // 只有在不同origin且没有明显的DNS/连接错误时才认为是跨域
            const isDifferentOrigin = apiUrl.origin !== currentUrl.origin
            const hasNetworkError =
              errorString.includes('ERR_NAME_NOT_RESOLVED') ||
              errorString.includes('ERR_CONNECTION_REFUSED') ||
              errorString.includes('ERR_NETWORK_CHANGED') ||
              errorString.includes('ERR_INTERNET_DISCONNECTED') ||
              errorString.includes('ERR_EMPTY_RESPONSE')

            isCrossOriginError = isDifferentOrigin && !hasNetworkError
          } catch (urlError) {
            // URL解析失败，当作普通连接错误处理
          }
        }

        // 根据检测结果抛出相应错误
        if (isCrossOriginError) {
          throw new APIError(`CROSS_ORIGIN_CONNECTION_FAILED: ${error.message}`)
        } else {
          throw new APIError(`CONNECTION_FAILED: ${error.message}`)
        }
      }

      // API返回的错误信息
      if (error.response?.data) {
        throw new APIError(`API_ERROR: ${JSON.stringify(error.response.data)}`)
      }

      // 其他错误，保持原始信息
      throw new APIError(`UNKNOWN_ERROR: ${error.message || 'Unknown error'}`)
    }
  }
  /**
   * 构建 Gemini 生成配置
   *
   * 注意：此方法假设传入的 llmParams 已经通过 ModelManager.validateConfig()
   * 中的 validateLLMParams 验证，确保安全性
   */
  private buildGeminiGenerationConfig(llmParams: Record<string, any> = {}): any {
    const { temperature, maxOutputTokens, topP, topK, candidateCount, stopSequences, ...otherParams } = llmParams

    const generationConfig: any = {}

    // 添加已知参数
    if (temperature !== undefined) {
      generationConfig.temperature = temperature
    }
    if (maxOutputTokens !== undefined) {
      generationConfig.maxOutputTokens = maxOutputTokens
    }
    if (topP !== undefined) {
      generationConfig.topP = topP
    }
    if (topK !== undefined) {
      generationConfig.topK = topK
    }
    if (candidateCount !== undefined) {
      generationConfig.candidateCount = candidateCount
    }
    if (stopSequences !== undefined && Array.isArray(stopSequences)) {
      generationConfig.stopSequences = stopSequences
    }

    // 添加其他参数 (已在上层验证过安全性)
    // 排除一些明显不属于 Gemini generationConfig 的参数
    for (const [key, value] of Object.entries(otherParams)) {
      if (!['timeout', 'model', 'messages', 'stream'].includes(key)) {
        generationConfig[key] = value
      }
    }

    return generationConfig
  }
}

/**
 * 创建LLM服务实例的工厂函数
 * @param modelManager 模型管理器实例
 * @returns LLM服务实例
 */
export function createLLMService(modelManager: ModelManager): ILLMService {
  return new LLMService(modelManager)
}
