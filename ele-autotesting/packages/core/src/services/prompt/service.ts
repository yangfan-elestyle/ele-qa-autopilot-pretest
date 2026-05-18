import { IPromptService, OptimizationRequest } from './types'
import { Message, StreamHandlers, ILLMService, ContentPart } from '../llm/types'
import { PromptRecord } from '../history/types'
import { IModelManager } from '../model/types'
import { ITemplateManager } from '../template/types'
import { IHistoryManager } from '../history/types'
import { OptimizationError, IterationError, TestError, ServiceDependencyError } from './errors'
import { ERROR_MESSAGES } from '../llm/errors'
import { TemplateProcessor, TemplateContext } from '../template/processor'

/**
 * 提示词服务实现
 */
export class PromptService implements IPromptService {
  constructor(
    private modelManager: IModelManager,
    private llmService: ILLMService,
    private templateManager: ITemplateManager,
    private historyManager: IHistoryManager,
  ) {
    this.checkDependencies()
  }

  /**
   * 检查依赖服务是否已初始化
   */
  private checkDependencies() {
    if (!this.modelManager) {
      throw new ServiceDependencyError('模型管理器未初始化', 'ModelManager')
    }
    if (!this.llmService) {
      throw new ServiceDependencyError('LLM服务未初始化', 'LLMService')
    }
    if (!this.templateManager) {
      throw new ServiceDependencyError('提示词管理器未初始化', 'TemplateManager')
    }
    if (!this.historyManager) {
      throw new ServiceDependencyError('历史记录管理器未初始化', 'HistoryManager')
    }
  }

  /**
   * 验证输入参数
   */
  private validateInput(prompt: string, modelKey: string) {
    if (!prompt?.trim()) {
      throw new OptimizationError(`${ERROR_MESSAGES.OPTIMIZATION_FAILED}: ${ERROR_MESSAGES.EMPTY_INPUT}`, prompt)
    }

    if (!modelKey?.trim()) {
      throw new OptimizationError(`${ERROR_MESSAGES.OPTIMIZATION_FAILED}: ${ERROR_MESSAGES.MODEL_KEY_REQUIRED}`, prompt)
    }
  }

  /**
   * 验证LLM响应
   */
  private validateResponse(response: string, prompt: string) {
    if (!response?.trim()) {
      throw new OptimizationError('Optimization failed: LLM service returned empty result', prompt)
    }
  }

  /**
   * 获取迭代链
   */
  async getIterationChain(recordId: string): Promise<PromptRecord[]> {
    return await this.historyManager.getIterationChain(recordId)
  }

  /**
   * 测试提示词（流式）- 支持可选系统提示词
   */
  async testPromptStream(
    systemPrompt: string,
    userPrompt: string,
    modelKey: string,
    callbacks: StreamHandlers,
    options?: { systemParts?: ContentPart[]; userParts?: ContentPart[] },
  ): Promise<void> {
    try {
      // 对于用户提示词优化，systemPrompt 可以为空
      if (!userPrompt?.trim()) {
        throw new TestError('User prompt is required', systemPrompt, userPrompt)
      }
      if (!modelKey?.trim()) {
        throw new TestError('Model key is required', systemPrompt, userPrompt)
      }

      const modelConfig = await this.modelManager.getModel(modelKey)
      if (!modelConfig) {
        throw new TestError('Model not found', systemPrompt, userPrompt)
      }

      const messages: Message[] = []

      // system: 优先使用传入的内容片段，否则使用字符串
      if (options?.systemParts && options.systemParts.length > 0) {
        messages.push({ role: 'system', content: options.systemParts })
      } else if (systemPrompt?.trim()) {
        messages.push({ role: 'system', content: systemPrompt })
      }

      // user: 优先使用传入的内容片段（若无则使用字符串）
      if (options?.userParts && options.userParts.length > 0) {
        messages.push({ role: 'user', content: options.userParts })
      } else {
        messages.push({ role: 'user', content: userPrompt })
      }

      // 使用新的结构化流式响应
      await this.llmService.sendMessageStream(messages, modelKey, {
        onToken: callbacks.onToken,
        onReasoningToken: callbacks.onReasoningToken, // 支持推理内容流
        onComplete: callbacks.onComplete,
        onError: callbacks.onError,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new TestError(`Test failed: ${errorMessage}`, systemPrompt, userPrompt)
    }
  }

  /**
   * 优化提示词（流式）- 支持提示词类型和增强功能
   */
  async optimizePromptStream(request: OptimizationRequest, callbacks: StreamHandlers): Promise<void> {
    try {
      this.validateOptimizationRequest(request)

      const modelConfig = await this.modelManager.getModel(request.modelKey)
      if (!modelConfig) {
        throw new OptimizationError('Model not found', request.targetPrompt)
      }

      const template = await this.templateManager.getTemplate(request.templateId || '')

      if (!template?.content) {
        throw new OptimizationError('Template not found or invalid', request.targetPrompt)
      }

      const context: TemplateContext = {
        originalPrompt: request.targetPrompt,
        lastOptimizedPrompt: request.targetPrompt,
        iterateInput: '',
      }

      const messages = TemplateProcessor.processTemplate(template, context)

      // 使用新的结构化流式响应
      await this.llmService.sendMessageStream(messages, request.modelKey, {
        onToken: callbacks.onToken,
        onReasoningToken: callbacks.onReasoningToken, // 支持推理内容流
        onComplete: async (response) => {
          if (response) {
            // 验证主要内容
            this.validateResponse(response.content, request.targetPrompt)

            // 注意：历史记录保存由UI层的historyManager.createNewChain方法处理
            // 移除重复的saveOptimizationHistory调用以避免重复保存
          }

          // 调用原始完成回调，传递结构化响应
          callbacks.onComplete(response)
        },
        onError: callbacks.onError,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new OptimizationError(`Optimization failed: ${errorMessage}`, request.targetPrompt)
    }
  }

  /**
   * 迭代优化提示词（流式）
   */
  async iteratePromptStream(
    originalPrompt: string,
    lastOptimizedPrompt: string,
    iterateInput: string,
    modelKey: string,
    handlers: StreamHandlers,
    templateId: string,
  ): Promise<void> {
    try {
      this.validateInput(originalPrompt, modelKey)
      this.validateInput(lastOptimizedPrompt, modelKey)
      this.validateInput(iterateInput, modelKey)

      // 获取模型配置
      const modelConfig = await this.modelManager.getModel(modelKey)
      if (!modelConfig) {
        throw new ServiceDependencyError('Model not found', 'ModelManager')
      }

      // 获取迭代提示词
      let template
      try {
        template = await this.templateManager.getTemplate(templateId)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new IterationError(`Iteration failed: ${errorMessage}`, originalPrompt, iterateInput)
      }

      if (!template?.content) {
        throw new IterationError('Iteration failed: Template not found or invalid', originalPrompt, iterateInput)
      }

      // 使用TemplateProcessor处理模板和变量替换
      const context: TemplateContext = {
        originalPrompt,
        lastOptimizedPrompt,
        iterateInput,
      }
      const messages = TemplateProcessor.processTemplate(template, context)

      // 使用新的结构化流式响应
      await this.llmService.sendMessageStream(messages, modelKey, {
        onToken: handlers.onToken,
        onReasoningToken: handlers.onReasoningToken, // 支持推理内容流
        onComplete: async (response) => {
          if (response) {
            // 验证迭代结果
            this.validateResponse(response.content, lastOptimizedPrompt)
          }

          // 调用原始完成回调，传递结构化响应
          // 注意：迭代历史记录由UI层的historyManager.addIteration方法处理
          handlers.onComplete(response)
        },
        onError: handlers.onError,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new IterationError(`Iteration failed: ${errorMessage}`, originalPrompt, iterateInput)
    }
  }

  // === 新增：支持提示词类型的增强方法 ===

  /**
   * 验证优化请求参数
   */
  private validateOptimizationRequest(request: OptimizationRequest) {
    if (!request.targetPrompt?.trim()) {
      throw new OptimizationError('Target prompt is required', '')
    }
    if (!request.modelKey?.trim()) {
      throw new OptimizationError('Model key is required', request.targetPrompt)
    }
  }
}
