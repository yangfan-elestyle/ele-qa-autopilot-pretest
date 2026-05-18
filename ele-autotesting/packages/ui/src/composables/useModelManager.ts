import { ref, watch, computed, reactive } from 'vue'
import type { Ref } from 'vue'
import type { ModelConfig, IModelManager } from '@prompt-optimizer/core'
import { useToast } from './useToast'
import { usePreferences } from './usePreferenceManager'
import { MODEL_SELECTION_KEYS } from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'

export interface ModelManagerHooks {
  showConfig: boolean
  selectedOptimizeModel: string
  selectedTestModel: string
  initModelSelection: () => void
}

/**
 * 模型管理器Hook
 * @param services 服务实例引用
 * @param options 选项配置
 * @returns ModelManagerHooks
 */
export function useModelManager(services: Ref<AppServices | null>): ModelManagerHooks {
  const toast = useToast()
  const { getPreference, setPreference } = usePreferences(services)

  // 模型管理器引用
  const modelManager = computed(() => services.value?.modelManager)

  // 创建一个 reactive 状态对象
  const state = reactive<ModelManagerHooks>({
    showConfig: false,
    selectedOptimizeModel: '',
    selectedTestModel: '',
    initModelSelection: async () => {
      try {
        const allModels = await modelManager.value!.getAllModels()
        const enabledModels = allModels.filter((m) => m.enabled)
        const defaultModel = enabledModels[0]?.key

        if (enabledModels.length > 0) {
          const savedOptimizeModel = await getPreference(MODEL_SELECTION_KEYS.OPTIMIZE_MODEL, defaultModel)
          state.selectedOptimizeModel = enabledModels.some((m) => m.key === savedOptimizeModel) ? savedOptimizeModel : defaultModel

          const savedTestModel = await getPreference(MODEL_SELECTION_KEYS.TEST_MODEL, defaultModel)
          state.selectedTestModel = enabledModels.some((m) => m.key === savedTestModel) ? savedTestModel : defaultModel

          await saveModelSelection(state.selectedOptimizeModel, 'optimize')
          await saveModelSelection(state.selectedTestModel, 'test')
        }
      } catch (error) {
        console.error('初始化模型选择失败', error)
        toast.error('初始化模型选择失败')
      }
    },
  })

  // Save model selection
  const saveModelSelection = async (model: string, type: 'optimize' | 'test') => {
    if (model) {
      try {
        await setPreference(type === 'optimize' ? MODEL_SELECTION_KEYS.OPTIMIZE_MODEL : MODEL_SELECTION_KEYS.TEST_MODEL, model)
      } catch (error) {
        console.error(`保存模型选择失败 (${type}):`, error)
        throw error
      }
    }
  }

  // Watch model selection changes
  watch(
    () => state.selectedOptimizeModel,
    async (newVal) => {
      if (newVal) {
        await saveModelSelection(newVal, 'optimize')
      }
    },
  )

  watch(
    () => state.selectedTestModel,
    async (newVal) => {
      if (newVal) {
        await saveModelSelection(newVal, 'test')
      }
    },
  )

  // 监听服务实例变化，初始化模型选择
  watch(
    services,
    async () => {
      if (services.value?.modelManager) {
        await state.initModelSelection()
      }
    },
    { immediate: true },
  )

  return state
}
