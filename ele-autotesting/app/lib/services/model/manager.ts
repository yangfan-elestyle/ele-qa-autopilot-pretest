import { IModelManager, ModelConfig } from './types'
import { IStorageProvider } from '../storage/types'
import { StorageAdapter } from '../storage/adapter'
import { defaultModels } from './defaults'
import { ModelConfigError } from '../llm/errors'
import { validateLLMParams } from './validation'
import { CORE_SERVICE_KEYS } from '../../constants/storage-keys'
import { ImportExportError } from '../../interfaces/import-export'

export class ModelManager implements IModelManager {
  private readonly storageKey = CORE_SERVICE_KEYS.MODELS
  private readonly storage: IStorageProvider
  private initPromise: Promise<void>

  constructor(storageProvider: IStorageProvider) {
    this.storage = new StorageAdapter(storageProvider)
    this.initPromise = this.init().catch((err) => {
      console.error('Model manager initialization failed:', err)
      throw err
    })
  }

  public async ensureInitialized(): Promise<void> {
    await this.initPromise
  }

  public async isInitialized(): Promise<boolean> {
    return !!(await this.storage.getItem(this.storageKey))
  }

  private async init(): Promise<void> {
    try {
      const storedData = await this.storage.getItem(this.storageKey)

      if (!storedData) {
        await this.storage.setItem(this.storageKey, JSON.stringify(defaultModels))
        return
      }

      let storedModels: Record<string, ModelConfig>
      try {
        storedModels = JSON.parse(storedData)
      } catch (error) {
        console.error('[ModelManager] Failed to parse stored models, resetting to defaults:', error)
        await this.storage.setItem(this.storageKey, JSON.stringify(defaultModels))
        return
      }

      // 合并默认模型：保留用户的关键配置，补齐缺失字段
      const merged = { ...storedModels }
      let hasUpdates = false
      for (const [key, defaults] of Object.entries(defaultModels)) {
        const existing = merged[key]
        if (!existing) {
          merged[key] = defaults
          hasUpdates = true
          continue
        }
        const updated: ModelConfig = {
          ...defaults,
          name: existing.name ?? defaults.name,
          baseURL: existing.baseURL || defaults.baseURL,
          defaultModel: existing.defaultModel ?? defaults.defaultModel,
          apiKey: existing.apiKey || defaults.apiKey,
          enabled: existing.enabled ?? defaults.enabled,
          llmParams: existing.llmParams || defaults.llmParams,
        }
        if (JSON.stringify(existing) !== JSON.stringify(updated)) {
          merged[key] = updated
          hasUpdates = true
        }
      }

      if (hasUpdates) {
        await this.storage.setItem(this.storageKey, JSON.stringify(merged))
      }
    } catch (error) {
      console.error('[ModelManager] Initialization failed:', error)
      try {
        await this.storage.setItem(this.storageKey, JSON.stringify(defaultModels))
      } catch (saveError) {
        console.error('[ModelManager] Failed to save default models:', saveError)
      }
    }
  }

  private async getModelsFromStorage(): Promise<Record<string, ModelConfig>> {
    const storedData = await this.storage.getItem(this.storageKey)
    if (storedData) {
      try {
        return JSON.parse(storedData)
      } catch (error) {
        console.error('[ModelManager] Failed to parse stored models, using defaults:', error)
      }
    }
    return defaultModels
  }

  async getAllModels(): Promise<Array<ModelConfig & { key: string }>> {
    await this.ensureInitialized()
    const models = await this.getModelsFromStorage()
    return Object.entries(models).map(([key, config]) => ({ key, ...config }))
  }

  async getModel(key: string): Promise<ModelConfig | undefined> {
    await this.ensureInitialized()
    const models = await this.getModelsFromStorage()
    return models[key]
  }

  async addModel(key: string, config: ModelConfig): Promise<void> {
    await this.ensureInitialized()
    this.validateConfig(config)

    await this.storage.updateData<Record<string, ModelConfig>>(this.storageKey, (currentModels) => {
      const models = currentModels ?? defaultModels
      if (models[key]) {
        throw new ModelConfigError(`Model ${key} already exists`)
      }
      return {
        ...models,
        [key]: { ...config, ...(config.llmParams && { llmParams: { ...config.llmParams } }) },
      }
    })
  }

  async updateModel(key: string, config: Partial<ModelConfig>): Promise<void> {
    await this.ensureInitialized()

    await this.storage.updateData<Record<string, ModelConfig>>(this.storageKey, (currentModels) => {
      const models = currentModels ?? defaultModels

      // 如果模型不存在，检查是否是内置模型
      if (!models[key]) {
        if (!defaultModels[key]) {
          throw new ModelConfigError(`Model ${key} does not exist`)
        }
        const builtinDefault = defaultModels[key]
        models[key] = {
          ...builtinDefault,
          ...(builtinDefault.llmParams && { llmParams: { ...builtinDefault.llmParams } }),
        }
      }

      const updatedConfig: ModelConfig = {
        ...models[key],
        ...config,
        enabled: config.enabled ?? models[key].enabled,
        ...(config.llmParams && { llmParams: { ...config.llmParams } }),
      }

      // 关键字段变化或启用时验证
      if (
        config.name !== undefined ||
        config.baseURL !== undefined ||
        config.models !== undefined ||
        config.defaultModel !== undefined ||
        config.apiKey !== undefined ||
        config.llmParams !== undefined ||
        config.enabled
      ) {
        this.validateConfig(updatedConfig)
      }

      return { ...models, [key]: updatedConfig }
    })
  }

  async deleteModel(key: string): Promise<void> {
    await this.ensureInitialized()
    await this.storage.updateData<Record<string, ModelConfig>>(this.storageKey, (currentModels) => {
      const models = currentModels ?? defaultModels
      if (!models[key]) {
        throw new ModelConfigError(`Model ${key} does not exist`)
      }
      const { [key]: _removed, ...remaining } = models
      return remaining
    })
  }

  async enableModel(key: string): Promise<void> {
    await this.ensureInitialized()
    await this.storage.updateData<Record<string, ModelConfig>>(this.storageKey, (currentModels) => {
      const models = currentModels ?? defaultModels
      if (!models[key]) {
        throw new ModelConfigError(`Unknown model: ${key}`)
      }
      this.validateConfig(models[key])
      return { ...models, [key]: { ...models[key], enabled: true } }
    })
  }

  async disableModel(key: string): Promise<void> {
    await this.ensureInitialized()
    await this.storage.updateData<Record<string, ModelConfig>>(this.storageKey, (currentModels) => {
      const models = currentModels ?? defaultModels
      if (!models[key]) {
        throw new ModelConfigError(`Unknown model: ${key}`)
      }
      return { ...models, [key]: { ...models[key], enabled: false } }
    })
  }

  private validateConfig(config: ModelConfig): void {
    const errors: string[] = []

    if (!config.name) errors.push('Missing model name (name)')
    if (!config.baseURL) errors.push('Missing base URL (baseURL)')
    if (!config.defaultModel) errors.push('Missing default model (defaultModel)')

    if (config.llmParams !== undefined && (typeof config.llmParams !== 'object' || config.llmParams === null || Array.isArray(config.llmParams))) {
      errors.push('llmParams must be an object')
    }

    if (config.llmParams && typeof config.llmParams === 'object') {
      const validation = validateLLMParams(config.llmParams, config.provider || 'openai')
      if (!validation.isValid) {
        errors.push(...validation.errors.map((e) => `Parameter ${e.parameterName}: ${e.message}`))
      }
    }

    if (errors.length > 0) {
      throw new ModelConfigError('Invalid model configuration: ' + errors.join(', '))
    }
  }

  async getEnabledModels(): Promise<Array<ModelConfig & { key: string }>> {
    const allModels = await this.getAllModels()
    return allModels.filter((model) => model.enabled)
  }

  // IImportExportable

  async exportData(): Promise<ModelConfig[]> {
    try {
      return await this.getAllModels()
    } catch (error) {
      throw new ImportExportError('Failed to export model data', await this.getDataType(), error as Error)
    }
  }

  async importData(data: any): Promise<void> {
    if (!Array.isArray(data)) {
      throw new Error('Invalid model data format: data must be an array of model configurations')
    }

    const models = data as (ModelConfig & { key: string })[]

    for (const model of models) {
      try {
        if (!this.validateSingleModel(model)) {
          console.warn('Skipping invalid model configuration:', model)
          continue
        }

        const existing = await this.getModel(model.key)
        const baseFromImport = {
          name: model.name,
          baseURL: model.baseURL,
          models: model.models,
          defaultModel: model.defaultModel,
          provider: model.provider,
          enabled: model.enabled,
          ...(model.apiKey !== undefined && { apiKey: model.apiKey }),
          ...(model.llmParams !== undefined && { llmParams: model.llmParams }),
        }

        if (existing) {
          await this.updateModel(model.key, {
            ...baseFromImport,
            baseURL: baseFromImport.baseURL || existing.baseURL,
            models: baseFromImport.models || existing.models,
            defaultModel: baseFromImport.defaultModel || existing.defaultModel,
            provider: baseFromImport.provider || existing.provider,
          })
        } else {
          await this.addModel(model.key, {
            ...baseFromImport,
            baseURL: baseFromImport.baseURL || 'https://api.example.com/v1',
            models: baseFromImport.models || [],
            defaultModel: baseFromImport.defaultModel || baseFromImport.models?.[0] || 'default-model',
            provider: baseFromImport.provider || 'custom',
            enabled: baseFromImport.enabled ?? false,
          })
        }
      } catch (error) {
        console.warn(`Error importing model ${model.key}:`, error)
      }
    }
  }

  async getDataType(): Promise<string> {
    return 'models'
  }

  async validateData(data: any): Promise<boolean> {
    return Array.isArray(data) && data.every((item) => this.validateSingleModel(item))
  }

  private validateSingleModel(item: any): boolean {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof item.key === 'string' &&
      typeof item.name === 'string' &&
      typeof item.baseURL === 'string' &&
      typeof item.defaultModel === 'string' &&
      typeof item.enabled === 'boolean' &&
      typeof item.provider === 'string'
    )
  }
}

export function createModelManager(storageProvider: IStorageProvider): ModelManager {
  return new ModelManager(storageProvider)
}
