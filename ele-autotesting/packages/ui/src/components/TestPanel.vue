<template>
  <ContentCardUI>
    <section class="ds-test-section flex flex-col h-full">
      <!-- Test Input Area: panel head -->
      <header class="ds-panel-head flex-none">
        <div class="ds-panel-head-left">
          <h3 class="ds-panel-title">
            <span class="ds-panel-title-dot" aria-hidden="true"></span>
            内容生成
          </h3>
          <span class="ds-panel-subtitle hidden sm:inline">
            将左侧优化结果应用到具体提示, 检查输出
          </span>
        </div>
        <div class="ds-panel-head-right">
          <!-- 模块多选下拉 -->
          <div class="modules-dropdown-wrap" ref="modulesDropdownRef">
            <button
              type="button"
              class="modules-trigger"
              :class="{ 'is-open': showModulesDropdown }"
              :disabled="isTesting"
              @click="toggleModulesDropdown"
            >
              <svg class="modules-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>模块</span>
              <span
                v-if="selectedModuleIds.size > 0"
                class="modules-trigger-badge"
              >{{ selectedModuleIds.size }}</span>
              <svg class="modules-trigger-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

          </div>

          <!-- 下拉面板用 Teleport 投放到 body, 用 fixed 定位, 规避左右 panel 同级 stacking context 的覆盖问题 -->
          <Teleport to="body">
            <div
              v-show="showModulesDropdown"
              ref="modulesPanelRef"
              class="modules-panel modules-panel--floating"
              :style="modulesPanelStyle"
              role="menu"
            >
              <div class="modules-panel-head">
                <span class="modules-panel-head-title">选择模块</span>
                <button
                  type="button"
                  class="modules-panel-icon-btn"
                  :disabled="modulesLoading"
                  :title="modulesLoading ? '刷新中…' : '刷新模块列表'"
                  :aria-label="modulesLoading ? '刷新中' : '刷新模块列表'"
                  @click="loadModules"
                >
                  <svg :class="['modules-refresh-icon', { 'is-spinning': modulesLoading }]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 15 6.7L21 16" />
                    <path d="M21 21v-5h-5" />
                  </svg>
                </button>
              </div>

              <div class="modules-panel-body">
                <div v-if="modulesLoading && modulesList.length === 0" class="modules-panel-empty">
                  加载中…
                </div>
                <div v-else-if="modulesList.length === 0" class="modules-panel-empty">
                  暂无模块, 请到集成中心「模块」Tab 添加
                </div>
                <label
                  v-else
                  v-for="m in modulesList"
                  :key="m.id"
                  class="modules-panel-item"
                  :class="{ 'is-checked': selectedModuleIds.has(m.id) }"
                >
                  <input
                    type="checkbox"
                    class="modules-panel-checkbox"
                    :checked="selectedModuleIds.has(m.id)"
                    @change="toggleModule(m.id)"
                  />
                  <span class="modules-panel-item-text">
                    <span class="modules-panel-item-path">{{ m.path }}</span>
                    <span v-if="m.name" class="modules-panel-item-name">{{ m.name }}</span>
                  </span>
                </label>
              </div>

              <div v-if="modulesList.length > 0" class="modules-panel-foot">
                <button
                  type="button"
                  class="modules-panel-link"
                  :disabled="selectedModuleIds.size === 0"
                  @click="clearSelectedModules"
                >
                  清空选中
                </button>
                <span class="modules-panel-count">
                  已选 {{ selectedModuleIds.size }} / {{ modulesList.length }}
                </span>
              </div>
            </div>
          </Teleport>

          <ModelSelectUI
            ref="testModelSelect"
            :modelValue="selectedTestModel"
            @update:modelValue="updateSelectedModel"
            :disabled="isTesting"
          />
          <button @click="handleTest" :disabled="isTesting || !selectedTestModel" class="h-10 px-4 text-sm font-medium theme-button-primary inline-flex items-center gap-1">
            <span>{{ isTesting ? '生成中...' : '开始生成' }}</span>
            <svg v-if="!isTesting" class="h-3.5 w-3.5 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Test Results Area -->
      <div class="ds-test-body flex-1 min-h-0 md:overflow-hidden overflow-visible">
        <div class="relative h-full flex flex-col md:block">
          <!-- Optimized Prompt Test Result -->
          <div class="flex flex-col min-h-0 transition-all duration-300 min-h-[80px] md:absolute md:inset-0 md:h-full md:w-full md:left-0">
            <!-- Test Result Header with Add Action -->
            <div class="flex flex-col gap-2 mb-3 flex-none sm:flex-row sm:items-center sm:justify-between">
              <h3 class="ds-panel-subtitle-strong">
                <span class="ds-panel-title-dot" aria-hidden="true"></span>
                生成结果
              </h3>

              <!-- Items and Add Action Container -->
              <div class="flex items-center gap-2 flex-1 min-w-0 sm:ml-4">
                <!-- Added Items with Horizontal Scroll (always present for layout) -->
                <div class="flex-1 min-w-0">
                  <div v-if="addedItems.length > 0" class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                    <span
                      v-for="item in sortedAddedItems"
                      :key="item.id"
                      class="ds-source-chip"
                      :class="item.type === 'template' ? 'ds-source-chip--template' : 'ds-source-chip--history'"
                    >
                      <span class="ds-source-chip-type" aria-hidden="true">{{ item.type === 'template' ? '模板' : '上下文' }}</span>
                      <span class="ds-source-chip-name" :title="item.name">{{ truncateText(item.name, 30) }}</span>
                      <button
                        @click="removeItem(item.id)"
                        class="ds-source-chip-close"
                        :title="`移除 ${item.name}`"
                        :aria-label="`移除 ${item.name}`"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </svg>
                      </button>
                    </span>
                  </div>
                </div>

                <!-- Add Action Dropdown -->
                <div class="relative flex-shrink-0" ref="addActionDropdown">
                  <button
                    @click="toggleAddAction"
                    class="ds-add-source-btn"
                    :class="{ 'is-open': showAddAction }"
                    :aria-expanded="showAddAction"
                  >
                    <svg class="ds-add-source-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                    <span>添加数据源</span>
                  </button>

                  <!-- Dropdown Menu -->
                  <div v-show="showAddAction" class="theme-dropdown ds-add-source-menu" role="menu">
                    <button @click="handleAddTemplate" class="ds-add-source-menu-item" role="menuitem">
                      <span class="ds-add-source-menu-marker ds-add-source-menu-marker--template" aria-hidden="true"></span>
                      <span class="ds-add-source-menu-label">添加【内容生成】模板</span>
                    </button>
                    <button @click="handleAddHistory" class="ds-add-source-menu-item" role="menuitem">
                      <span class="ds-add-source-menu-marker ds-add-source-menu-marker--history" aria-hidden="true"></span>
                      <span class="ds-add-source-menu-label">添加【上下文】数据</span>
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
    </section>
  </ContentCardUI>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import type { PropType } from 'vue'
import type { Template, PromptRecord, PromptRecordChain, ContentPart } from '@prompt-optimizer/core'
import { getApiBasePath } from '@prompt-optimizer/core'
import { useToast } from '../composables/useToast'
import ContentCardUI from './ContentCard.vue'
import ModelSelectUI from './ModelSelect.vue'
import OutputDisplay from './OutputDisplay.vue'
import TestPanelPromptSelect from './TestPanelPromptSelect.vue'
import { v4 as uuidv4 } from 'uuid'
import { useGeneratedCases } from '../composables/useGeneratedCases'

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

const emit = defineEmits(['update:modelValue'])
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

// 与联动面板共享最近一次生成结果, 见 useGeneratedCases.
const { setLatestRawText } = useGeneratedCases()
watch(optimizedTestResult, (v) => setLatestRawText(v))

// Add Action 状态管理
const showAddAction = ref(false)
const addedItems = ref<AddedItem[]>([])
const addActionDropdown = ref<HTMLElement | null>(null)

// 模块多选状态
interface ModuleRow {
  id: string
  path: string
  name: string | null
  created_at: number
  updated_at: number
}
const modulesList = ref<ModuleRow[]>([])
const selectedModuleIds = ref<Set<string>>(new Set())
const showModulesDropdown = ref(false)
const modulesLoading = ref(false)
const modulesDropdownRef = ref<HTMLElement | null>(null)
const modulesPanelRef = ref<HTMLElement | null>(null)
const modulesPanelStyle = ref<Record<string, string>>({})
let modulesLoadedOnce = false

const MODULES_PANEL_WIDTH = 320
const MODULES_PANEL_MAX_H = 380
const MODULES_PANEL_OFFSET = 6
const MODULES_PANEL_VIEWPORT_PAD = 8

function updateModulesPanelPosition() {
  const trigger = modulesDropdownRef.value
  if (!trigger) return
  const r = trigger.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  // 默认右对齐到 trigger 右边
  let left = r.right - MODULES_PANEL_WIDTH
  // 防止溢出左边: 至少留 8px 边距
  if (left < MODULES_PANEL_VIEWPORT_PAD) left = MODULES_PANEL_VIEWPORT_PAD
  // 防止溢出右边
  if (left + MODULES_PANEL_WIDTH > vw - MODULES_PANEL_VIEWPORT_PAD) {
    left = vw - MODULES_PANEL_WIDTH - MODULES_PANEL_VIEWPORT_PAD
  }
  let top = r.bottom + MODULES_PANEL_OFFSET
  // 下方空间不足时上翻
  if (top + MODULES_PANEL_MAX_H > vh - MODULES_PANEL_VIEWPORT_PAD) {
    const above = r.top - MODULES_PANEL_OFFSET - MODULES_PANEL_MAX_H
    if (above >= MODULES_PANEL_VIEWPORT_PAD) {
      top = r.top - MODULES_PANEL_OFFSET - MODULES_PANEL_MAX_H
    }
  }
  modulesPanelStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
  }
}

async function loadModules() {
  modulesLoading.value = true
  try {
    const res = await fetch(`${getApiBasePath()}/api/modules`, { credentials: 'include' })
    if (!res.ok) {
      console.warn('[TestPanel] load modules failed', res.status)
      return
    }
    const data = (await res.json()) as { modules?: ModuleRow[] }
    modulesList.value = Array.isArray(data.modules) ? data.modules : []
    // 清理已经被删除的模块的选中状态
    const validIds = new Set(modulesList.value.map((m) => m.id))
    const next = new Set<string>()
    selectedModuleIds.value.forEach((id) => {
      if (validIds.has(id)) next.add(id)
    })
    selectedModuleIds.value = next
    modulesLoadedOnce = true
  } catch (e: any) {
    console.warn('[TestPanel] load modules error', e?.message ?? e)
  } finally {
    modulesLoading.value = false
  }
}

const toggleModulesDropdown = async () => {
  showModulesDropdown.value = !showModulesDropdown.value
  if (showModulesDropdown.value) {
    // 打开时立即按当前 trigger 位置定位 panel; nextTick 确保 v-show 切换后 panel DOM 存在
    await nextTick()
    updateModulesPanelPosition()
    if (!modulesLoadedOnce) loadModules()
  }
}

function handleModulesViewportChange() {
  if (!showModulesDropdown.value) return
  updateModulesPanelPosition()
}

const toggleModule = (id: string) => {
  const next = new Set(selectedModuleIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedModuleIds.value = next
}

const clearSelectedModules = () => {
  selectedModuleIds.value = new Set()
}

const getSelectedModulePaths = (): string[] => {
  const paths: string[] = []
  modulesList.value.forEach((m) => {
    if (selectedModuleIds.value.has(m.id)) paths.push(m.path)
  })
  return paths
}

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

// 选中模块的说明: 拼到 user prompt 末尾, 模拟用户在对话里追加诉求, 而不是混入 system 指令
const buildModuleUserSuffix = (): string => {
  const modulePaths = getSelectedModulePaths()
  if (modulePaths.length === 0) return ''
  const moduleList = modulePaths.map((p) => `- ${p}`).join('\n')
  return `请仅针对以下模块生成测试用例 (使用对应 path 作为「所属模块」字段, 不要为其他模块产出用例):\n${moduleList}`
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

  // 模块说明拼到 user prompt 末尾, 模拟用户提出的额外诉求 (而不是塞进 system 指令)
  const moduleSuffix = buildModuleUserSuffix()
  if (moduleSuffix) {
    userPrompt = userPrompt ? `${userPrompt}\n\n${moduleSuffix}` : moduleSuffix
  }

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
  const target = event.target as Node
  if (addActionDropdown.value && !addActionDropdown.value.contains(target)) {
    showAddAction.value = false
  }
  // modules panel 被 Teleport 到 body, 不在 modulesDropdownRef 子树内, 需独立判定
  const insideTrigger = modulesDropdownRef.value?.contains(target) ?? false
  const insidePanel = modulesPanelRef.value?.contains(target) ?? false
  if (!insideTrigger && !insidePanel) {
    showModulesDropdown.value = false
  }
}

onMounted(() => {
  if (props.modelValue) {
    selectedTestModel.value = props.modelValue
  }
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleModulesViewportChange)
  // 任意祖先 scroll 都可能让 trigger 位置改变, 使用 capture 监听全局 scroll
  window.addEventListener('scroll', handleModulesViewportChange, true)
  // 静默预加载, 失败不影响主流程
  loadModules()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleModulesViewportChange)
  window.removeEventListener('scroll', handleModulesViewportChange, true)
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

/* Test panel section padding */
.ds-test-section {
  min-height: 0;
}
.ds-test-body {
  padding: 14px 16px 16px;
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

/* ============================== 模块多选下拉 ============================== */
.modules-dropdown-wrap {
  position: relative;
}

.modules-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid var(--ds-border-default, #e5e7eb);
  color: var(--ds-text-primary, #1f2937);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.modules-trigger:hover:not(:disabled) {
  border-color: var(--ds-brand-500, #6366f1);
}
.modules-trigger.is-open {
  border-color: var(--ds-brand-500, #6366f1);
  box-shadow: 0 0 0 2px var(--ds-brand-50, #eef2ff);
}
.modules-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.modules-trigger-icon {
  width: 16px;
  height: 16px;
  flex: none;
}
.modules-trigger-caret {
  width: 14px;
  height: 14px;
  opacity: 0.6;
  flex: none;
  transition: transform 0.15s ease;
}
.modules-trigger.is-open .modules-trigger-caret {
  transform: rotate(180deg);
}
.modules-trigger-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  margin-left: 2px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  border-radius: 9999px;
  background: var(--ds-brand-100, #e0e7ff);
  color: var(--ds-brand-700, #4338ca);
}

.modules-panel {
  width: 320px;
  max-width: calc(100vw - 16px);
  max-height: 380px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid var(--ds-border-soft, #e5e7eb);
  border-radius: 10px;
  box-shadow: 0 10px 32px -8px rgba(15, 23, 42, 0.18), 0 4px 12px -2px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}
/* Teleport 到 body 后用 fixed 定位 (inline style 提供 top/left), 提到顶层 stacking 避免被同级 absolute 元素覆盖 */
.modules-panel--floating {
  position: fixed;
  z-index: 9999;
}

.modules-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ds-border-soft, #f1f5f9);
  background: var(--ds-surface-subtle, #f8fafc);
}
.modules-panel-head-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ds-text-primary, #1f2937);
}
.modules-panel-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--ds-text-secondary, #6b7280);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.modules-panel-icon-btn:hover:not(:disabled) {
  background: var(--ds-surface-muted, #f1f5f9);
  color: var(--ds-text-primary, #1f2937);
}
.modules-panel-icon-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.modules-refresh-icon {
  width: 15px;
  height: 15px;
}
.modules-refresh-icon.is-spinning {
  animation: modules-spin 0.9s linear infinite;
}
@keyframes modules-spin {
  to { transform: rotate(360deg); }
}

.modules-panel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 0;
  background: #ffffff;
}
.modules-panel-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--ds-text-tertiary, #9ca3af);
}

.modules-panel-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}
.modules-panel-item:hover {
  background: var(--ds-surface-muted, #f3f4f6);
}
.modules-panel-item.is-checked {
  background: var(--ds-brand-50, #eef2ff);
}
.modules-panel-item.is-checked:hover {
  background: var(--ds-brand-100, #e0e7ff);
}
.modules-panel-checkbox {
  margin-top: 3px;
  width: 16px;
  height: 16px;
  flex: none;
  accent-color: var(--ds-brand-600, #4f46e5);
  cursor: pointer;
}
.modules-panel-item-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.modules-panel-item-path {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  color: var(--ds-text-primary, #1f2937);
  word-break: break-all;
  line-height: 1.4;
}
.modules-panel-item-name {
  display: block;
  font-size: 12px;
  color: var(--ds-text-secondary, #6b7280);
  line-height: 1.3;
}

.modules-panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid var(--ds-border-soft, #f1f5f9);
  background: var(--ds-surface-subtle, #f8fafc);
}
.modules-panel-link {
  font-size: 12px;
  color: var(--ds-brand-600, #4f46e5);
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 0.15s ease;
}
.modules-panel-link:hover:not(:disabled) {
  color: var(--ds-brand-700, #4338ca);
  text-decoration: underline;
}
.modules-panel-link:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.modules-panel-count {
  font-size: 12px;
  color: var(--ds-text-secondary, #6b7280);
}

/* 小屏铺更宽, 不超出视口 */
@media (max-width: 480px) {
  .modules-panel {
    width: calc(100vw - 24px);
    right: -8px;
  }
}
</style>
