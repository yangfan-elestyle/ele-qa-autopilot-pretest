<template>
  <ContentCardUI>
    <div class="flex flex-col h-full">
      <!-- Test Input Area -->
      <div class="flex-none">
        <!-- For user prompt optimization, show simplified test controls -->
        <div class="space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-lg font-medium theme-text">
              内容生成
            </h3>
            <div class="flex flex-wrap items-center gap-2">
              <ModelSelectUI
                ref="testModelSelect"
                :modelValue="selectedTestModel"
                @update:modelValue="updateSelectedModel"
                :disabled="isTesting"
                @config="$emit('showConfig')"
              />
              <button @click="handleTest" :disabled="isTesting || !selectedTestModel" class="h-10 px-4 text-sm font-medium theme-button-primary">
                {{ isTesting ? '生成中...' : '开始生成 →' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Test Results Area -->
      <div class="flex-1 min-h-0 md:overflow-hidden overflow-visible mt-5">
        <div class="relative h-full flex flex-col md:block">
          <!-- Optimized Prompt Test Result -->
          <div class="flex flex-col min-h-0 transition-all duration-300 min-h-[80px] md:absolute md:inset-0 md:h-full md:w-full md:left-0">
            <!-- Test Result Header with Add Action -->
            <div class="flex flex-col gap-2 mb-3 flex-none sm:flex-row sm:items-center sm:justify-between">
              <h3 class="text-lg font-semibold theme-text truncate flex-shrink-0">
                生成结果
              </h3>

              <!-- Items and Add Action Container -->
              <div class="flex items-center gap-2 flex-1 min-w-0 sm:ml-4">
                <!-- Added Items with Horizontal Scroll (always present for layout) -->
                <div class="flex-1 min-w-0">
                  <div v-if="addedItems.length > 0" class="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                    <div
                      v-for="item in sortedAddedItems"
                      :key="item.id"
                      class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border flex-shrink-0"
                      :class="{
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200': item.type === 'template',
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': item.type === 'history',
                      }"
                    >
                      <span class="whitespace-nowrap" :title="item.name">{{ truncateText(item.name, 30) }}</span>
                      <button
                        @click="removeItem(item.id)"
                        class="hover:bg-black/10 dark:hover:bg-white/10 rounded-sm p-0.5 transition-colors flex-shrink-0"
                        title="移除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Add Action Dropdown -->
                <div class="relative flex-shrink-0" ref="addActionDropdown">
                  <button
                    @click="toggleAddAction"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium theme-button-secondary"
                    :class="{ 'theme-button-active': showAddAction }"
                  >
                    <span>添加数据源</span>
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                  </button>

                  <!-- Dropdown Menu -->
                  <div v-show="showAddAction" class="absolute right-0 top-full mt-1 w-48 theme-dropdown z-50">
                    <button @click="handleAddTemplate" class="w-full px-3 py-2 text-left text-sm theme-dropdown-item theme-dropdown-item-inactive">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                        添加【内容生成】模板
                      </div>
                    </button>
                    <button @click="handleAddHistory" class="w-full px-3 py-2 text-left text-sm theme-dropdown-item theme-dropdown-item-inactive">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-green-500"></span>
                        添加【上下文】数据
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <OutputDisplay
              v-model:content="optimizedTestResult"
              :reasoning="optimizedTestReasoning"
              :streaming="isTestingOptimized"
              :enableDiff="false"
              :enableExcel="true"
              mode="editable"
              class="flex-1 min-h-0"
            />

            <!-- Prompt Selection Component -->
            <TestPanelPromptSelect
              ref="promptSelectRef"
              :services="props.services"
              :history="props.history"
              @templateSelected="handleTemplateSelected"
              @historySelected="handleHistorySelected"
            />
          </div>
        </div>
      </div>
    </div>
  </ContentCardUI>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import type { PropType } from 'vue'
import type { Template, PromptRecord, PromptRecordChain, ContentPart } from '@prompt-optimizer/core'
import { useToast } from '../composables/useToast'
import ContentCardUI from './ContentCard.vue'
import ModelSelectUI from './ModelSelect.vue'
import OutputDisplay from './OutputDisplay.vue'
import TestPanelPromptSelect from './TestPanelPromptSelect.vue'
import { v4 as uuidv4 } from 'uuid'

interface AddedItem {
  id: string
  type: 'template' | 'history'
  name: string
  data: Template | PromptRecord
}

const toast = useToast()

const props = defineProps({
  promptService: {
    type: [Object, null] as PropType<any>,
    required: true,
  },
  optimizedPrompt: {
    type: String,
    default: '',
  },
  originalPrompt: {
    type: String,
    default: '',
  },
  modelValue: {
    type: String,
    default: '',
  },
  services: {
    type: [Object, null] as PropType<any>,
    required: true,
  },
  history: {
    type: Array as PropType<PromptRecordChain[]>,
    default: () => [],
  },
})

const emit = defineEmits(['showConfig', 'update:modelValue'])
const testModelSelect = ref(null)
const selectedTestModel = ref(props.modelValue || '')

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && newVal !== selectedTestModel.value) {
      selectedTestModel.value = newVal
    }
  },
)

const updateSelectedModel = (value: string) => {
  selectedTestModel.value = value
  emit('update:modelValue', value)
}

const optimizedTestResult = ref('')
const optimizedTestError = ref('')
const isTestingOptimized = ref(false)

// 添加推理内容状态
const optimizedTestReasoning = ref('')

// Add Action 状态管理
const showAddAction = ref(false)
const addedItems = ref<AddedItem[]>([])
const addActionDropdown = ref<HTMLElement | null>(null)

// 选择器组件引用
const promptSelectRef = ref<InstanceType<typeof TestPanelPromptSelect> | null>(null)

const isTesting = computed(() => isTestingOptimized.value)

// 排序后的添加项列表，template 类型永远排在最前面
const sortedAddedItems = computed(() => {
  return [...addedItems.value].sort((a, b) => {
    // template 类型排在前面
    if (a.type === 'template' && b.type !== 'template') return -1
    if (a.type !== 'template' && b.type === 'template') return 1
    // 同类型保持原有顺序
    return 0
  })
})

const ensureString = (value: any): string => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

// 文本截断（默认限制 200 字符）
const truncateText = (text: string, maxLength = 200) => {
  if (!text) return ''
  const str = String(text)
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

// 从已添加的记录中收集图片（base64）为多模态片段
const collectImagePartsFromAddedItems = (): ContentPart[] => {
  const parts: ContentPart[] = []
  addedItems.value
    .filter((item) => item.type === 'history')
    .forEach((item) => {
      const record = item.data as PromptRecord
      if (record.contentType === 'prompt_image' && record.contents) {
        parts.push({ type: 'image_base64', mimeType: 'image/jpeg', data: record.contents })
      }
    })
  return parts
}

// 构建系统提示词
const buildSystemPrompt = (): string => {
  const systemPrompts: string[] = []

  // 添加选中的模板内容
  addedItems.value
    .filter((item) => item.type === 'template')
    .forEach((item) => {
      const template = item.data as Template
      if (template.content) {
        if (typeof template.content === 'string') {
          systemPrompts.push(template.content)
        } else if (Array.isArray(template.content)) {
          // 如果是消息数组，提取system角色的内容
          const systemMessages = template.content.filter((msg) => msg.role === 'system')
          systemMessages.forEach((msg) => systemPrompts.push(msg.content))
        }
      }
    })

  // 添加选中的历史记录中的系统提示词（如果有的话）
  // 按内容类型排序（plaintext -> url -> image），并加前缀
  const typeOrder: Record<string, number> = {
    prompt_plaintext: 0,
    prompt_url: 1,
    prompt_figma: 2,
    prompt_file: 3,
    prompt_image: 4,
  }

  const historyItems = addedItems.value
    .filter((item) => item.type === 'history')
    .sort((a, b) => {
      const ra = a.data as PromptRecord
      const rb = b.data as PromptRecord
      const oa = typeOrder[ra.contentType] ?? 99
      const ob = typeOrder[rb.contentType] ?? 99
      return oa - ob
    })

  historyItems.forEach((item) => {
    const record = item.data as PromptRecord
    if (!record.optimizedPrompt) return

    let prefix = ''
    if (record.contentType === 'prompt_image') {
      prefix = 'UI 设计图文字版本：'
    } else if (
      record.contentType === 'prompt_plaintext' ||
      record.contentType === 'prompt_url' ||
      record.contentType === 'prompt_figma' ||
      record.contentType === 'prompt_file'
    ) {
      prefix = 'PRD 内容：'
    }

    systemPrompts.push(`${prefix}\n${record.optimizedPrompt}`)
  })

  // 用 [Part n] 标注每一段，便于区分
  return systemPrompts.map((content, idx) => `<Part ${idx + 1}>\n${content}\n</Part ${idx + 1}>`).join('\n\n---\n\n')
}

const testOptimizedPrompt = async () => {
  // 当没有 optimizedPrompt 时，回退到原始提示词 originalPrompt
  const fallbackUserPrompt = ensureString(props.optimizedPrompt || props.originalPrompt)
  if (!fallbackUserPrompt) return

  isTestingOptimized.value = true
  optimizedTestResult.value = ''
  optimizedTestError.value = ''
  optimizedTestReasoning.value = ''

  await nextTick() // 确保状态更新和DOM清空完成

  const streamHandler = {
    onToken: (token: string) => {
      optimizedTestResult.value += token
    },
    onReasoningToken: (reasoningToken: string) => {
      optimizedTestReasoning.value += reasoningToken
    },
    onComplete: () => {
      /* 流结束后不再需要设置 isTesting, 由 finally 处理 */
    },
    onError: (err: any) => {
      /* try catch 会处理 */
    },
  }

  // 合并系统提示词
  let systemPrompt = buildSystemPrompt()
  let userPrompt = fallbackUserPrompt

  const imageParts = collectImagePartsFromAddedItems()
  const userParts: ContentPart[] = [{ type: 'text', text: userPrompt }, ...imageParts]

  try {
    // 最多尝试 2 次：
    // - 第 1 次：携带 userParts（多模态）
    // - 第 2 次：不携带 userParts（降级重试）
    let lastError: unknown = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt === 1) {
          // 降级提示，并清空之前的输出
          toast.warning('模型可能不支持多模态，自动降级重试一次')
          optimizedTestResult.value = ''
          optimizedTestReasoning.value = ''
        }

        const options = attempt === 0 ? { userParts } : undefined
        await props.promptService.testPromptStream(systemPrompt, userPrompt, selectedTestModel.value, streamHandler, options as any)
        lastError = null
        break
      } catch (err: unknown) {
        lastError = err
        console.warn(`[TestPanel] Attempt ${attempt + 1} failed`, err)
      }
    }

    if (lastError) {
      const errorMessage = (lastError as any)?.message || '生成失败'
      optimizedTestError.value = errorMessage
      toast.error(errorMessage)
      optimizedTestResult.value = ''
    }
  } finally {
    // 确保无论成功或失败，加载状态最终都会被关闭
    isTestingOptimized.value = false
  }
}

const handleTest = async () => {
  if (!selectedTestModel.value) {
    toast.error('请先选择生成模型')
    return
  }

  // Only test optimized prompt
  await testOptimizedPrompt()
}

// Add Action 相关方法
const toggleAddAction = () => {
  showAddAction.value = !showAddAction.value
}

const handleAddTemplate = () => {
  showAddAction.value = false
  promptSelectRef.value?.showTemplateSelection()
}

const handleAddHistory = () => {
  showAddAction.value = false
  promptSelectRef.value?.showHistorySelection()
}

const removeItem = (itemId: string) => {
  const index = addedItems.value.findIndex((item) => item.id === itemId)
  if (index > -1) {
    addedItems.value.splice(index, 1)
    toast.success('项目已移除')
  }
}

// 添加模板项
const addTemplateItem = (template: Template) => {
  const existingIndex = addedItems.value.findIndex((item) => item.type === 'template' && (item.data as Template).id === template.id)

  if (existingIndex === -1) {
    addedItems.value.push({
      id: uuidv4(),
      type: 'template',
      name: template.name,
      data: template,
    })
    // toast.success(`已添加模板: ${truncateText(template.name, 30)}`)
  } else {
    toast.warning('该模板已经添加过了')
  }
}

// 添加历史记录项
const addHistoryItem = (record: PromptRecord) => {
  const existingIndex = addedItems.value.findIndex((item) => item.type === 'history' && (item.data as PromptRecord).id === record.id)

  if (existingIndex === -1) {
    addedItems.value.push({
      id: uuidv4(),
      type: 'history',
      name: record.contentMark || record.originalPrompt,
      data: record,
    })
    const displayName = record.contentMark || (record.originalPrompt ? record.originalPrompt.replace(/\s+/g, ' ') : '')
    // toast.success(`已添加上下文: ${truncateText(displayName, 30)}`)
  } else {
    toast.warning('该上下文已经添加过了')
  }
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  if (addActionDropdown.value && !addActionDropdown.value.contains(event.target as Node)) {
    showAddAction.value = false
  }
}

onMounted(() => {
  if (props.modelValue) {
    selectedTestModel.value = props.modelValue
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 处理模板选择结果
const handleTemplateSelected = (selectedTemplates: Template[]) => {
  selectedTemplates.forEach((template) => {
    addTemplateItem(template)
  })
}

// 处理历史记录选择结果
const handleHistorySelected = (selectedRecords: PromptRecord[]) => {
  selectedRecords.forEach((record) => {
    addHistoryItem(record)
  })
}
</script>

<style scoped>
.theme-checkbox {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

/* 自定义滚动条样式 */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 暗色模式下的滚动条 */
:root.dark .custom-scrollbar {
  scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
}

:root.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}

:root.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.7);
}

/* 小屏幕下允许容器自由扩展 */
@media (max-width: 767px) {
  .min-h-\[80px\] {
    min-height: 120px !important; /* 增加小屏幕下的最小高度 */
  }

  /* 确保OutputPanel可以正确扩展 */
  .flex-1 {
    flex: 1 0 auto;
  }
}
</style>
