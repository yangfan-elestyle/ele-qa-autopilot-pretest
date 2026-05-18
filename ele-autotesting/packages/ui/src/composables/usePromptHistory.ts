import { ref, watch, computed, reactive, type Ref } from 'vue'
import { useToast } from './useToast'
import { v4 as uuidv4 } from 'uuid'
import type { IHistoryManager, PromptRecordChain, PromptRecord, ContentType } from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'

type PromptChain = PromptRecordChain

export type ContextConfig = {
  contentType: ContentType
  contentMark?: string
  contents: string
}

/**
 * 提示词历史管理Hook
 * @param services 服务实例引用
 * @param prompt 提示词
 * @param optimizedPrompt 优化后的提示词
 * @param currentChainId 当前链ID
 * @param currentVersions 当前版本列表
 * @param currentVersionId 当前版本ID
 * @returns 提示词历史管理接口
 */
export function usePromptHistory(
  services: Ref<AppServices | null>,
  prompt: Ref<string>,
  optimizedPrompt: Ref<string>,
  currentChainId: Ref<string>,
  currentVersions: Ref<PromptChain['versions']>,
  currentVersionId: Ref<string>,
) {
  const toast = useToast()
  // 历史记录管理器引用
  const historyManager = computed(() => services.value?.historyManager)

  // 创建一个 reactive 状态对象
  const state = reactive({
    history: [] as PromptChain[],
    showHistory: false,

    handleSelectHistory: async (context: { record: any; chainId: string; rootPrompt: string }) => {
      try {
        const { record, chainId, rootPrompt } = context

        // 设置工作区内容
        prompt.value = rootPrompt
        optimizedPrompt.value = record.optimizedPrompt

        // 加载现有链（而不是创建新链）- 这是修复迭代断层问题的关键
        const existingChain = await historyManager.value!.getChain(chainId)

        // 恢复完整的链状态，保持版本历史连贯性
        currentChainId.value = existingChain.chainId
        currentVersions.value = existingChain.versions
        currentVersionId.value = record.id

        await refreshHistory()
        state.showHistory = false

        toast.success('上下文已加载')
      } catch (error) {
        console.error('[History] 加载历史记录失败:', error)
        toast.error('加载上下文失败')
      }
    },

    handleClearHistory: async () => {
      try {
        await historyManager.value!.clearHistory()

        // 清空当前显示的内容
        prompt.value = ''
        optimizedPrompt.value = ''
        currentChainId.value = ''
        currentVersions.value = []
        currentVersionId.value = ''

        // 立即更新历史记录，确保UI能够反映最新状态
        state.history = []
        toast.success('上下文已清空')
      } catch (error) {
        console.error('清空上下文失败', error)
        toast.error('清空上下文失败')
      }
    },

    handleDeleteChain: async (chainId: string) => {
      try {
        // 获取链中的所有记录
        const allChains = await historyManager.value!.getAllChains()
        const chain = allChains.find((c: any) => c.chainId === chainId)

        if (chain) {
          // 删除链中的所有记录
          for (const record of chain.versions) {
            await historyManager.value!.deleteRecord(record.id)
          }

          // 如果当前正在查看的是被删除的链，则清空当前显示
          if (currentChainId.value === chainId) {
            prompt.value = ''
            optimizedPrompt.value = ''
            currentChainId.value = ''
            currentVersions.value = []
            currentVersionId.value = ''
          }

          // 立即更新历史记录，确保UI能够反映最新状态
          const updatedChains = await historyManager.value!.getAllChains()
          state.history = [...updatedChains]
          toast.success('上下文已删除')
        }
      } catch (error) {
        console.error('删除上下文失败', error)
        toast.error('删除上下文失败')
      }
    },

    initHistory: async () => {
      try {
        await refreshHistory()
      } catch (error) {
        console.error('加载上下文失败', error)
        toast.error('加载上下文失败')
      }
    },
  })

  // 添加一个刷新历史记录的函数
  const refreshHistory = async () => {
    const chains = await historyManager.value!.getAllChains()
    state.history = [...chains]
  }

  // Watch history display state
  watch(
    () => state.showHistory,
    async (newVal) => {
      if (newVal) {
        await refreshHistory()
      }
    },
  )

  // Watch version changes, update history
  watch([currentVersions], async () => {
    await refreshHistory()
  })

  // 监听服务实例变化，初始化历史记录
  watch(
    services,
    async () => {
      if (services.value?.historyManager) {
        await refreshHistory()
      }
    },
    { immediate: true },
  )

  return state
}
