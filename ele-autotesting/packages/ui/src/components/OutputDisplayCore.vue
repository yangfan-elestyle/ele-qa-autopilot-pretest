<template>
  <div class="output-display-core theme-card flex flex-col h-full relative !p-0" :class="displayClasses">
    <!-- 统一顶层工具栏 -->
    <div
      v-if="hasToolbar"
      data-testid="output-display-toolbar"
      class="ds-output-toolbar"
    >
      <!-- 左侧：视图控制按钮组 (segmented) -->
      <div class="ds-segmented" role="tablist" aria-label="显示模式">
        <button
          type="button"
          role="tab"
          :aria-selected="internalViewMode === 'render'"
          @click="internalViewMode = 'render'"
          class="ds-segmented-btn"
          :class="{ 'ds-segmented-btn--active': internalViewMode === 'render' }"
        >
          渲染
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="internalViewMode === 'source'"
          @click="internalViewMode = 'source'"
          class="ds-segmented-btn"
          :class="{ 'ds-segmented-btn--active': internalViewMode === 'source' }"
        >
          原文
        </button>
        <button
          v-if="isActionEnabled('diff') && originalContent"
          type="button"
          role="tab"
          :aria-selected="internalViewMode === 'diff'"
          @click="internalViewMode = 'diff'"
          :title="!originalContent ? '没有原始内容可供对比' : '与上一版对比'"
          class="ds-segmented-btn"
          :class="{ 'ds-segmented-btn--active': internalViewMode === 'diff' }"
        >
          对比
        </button>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="flex items-center gap-1">
        <!-- 父组件可注入自定义 icon 按钮 (如同步到云 / 发送到联动), 渲染在内置按钮之前. -->
        <slot name="extra-actions" />
        <button v-if="isActionEnabled('excel')" @click="handleExcel" class="ds-icon-btn-sm" title="导出 Excel" aria-label="导出 Excel">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <button v-if="isActionEnabled('copy')" @click="handleCopy('content')" class="ds-icon-btn-sm" title="复制内容" aria-label="复制内容">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.13.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5h-1.5a1.5 1.5 0 00-1.5 1.5v11.25c0 .828.672 1.5 1.5 1.5h10.5a1.5 1.5 0 001.5-1.5V9a1.5 1.5 0 00-1.5-1.5h-1.5"
            />
          </svg>
        </button>
        <button v-if="isActionEnabled('fullscreen')" @click="handleFullscreen" class="ds-icon-btn-sm" title="全屏查看" aria-label="全屏查看">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 推理内容区域 -->
    <div v-if="shouldShowReasoning" class="ds-reasoning">
      <!-- 推理面板标题栏 -->
      <button
        type="button"
        class="ds-reasoning-header"
        :class="{ 'is-open': isReasoningExpanded }"
        :aria-expanded="isReasoningExpanded"
        @click="toggleReasoning"
      >
        <span class="ds-reasoning-title">
          <svg class="ds-reasoning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          思考过程
        </span>
        <span class="ds-reasoning-meta">
          <span v-if="isReasoningStreaming" class="ds-reasoning-streaming">
            <span class="ds-reasoning-streaming-dot" aria-hidden="true"></span>
            生成中
          </span>
          <svg
            class="ds-reasoning-chevron"
            :class="{ 'is-open': isReasoningExpanded }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </span>
      </button>

      <!-- 推理内容区 -->
      <div v-if="isReasoningExpanded" class="output-display__reasoning" :class="{ streaming: streaming }">
        <div class="reasoning-content" ref="reasoningContentRef">
          <MarkdownRenderer
            v-if="displayReasoning"
            :content="displayReasoning"
            :streaming="streaming"
            class="theme-markdown-content prose-sm max-w-none px-3 py-2"
          />
          <div v-else-if="streaming" class="ds-reasoning-pending">
            思考中…
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="output-display__content flex flex-col" :style="{ height: computedHeight }">
      <!-- 对比模式 -->
      <TextDiffUI
        v-if="internalViewMode === 'diff' && content && originalContent"
        :originalText="originalContent"
        :optimizedText="content"
        :compareResult="compareResult"
        :isEnabled="true"
        :showHeader="false"
        displayMode="optimized"
        class="w-full flex-1 min-h-0"
      />

      <!-- 原文模式 -->
      <div v-else-if="internalViewMode === 'source'" class="h-full">
        <textarea
          ref="sourceTextareaRef"
          :value="content"
          @input="handleSourceInput"
          @scroll="handleUserScroll"
          :readonly="mode !== 'editable' || streaming"
          class="w-full h-full theme-input resize-none px-3 py-2 !border-none !shadow-none"
          :placeholder="placeholder"
        ></textarea>
      </div>

      <!-- 渲染模式（默认） -->
      <div
        v-else
        class="h-full overflow-auto"
        :class="isEmpty ? 'theme-input !border-none !shadow-none !p-0' : 'theme-content-container !border-none !shadow-none'"
      >
        <MarkdownRenderer v-if="displayContent" :content="displayContent" :streaming="streaming" class="px-3 py-2" />
        <div v-else-if="loading || streaming" class="ds-output-placeholder is-loading">
          <span class="ds-output-placeholder-dot" aria-hidden="true"></span>
          {{ placeholder || '加载中…' }}
        </div>
        <div v-else class="ds-output-placeholder">
          {{ placeholder || '暂无内容' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useToast } from '../composables/useToast'
import MarkdownRenderer from './MarkdownRenderer.vue'
import TextDiffUI from './TextDiff.vue'
import type { CompareResult, ICompareService } from '@prompt-optimizer/core'
import writeXlsxFile from 'write-excel-file'
import { parseTestCases, type ParsedTestCase } from '../utils/parseTestCases'

type ActionName = 'fullscreen' | 'diff' | 'copy' | 'edit' | 'reasoning' | 'excel'

const { copyText } = useClipboard()
const toast = useToast()

// 组件 Props
interface Props {
  // 内容相关
  content?: string
  originalContent?: string
  reasoning?: string

  // 显示模式
  mode: 'readonly' | 'editable'
  reasoningMode?: 'show' | 'hide' | 'auto'

  // 功能开关
  enabledActions?: ActionName[]

  // 样式配置
  height?: string | number
  placeholder?: string

  // 状态
  loading?: boolean
  streaming?: boolean

  // 服务
  compareService: ICompareService
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  originalContent: '',
  reasoning: '',
  mode: 'readonly',
  reasoningMode: 'auto',
  enabledActions: () => ['fullscreen', 'diff', 'copy', 'edit', 'reasoning', 'excel'],
  height: '100%',
  placeholder: '',
})

// 事件定义
const emit = defineEmits<{
  'update:content': [content: string]
  'update:reasoning': [reasoning: string]
  copy: [content: string, type: 'content' | 'reasoning' | 'all']
  fullscreen: []
  'edit-start': []
  'edit-end': []
  'reasoning-toggle': [expanded: boolean]
  'view-change': [mode: 'base' | 'diff']
}>()

// 内部状态
const isReasoningExpanded = ref(false)
const reasoningContentRef = ref<HTMLDivElement | null>(null)
const userHasManuallyToggledReasoning = ref(false)

const sourceTextareaRef = ref<HTMLTextAreaElement | null>(null)

// 新的视图状态机
const internalViewMode = ref<'render' | 'source' | 'diff'>('render')
const compareResult = ref<CompareResult | undefined>()

const isActionEnabled = (action: ActionName) => props.enabledActions.includes(action)

const hasToolbar = computed(() => ['diff', 'copy', 'fullscreen', 'edit', 'excel'].some((action) => isActionEnabled(action as ActionName)))

// 计算属性
const displayContent = computed(() => (props.content || '').trim())
const displayReasoning = computed(() => (props.reasoning || '').trim())

const hasContent = computed(() => !!displayContent.value)
const hasReasoning = computed(() => !!displayReasoning.value)

const isReasoningStreaming = computed(() => {
  // isReasoningStreaming 应该精确地表示"思考过程正在流式输出，而主内容尚未开始"
  return props.streaming && hasReasoning.value && !hasContent.value
})

const shouldShowReasoning = computed(() => {
  if (!isActionEnabled('reasoning')) return false
  if (props.reasoningMode === 'hide') return false
  if (props.reasoningMode === 'show') return true
  // 只有在有实际的思考内容时，才应该显示整个区域
  return hasReasoning.value
})

const isEmpty = computed(() => !hasContent.value && !props.loading && !props.streaming)

const displayClasses = computed(() => ({
  'output-display-core--loading': props.loading,
  'output-display-core--streaming': props.streaming,
}))

const computedHeight = computed(() => {
  if (typeof props.height === 'number') {
    return `${props.height}px`
  }
  return props.height
})

// 处理原文模式输入
const handleSourceInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:content', target.value)
}

// 下载 excel 功能 — 解析逻辑见 utils/parseTestCases.ts (与联动面板共享).
type TestCaseRecord = ParsedTestCase

const parseAll = (raw: string): TestCaseRecord[] => parseTestCases(raw)

const buildSchema = () => {
  return [
    { column: '用例名称', type: String, value: (x: TestCaseRecord) => x.name, width: 45 },
    { column: '前置条件', type: String, value: (x: TestCaseRecord) => x.preconditions, width: 40 },
    { column: '所属模块', type: String, value: (x: TestCaseRecord) => x.module, width: 30 },
    { column: '步骤描述', type: String, value: (x: TestCaseRecord) => x.steps, width: 60, wrap: true },
    { column: '预期结果', type: String, value: (x: TestCaseRecord) => x.expected, width: 60, wrap: true },
    { column: '编辑模式', type: String, value: () => 'STEP', width: 12 },
    { column: '标签', type: String, value: (x: TestCaseRecord) => x.tags, width: 25 },
    { column: '用例等级', type: String, value: (x: TestCaseRecord) => x.level, width: 12 },
  ] as const
}

const downloadMarkdown = (text: string) => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fileName = `content_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds(),
  )}.md`

  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const handleExcel = async () => {
  try {
    const text = displayContent.value
    if (!text) {
      toast.error('暂无内容，无法导出')
      return
    }
    const data = parseAll(text)
    if (!data.length) {
      // 如果无法解析为测试用例数据，直接下载为 Markdown
      downloadMarkdown(text)
      return
    }

    // 校验必填字段是否缺失
    const REQUIRED_FIELDS: (keyof TestCaseRecord)[] = ['name', 'preconditions', 'module', 'steps', 'expected', 'tags', 'level']
    const missingFieldKeys = new Set<keyof TestCaseRecord>()
    for (const r of data) {
      for (const f of REQUIRED_FIELDS) {
        if (!String((r as any)[f] ?? '').trim()) {
          missingFieldKeys.add(f)
        }
      }
    }
    if (missingFieldKeys.size > 0) {
      // 如果缺少必填字段，下载为 Markdown
      downloadMarkdown(text)
      return
    }

    const schema = buildSchema() as any
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const fileName = `测试用例_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(
      now.getSeconds(),
    )}.xlsx`

    await writeXlsxFile(data as any[], {
      schema: schema as any,
      fileName,
    })
  } catch (err) {
    console.error('导出失败:', err)
    // 如果导出 Excel 失败，尝试下载为 Markdown
    try {
      const text = displayContent.value
      if (text) {
        downloadMarkdown(text)
      }
    } catch (mdErr) {
      console.error('导出 Markdown 失败:', mdErr)
      toast.error('导出 Excel 失败')
    }
  }
}

// 复制功能
const handleCopy = (type: 'content' | 'reasoning' | 'all') => {
  let textToCopy = ''
  let emitType: 'content' | 'reasoning' | 'all' = type

  switch (type) {
    case 'content':
      textToCopy = displayContent.value
      break
    case 'reasoning':
      textToCopy = displayReasoning.value
      break
    case 'all':
      textToCopy = [displayReasoning.value && `推理过程：\n${displayReasoning.value}`, `主要内容：\n${displayContent.value}`].filter(Boolean).join('\n\n')
      break
  }

  if (textToCopy) {
    copyText(textToCopy)
    emit('copy', textToCopy, emitType)
  }
}

// 全屏功能
const handleFullscreen = () => {
  emit('fullscreen')
}

// 推理内容
const toggleReasoning = () => {
  isReasoningExpanded.value = !isReasoningExpanded.value
  userHasManuallyToggledReasoning.value = true // 用户手动操作，锁定自动行为
  emit('reasoning-toggle', isReasoningExpanded.value)
}

const scrollReasoningToBottom = () => {
  if (reasoningContentRef.value) {
    nextTick(() => {
      if (reasoningContentRef.value) {
        reasoningContentRef.value.scrollTop = reasoningContentRef.value.scrollHeight
      }
    })
  }
}

// ======= auto scroll start =======

const AUTO_SCROLL_RESUME_DELAY = 3000
const autoScrollEnabled = ref(true)
const isProgrammaticScroll = ref(false)
let autoScrollResumeTimer: number | null = null

const getActiveScrollElement = () => {
  if (internalViewMode.value === 'source') return sourceTextareaRef.value
  return null
}

const clearAutoScrollResumeTimer = () => {
  if (autoScrollResumeTimer !== null) {
    window.clearTimeout(autoScrollResumeTimer)
    autoScrollResumeTimer = null
  }
}

const scheduleAutoScrollResume = () => {
  clearAutoScrollResumeTimer()
  autoScrollResumeTimer = window.setTimeout(() => {
    autoScrollEnabled.value = true
    if (props.streaming) {
      scrollContentToBottom()
    }
  }, AUTO_SCROLL_RESUME_DELAY)
}

const handleUserScroll = () => {
  if (isProgrammaticScroll.value) return
  autoScrollEnabled.value = false
  scheduleAutoScrollResume()
}

const scrollContentToBottom = () => {
  const el = getActiveScrollElement()
  if (!el) return
  isProgrammaticScroll.value = true
  nextTick(() => {
    const activeEl = getActiveScrollElement()
    if (!activeEl) {
      isProgrammaticScroll.value = false
      return
    }
    activeEl.scrollTop = activeEl.scrollHeight
    requestAnimationFrame(() => {
      isProgrammaticScroll.value = false
    })
  })
}

// ======= auto scroll end =======

// 对比功能
const updateCompareResult = async () => {
  if (internalViewMode.value === 'diff' && props.originalContent && props.content) {
    try {
      if (!props.compareService) {
        throw new Error('CompareService is required but not provided')
      }
      compareResult.value = await props.compareService.compareTexts(props.originalContent, props.content)
    } catch (error) {
      console.error('Error calculating diff:', error)
      // 重新抛出错误，让调用者处理
      throw error
    }
  } else {
    compareResult.value = undefined
  }
}

// 智能自动切换逻辑
const previousViewMode = ref<'render' | 'source' | 'diff' | null>(null)

watch(
  () => props.streaming,
  (isStreaming, wasStreaming) => {
    const isNewStream = isStreaming && !wasStreaming
    if (isNewStream) {
      // 新一轮流式开始，重置自动滚动
      autoScrollEnabled.value = true
      clearAutoScrollResumeTimer()
      scrollContentToBottom()
    }
    // --- 用户意图记忆状态机 ---
    if (isNewStream) {
      // 新任务开始，重置用户记忆
      userHasManuallyToggledReasoning.value = false
    } else if (!isStreaming && wasStreaming) {
      // 任务结束，如果用户未干预且思考区域仍然展开，自动折叠
      if (!userHasManuallyToggledReasoning.value && isReasoningExpanded.value) {
        isReasoningExpanded.value = false
      }
    }
    // -------------------------

    if (isStreaming) {
      // 记住当前模式，并强制切换到原文模式
      if (internalViewMode.value !== 'source') {
        previousViewMode.value = internalViewMode.value
        internalViewMode.value = 'source'
      }
    } else {
      // 流式结束后，恢复之前的模式
      if (previousViewMode.value) {
        internalViewMode.value = previousViewMode.value
        previousViewMode.value = null
      }
    }
  },
)

watch(internalViewMode, updateCompareResult, { immediate: true })
watch(internalViewMode, () => {
  if (props.streaming && autoScrollEnabled.value) {
    scrollContentToBottom()
  }
})
watch(
  () => [props.content, props.originalContent],
  () => {
    if (internalViewMode.value === 'diff') {
      updateCompareResult()
    }
  },
)

watch(
  () => props.reasoning,
  (newReasoning, oldReasoning) => {
    // 当推理内容从无到有，且用户未手动干预时，自动展开
    if (newReasoning && !oldReasoning && !userHasManuallyToggledReasoning.value) {
      isReasoningExpanded.value = true
      emit('reasoning-toggle', true)
    }

    // 如果思考过程已展开，滚动到底部
    if (isReasoningExpanded.value) {
      scrollReasoningToBottom()
    }
  },
)

watch(
  () => props.content,
  (newContent, oldContent) => {
    // 当主要内容开始流式输出时，如果用户未干预，自动折叠思考过程
    const mainContentJustStarted = newContent && !oldContent
    if (props.streaming && mainContentJustStarted && !userHasManuallyToggledReasoning.value) {
      isReasoningExpanded.value = false
    }

    if (props.streaming && autoScrollEnabled.value) {
      scrollContentToBottom()
    }
  },
)

// 暴露方法给父组件
const resetReasoningState = (initialState: boolean) => {
  isReasoningExpanded.value = initialState
  userHasManuallyToggledReasoning.value = false // 重置全屏状态时，也应重置用户意图
}

// 强制退出编辑状态 - 重构为强制切换到渲染模式
const forceExitEditing = () => {
  internalViewMode.value = 'render'
}

// 保持向后兼容的方法
const forceRefreshContent = () => {
  // V2版本中这个方法不再需要，但保留以确保向后兼容
}

const themeToolbarBg = 'theme-toolbar-bg'
const themeToolbarBorder = 'theme-toolbar-border'
const themeToolbarButton = 'theme-toolbar-button'
const themeToolbarButtonActive = 'theme-toolbar-button-active'

onBeforeUnmount(() => {
  clearAutoScrollResumeTimer()
})

defineExpose({ resetReasoningState, forceRefreshContent, forceExitEditing })
</script>

<style scoped>
.output-display__reasoning {
  flex: none;
}

.reasoning-content {
  overflow-y: auto;
  max-height: 30vh;
}

.output-display__content {
  flex: 1;
  min-height: 0;
}
</style>
