<template>
  <!-- Template Selection Modal -->
  <FullscreenDialog v-model="showTemplateModal" title="选择内容生成模板">
    <div class="flex flex-col h-full">
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="loadingTemplates" class="text-center py-8">
          <div class="text-lg">加载中...</div>
        </div>
        <div v-else-if="templates.length === 0" class="text-center py-8 theme-text-secondary">
          暂无模板
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="template in templates"
            :key="template.id"
            class="p-3 border rounded-lg cursor-pointer transition-colors theme-card"
            :class="{
              'ring-2 ring-blue-500 bg-blue-50': selectedTemplates.has(template.id),
            }"
            @click="toggleTemplateSelection(template.id)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="font-medium theme-text">{{ template.name }}</h4>
                <p v-if="template.metadata?.description" class="text-sm theme-text-secondary mt-1">
                  {{ template.metadata.description }}
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <span v-if="template.isBuiltin" class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                    内置
                  </span>
                </div>
              </div>
              <div class="flex-none ml-3">
                <div
                  class="w-5 h-5 rounded border-2 flex items-center justify-center"
                  :class="selectedTemplates.has(template.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'"
                >
                  <svg v-if="selectedTemplates.has(template.id)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex-none p-4 border-t theme-border">
        <div class="flex justify-between items-center">
          <div class="text-sm theme-text-secondary">
            {{ `已选择 ${selectedTemplates.size} 项` }}
          </div>
          <div class="flex gap-2">
            <button @click="cancelTemplateSelection" class="px-4 py-2 text-sm theme-button-secondary">
              取消
            </button>
            <button @click="confirmTemplateSelection" class="px-4 py-2 text-sm theme-button-primary" :disabled="selectedTemplates.size === 0">
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  </FullscreenDialog>

  <!-- History Selection Modal -->
  <FullscreenDialog v-model="showHistoryModal" title="选择上下文">
    <div class="flex flex-col h-full">
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="historyRecords.length === 0" class="text-center py-8 theme-text-secondary">
          暂无上下文
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="record in historyRecords"
            :key="record.id"
            class="p-3 border rounded-lg cursor-pointer transition-colors theme-card"
            :class="{
              'ring-2 ring-green-500 bg-green-50': selectedHistoryRecords.has(record.id),
            }"
            @click="toggleHistorySelection(record.id)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 v-if="record.contentMark" class="font-medium theme-text">场景 : {{ record.contentMark }}</h4>
                <p class="text-sm theme-text-secondary mt-1 break-all">
                  {{ truncateText(record.originalPrompt.replace(/\s+/g, ' '), 200) }}
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-xs theme-text-secondary">
                    {{ new Date(record.timestamp).toLocaleString() }}
                  </span>
                </div>
              </div>
              <div class="flex-none ml-3">
                <div
                  class="w-5 h-5 rounded border-2 flex items-center justify-center"
                  :class="selectedHistoryRecords.has(record.id) ? 'bg-green-500 border-green-500' : 'border-gray-300'"
                >
                  <svg v-if="selectedHistoryRecords.has(record.id)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex-none p-4 border-t theme-border">
        <div class="flex justify-between items-center">
          <div class="text-sm theme-text-secondary">
            {{ `已选择 ${selectedHistoryRecords.size} 项` }}
          </div>
          <div class="flex gap-2">
            <button @click="cancelHistorySelection" class="px-4 py-2 text-sm theme-button-secondary">
              取消
            </button>
            <button @click="confirmHistorySelection" class="px-4 py-2 text-sm theme-button-primary" :disabled="selectedHistoryRecords.size === 0">
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  </FullscreenDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PropType } from 'vue'
import type { Template, PromptRecord, PromptRecordChain } from '@prompt-optimizer/core'
import { useToast } from '../composables/useToast'
import FullscreenDialog from './FullscreenDialog.vue'

const toast = useToast()

const props = defineProps({
  services: {
    type: [Object, null] as PropType<any>,
    required: true,
  },
  history: {
    type: Array as PropType<PromptRecordChain[]>,
    default: () => [],
  },
})

const emit = defineEmits<{
  templateSelected: [templates: Template[]]
  historySelected: [records: PromptRecord[]]
}>()

// 模板选择相关状态
const showTemplateModal = ref(false)
const templates = ref<Template[]>([])
const selectedTemplates = ref(new Set<string>())
const loadingTemplates = ref(false)

// 历史记录选择相关状态
const showHistoryModal = ref(false)
const selectedHistoryRecords = ref(new Set<string>())

// 从 props.history 中获取排序后的历史记录
const sortedHistory = computed((): PromptRecordChain[] => {
  return props.history
    .filter((chain) => chain.rootRecord.type === 'ContextOptimizeRecordType')
    .sort((a, b) => b.currentRecord.timestamp - a.currentRecord.timestamp)
})

// 将 chain 的 currentRecord 转换为平铺的记录列表，添加 chainId 信息
const historyRecords = computed((): (PromptRecord & { chainId: string })[] => {
  return sortedHistory.value.map((chain) => ({
    ...chain.currentRecord,
    chainId: chain.chainId,
  }))
})

// 加载模板列表 - 只获取 optimize 类型的模板
const loadTemplates = async () => {
  if (!props.services?.templateManager) return

  try {
    loadingTemplates.value = true
    const allTemplates = await props.services.templateManager.listTemplates()
    // 只过滤出 optimize 类型的模板
    templates.value = allTemplates.filter((template: Template) => template.metadata?.templateType === 'optimize')
  } catch (error) {
    console.error('[TestPanelPromptSelect] 加载模板失败:', error)
    toast.error('加载模板失败')
  } finally {
    loadingTemplates.value = false
  }
}

// 历史记录不需要单独加载，直接使用 props.history

// 切换模板选择状态
const toggleTemplateSelection = (templateId: string) => {
  if (selectedTemplates.value.has(templateId)) {
    selectedTemplates.value.delete(templateId)
  } else {
    selectedTemplates.value.add(templateId)
  }
}

// 切换历史记录选择状态
const toggleHistorySelection = (recordId: string) => {
  if (selectedHistoryRecords.value.has(recordId)) {
    selectedHistoryRecords.value.delete(recordId)
  } else {
    selectedHistoryRecords.value.add(recordId)
  }
}

// 确认选择模板
const confirmTemplateSelection = () => {
  const selectedIds = Array.from(selectedTemplates.value)
  const templatesToAdd = templates.value.filter((t: Template) => selectedIds.includes(t.id))

  emit('templateSelected', templatesToAdd)

  selectedTemplates.value.clear()
  showTemplateModal.value = false
}

// 确认选择历史记录
const confirmHistorySelection = () => {
  const selectedIds = Array.from(selectedHistoryRecords.value)
  const recordsToAdd = historyRecords.value.filter((r) => selectedIds.includes(r.id))

  emit('historySelected', recordsToAdd)

  selectedHistoryRecords.value.clear()
  showHistoryModal.value = false
}

// 取消选择
const cancelTemplateSelection = () => {
  selectedTemplates.value.clear()
  showTemplateModal.value = false
}

const cancelHistorySelection = () => {
  selectedHistoryRecords.value.clear()
  showHistoryModal.value = false
}

// 显示模板选择弹窗
const showTemplateSelection = async () => {
  await loadTemplates()
  showTemplateModal.value = true
}

// 显示历史记录选择弹窗 - 直接显示，不需要加载
const showHistorySelection = () => {
  showHistoryModal.value = true
}

// 添加文本截断函数
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// 暴露方法供父组件调用
defineExpose({
  showTemplateSelection,
  showHistorySelection,
})
</script>

<style scoped>
/* 如果需要特定样式，可以在这里添加 */
</style>
