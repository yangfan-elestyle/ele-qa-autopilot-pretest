// Core package entry point

// 导出模板相关
export { TemplateManager, createTemplateManager } from './services/template/manager'
export { TemplateProcessor } from './services/template/processor'
export * from './services/template/types'
export { StaticLoader } from './services/template/static-loader'
export * from './services/template/errors'

// 导出历史记录相关
export { HistoryManager, createHistoryManager } from './services/history/manager'
export * from './services/history/types'
export * from './services/history/errors'

// 导出LLM服务相关
export type { ILLMService, Message, StreamHandlers, LLMResponse, ModelInfo, ModelOption, ContentPart } from './services/llm/types'
export { LLMService, createLLMService } from './services/llm/service'
export * from './services/llm/errors'

// 导出模型管理相关
export { ModelManager, createModelManager } from './services/model/manager'
export * from './services/model/types'
export * from './services/model/defaults'
export * from './services/model/advancedParameterDefinitions'

// 导出存储相关
export * from './services/storage/types'
export { StorageFactory } from './services/storage/factory'
export { DexieStorageProvider } from './services/storage/dexieStorageProvider'
export { LocalStorageProvider } from './services/storage/localStorageProvider'
export { MemoryStorageProvider } from './services/storage/memoryStorageProvider'
export { RemoteStorageProvider } from './services/storage/remoteStorageProvider'
export type { AuthHeaderProvider } from './services/storage/remoteStorageProvider'
export { ensureDeviceId, clearDeviceId } from './utils/deviceId'

// 导出提示词服务相关
export { PromptService } from './services/prompt/service'
export { createPromptService } from './services/prompt/factory'
export * from './services/prompt/types'
export * from './services/prompt/errors'

// 导出对比服务相关
export { CompareService, createCompareService } from './services/compare/service'
export type { ICompareService } from './services/compare/types'
export * from './services/compare/types'
export * from './services/compare/errors'

// 导出数据管理相关
export { DataManager, createDataManager } from './services/data/manager'
export type { IDataManager } from './services/data/manager'

// 导出偏好设置服务相关
export * from './services/preference/types'
export { PreferenceService, createPreferenceService } from './services/preference/service'

export { getProxyUrl } from './utils/environment'
export type { LLMValidationResult, ValidationError, ValidationWarning } from './services/model/validation'

// 导出存储键常量
export {
  CORE_SERVICE_KEYS,
  UI_SETTINGS_KEYS,
  MODEL_SELECTION_KEYS,
  TEMPLATE_SELECTION_KEYS,
  ALL_STORAGE_KEYS,
  ALL_STORAGE_KEYS_ARRAY,
} from './constants/storage-keys'
export type { CoreServiceKey, UISettingsKey, ModelSelectionKey, TemplateSelectionKey, StorageKey } from './constants/storage-keys'
