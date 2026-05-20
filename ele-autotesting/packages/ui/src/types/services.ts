import type {
  IModelManager,
  ITemplateManager,
  IHistoryManager,
  IDataManager,
  ILLMService,
  IPromptService,
  ICompareService,
  IPreferenceService,
} from '@prompt-optimizer/core'

export type { IPreferenceService }

/**
 * 统一的应用服务接口定义
 */
export interface AppServices {
  modelManager: IModelManager
  templateManager: ITemplateManager
  historyManager: IHistoryManager
  dataManager: IDataManager
  llmService: ILLMService
  promptService: IPromptService
  preferenceService: IPreferenceService
  compareService: ICompareService
}
