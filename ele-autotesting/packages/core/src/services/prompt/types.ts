import { PromptRecord } from '../history/types'
import { StreamHandlers, ContentPart } from '../llm/types'

/**
 * 优化请求接口
 */
export interface OptimizationRequest {
  targetPrompt: string // 待优化的提示词
  templateId?: string
  modelKey: string
}

/**
 * 提示词服务接口
 */
export interface IPromptService {
  /** 获取迭代链 */
  getIterationChain(recordId: string): Promise<PromptRecord[]>

  /** 优化提示词（流式）- 支持提示词类型和增强功能 */
  optimizePromptStream(request: OptimizationRequest, callbacks: StreamHandlers): Promise<void>

  /** 迭代优化提示词（流式） */
  iteratePromptStream(
    originalPrompt: string,
    lastOptimizedPrompt: string,
    iterateInput: string,
    modelKey: string,
    handlers: StreamHandlers,
    templateId: string,
  ): Promise<void>

  /** 测试提示词（流式）- 支持可选系统提示词与多模态内容 */
  testPromptStream(
    systemPrompt: string,
    userPrompt: string,
    modelKey: string,
    callbacks: StreamHandlers,
    options?: {
      systemParts?: ContentPart[]
      userParts?: ContentPart[]
    },
  ): Promise<void>
}

export type { StreamHandlers, ContentPart }
