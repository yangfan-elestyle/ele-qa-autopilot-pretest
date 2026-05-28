<!-- 提示词类型选择器组件 - 仅用于 system mode -->
<template>
  <div class="space-y-3">
    <!-- 多媒体内容选择 -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:space-x-2">
      <!-- 类型选择按钮 -->
      <div class="flex flex-wrap gap-1">
        <button
          @click="selectType('prompt_plaintext')"
          :class="[
            'px-2 py-1.5 text-xs rounded border transition-colors duration-150',
            'focus:outline-none focus:ring-1 focus:ring-blue-400',
            contextConfig.contentType === 'prompt_plaintext' ? 'theme-button-primary' : 'theme-button-secondary',
            'flex items-center space-x-1',
          ]"
          title="文本"
        >
          <span>文本</span>
        </button>

        <button
          @click="handleConfluenceTypeSelect"
          :class="[
            'px-2 py-1.5 text-xs rounded border transition-colors duration-150',
            'focus:outline-none focus:ring-1 focus:ring-blue-400',
            contextConfig.contentType === 'prompt_url' ? 'theme-button-primary' : 'theme-button-secondary',
            'flex items-center space-x-1',
          ]"
          title="Confluence 链接"
        >
          <span>Confluence 链接</span>
        </button>

        <button
          @click="handleFigmaTypeSelect"
          :class="[
            'px-2 py-1.5 text-xs rounded border transition-colors duration-150',
            'focus:outline-none focus:ring-1 focus:ring-blue-400',
            contextConfig.contentType === 'prompt_figma' ? 'theme-button-primary' : 'theme-button-secondary',
            'flex items-center space-x-1',
          ]"
          title="Figma 链接"
        >
          <span>Figma 链接</span>
        </button>

        <button
          @click="handleImageTypeSelect"
          :class="[
            'px-2 py-1.5 text-xs rounded border transition-colors duration-150',
            'focus:outline-none focus:ring-1 focus:ring-blue-400',
            contextConfig.contentType === 'prompt_image' ? 'theme-button-primary' : 'theme-button-secondary',
            'flex items-center space-x-1',
          ]"
          title="图片"
        >
          <span>图片</span>
        </button>

        <button
          @click="handleFileTypeSelect"
          :class="[
            'px-2 py-1.5 text-xs rounded border transition-colors duration-150',
            'focus:outline-none focus:ring-1 focus:ring-blue-400',
            contextConfig.contentType === 'prompt_file' ? 'theme-button-primary' : 'theme-button-secondary',
            'flex items-center space-x-1',
          ]"
          title="本地文件"
        >
          <span>本地文件</span>
        </button>
      </div>

      <!-- 内容输入区域 -->
      <div class="w-full min-w-0 flex-1 sm:min-w-[200px]">
        <!-- Confluence URL 类型: 状态条 -->
        <template v-if="contextConfig.contentType === 'prompt_url'">
          <div class="flex items-center gap-2 min-h-[28px]">
            <template v-if="contextConfig.contents">
              <span
                class="flex-1 min-w-0 truncate px-2 py-1 text-xs rounded theme-text-secondary"
                style="background: var(--theme-bg-secondary, rgba(0,0,0,0.04))"
                :title="contextConfig.contents"
              >
                {{ contextConfig.contents }}
              </span>
              <button
                type="button"
                class="px-2 py-1 text-xs theme-button-secondary flex-shrink-0"
                :disabled="isLoading"
                @click="openUrlModal('confluence')"
              >更改</button>
            </template>
            <template v-else>
              <button
                type="button"
                class="px-2 py-1 text-xs theme-button-primary"
                :disabled="isLoading"
                @click="openUrlModal('confluence')"
              >输入 Confluence 链接</button>
            </template>
          </div>
        </template>

        <!-- Figma URL 类型: 状态条 -->
        <template v-else-if="contextConfig.contentType === 'prompt_figma'">
          <div class="flex items-center gap-2 min-h-[28px]">
            <template v-if="contextConfig.contents">
              <span
                class="flex-1 min-w-0 truncate px-2 py-1 text-xs rounded theme-text-secondary"
                style="background: var(--theme-bg-secondary, rgba(0,0,0,0.04))"
                :title="contextConfig.contents"
              >
                {{ contextConfig.contents }}
              </span>
              <button
                type="button"
                class="px-2 py-1 text-xs theme-button-secondary flex-shrink-0"
                :disabled="isLoading"
                @click="openUrlModal('figma')"
              >更改</button>
            </template>
            <template v-else>
              <button
                type="button"
                class="px-2 py-1 text-xs theme-button-primary"
                :disabled="isLoading"
                @click="openUrlModal('figma')"
              >输入 Figma 链接</button>
            </template>
          </div>
        </template>

        <!-- 图片类型：显示文件选择 -->
        <template v-else-if="contextConfig.contentType === 'prompt_image'">
          <div>
            <div class="flex items-center space-x-2">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleImageSelect"
                class="flex-1 px-2 py-0 text-sm theme-input"
                :disabled="isLoading"
              />
              <div v-if="contextConfig.contents" class="flex-shrink-0">
                <img
                  :src="`data:image/jpeg;base64,${contextConfig.contents}`"
                  alt="Preview"
                  class="h-8 w-8 object-contain border rounded cursor-pointer"
                  @click="showImagePreview = true"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- 本地文件类型 -->
        <template v-else-if="contextConfig.contentType === 'prompt_file'">
          <div class="flex items-center space-x-2">
            <input ref="genericFileInput" type="file" class="hidden" @change="handleFileSelect" :accept="allowedFileAccept" />
            <button type="button" class="px-2 py-1 text-xs theme-button-secondary" @click="triggerFilePicker" :disabled="isLoading">
              选择文件
            </button>
            <span v-if="contextConfig.contents" class="text-xs theme-text-secondary truncate" :title="contextConfig.contents">
              {{ contextConfig.contents }}
            </span>
          </div>
        </template>
      </div>
    </div>

    <!-- Confluence / Figma URL 输入弹窗 -->
    <Teleport to="body">
      <div
        v-if="showUrlModal"
        class="fixed inset-0 theme-mask z-50 flex items-center justify-center p-4"
        @click="onUrlModalMaskClick"
      >
        <div
          class="theme-manager-container w-full mx-auto flex flex-col overflow-hidden"
          style="max-width: 480px"
          @click.stop
        >
          <header class="ds-modal-head">
            <div class="ds-modal-head-left">
              <h3 class="ds-modal-title">{{ urlModalTitle }}</h3>
            </div>
            <div class="ds-modal-head-right">
              <button
                class="ds-icon-btn-sm"
                type="button"
                :disabled="isLoading"
                aria-label="关闭"
                @click="cancelUrlModal"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div class="ds-modal-body" style="padding: 16px">
            <input
              ref="urlModalInputRef"
              v-model="urlModalValue"
              @keydown.enter.prevent="submitUrlModal"
              @keydown.esc.prevent="cancelUrlModal"
              type="url"
              :placeholder="urlModalPlaceholder"
              class="w-full px-3 py-2 text-sm theme-input"
              :disabled="isLoading"
            />

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px">
              <button
                class="ds-ms-btn"
                type="button"
                :disabled="isLoading"
                @click="cancelUrlModal"
              >取消</button>
              <button
                class="ds-ms-btn ds-ms-btn--primary"
                type="button"
                :disabled="isLoading || !urlModalValue.trim()"
                @click="submitUrlModal"
              >解析</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 图片预览弹窗 -->
    <div
      v-if="showImagePreview && contextConfig.contents"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
      @click="showImagePreview = false"
    >
      <div class="relative max-w-4xl max-h-4xl p-4">
        <img :src="`data:image/jpeg;base64,${contextConfig.contents}`" alt="Preview" class="max-w-full max-h-full object-contain" />
        <button
          @click="showImagePreview = false"
          class="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75"
        >
          ×
        </button>
      </div>
    </div>

    <!-- 全屏加载弹窗 -->
    <div v-if="isLoading" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, type PropType } from 'vue'
import { type ContentType, getApiBasePath, getAuthHeaders } from '@prompt-optimizer/core'
import { createMcpServiceFor, getMcpTextContents } from '../services/mcp-client'
import type { ContextConfig } from '@/composables'
import { useToast } from '../composables/useToast'
import { IMAGE_RESEARCH_PROMPT } from './imageResearchPrompt'

const toast = useToast()

const props = defineProps({
  contextConfig: {
    type: Object as PropType<ContextConfig>,
    required: true,
  },
  contents: {
    type: String,
    required: true,
  },
  optimizedPrompt: {
    type: String,
    default: '',
  },
})

const emit = defineEmits<{
  'update:contextConfig': [value: ContextConfig]
  'update:contents': [value: string]
}>()

// 本地状态
const fileInput = ref<HTMLInputElement>()
const genericFileInput = ref<HTMLInputElement>()
const showImagePreview = ref(false)
const isLoading = ref(false)
const allowedFileExtensions = ['pdf', 'docx', 'pptx', 'csv', 'doc', 'epub', 'html', 'htm', 'txt', 'text', 'plaintext', 'xlsx']
const allowedFileAccept = allowedFileExtensions.map((ext) => `.${ext}`).join(',')

// URL 输入弹窗状态
const showUrlModal = ref(false)
const urlModalMode = ref<'confluence' | 'figma'>('confluence')
const urlModalValue = ref('')
const urlModalInputRef = ref<HTMLInputElement>()
const urlModalTitle = computed(() => (urlModalMode.value === 'confluence' ? '输入 Confluence 页面链接' : '输入 Figma 文件链接'))
const urlModalPlaceholder = computed(() =>
  urlModalMode.value === 'confluence' ? 'https://...atlassian.net/wiki/...' : 'https://www.figma.com/...'
)

const updatePromptContent = (value: string) => {
  emit('update:contents', value)
}

// ================= URL 相关逻辑 =================

// 创建 MCP 服务实例（用于 text -> markdown 内容）
// serverUrl 必须带 SPA 子路径 (`/autotest`); 缺前缀时 gateway 看不到 `/autotest/*` 路由
// 会把请求分流到 AUTOPILOT Worker, 404 兜底返回 SPA HTML 让 MCP 解析失败.
const markitdownMcpService = createMcpServiceFor({
  serverUrl: `${getApiBasePath()}/mcps/markitdown/mcp`,
  client: { name: 'qa-autotest', version: '1.0' },
})

const getImageResearchPrompt = () => IMAGE_RESEARCH_PROMPT.trim()

// 从 URL 中提取 Confluence pageId：最简策略，直接取最长连续数字
function extractConfluencePageId(url: string): string | null {
  const all = url.match(/\d+/g)
  if (!all) return null
  let best = ''
  for (const s of all) {
    if (s.length > best.length) best = s
  }
  return best || null
}

// Confluence 解析 (modal 提交或外部按需触发都走这里)
const handleUrlEnter = async (urlOverride?: string) => {
  const url = (urlOverride ?? props.contextConfig.contents ?? '').trim()
  if (!url) return

  isLoading.value = true
  let markdown = ''
  try {
    const pageId = extractConfluencePageId(url)
    if (!pageId) {
      toast.error('无法从该 URL 提取 Confluence 页面ID，请检查链接是否正确')
      return
    }

    // 经 gateway 时身份由 CF Access 边缘注入; getAuthHeaders 通常返回空对象, 仍 spread 留口子.
    const response = await fetch(`${getApiBasePath()}/confluence-parse?page_id=${encodeURIComponent(pageId)}`, {
      headers: { ...getAuthHeaders() },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.error || `HTTP ${response.status}`
      console.error('Confluence API error:', errorMsg, errorData.details)
      throw new Error(errorMsg)
    }

    const result = await response.json()

    if (result.success && result.data) {
      const { title, html_content } = result.data
      // 将 HTML 内容和标题组合成 markdown 格式
      markdown = `# ${title || 'Confluence Page'}\n\n${html_content || ''}`

      // 使用 markitdown 服务将 HTML 转换为更好的 markdown 格式
      if (html_content) {
        try {
          const mime = 'text/html;charset=utf-8'
          const uri = `data:${mime},${encodeURIComponent(html_content)}`

          const convertRes = await markitdownMcpService.callTool('convert_to_markdown', { uri })
          if (!convertRes.isError) {
            const [converted] = getMcpTextContents(convertRes)
            if (converted && converted.trim()) {
              markdown = `# ${title || 'Confluence Page'}\n\n${converted}`
            }
          }
        } catch (e) {
          console.warn('convert_to_markdown 调用失败，使用原始内容：', e)
          // 如果转换失败，保持原有的 markdown 内容
          toast.error('markdown 转换服务异常，使用原始内容')
        }
      }

      // 调用 markdown-research，对 markdown 中的图片等进行识别与替换
      try {
        const resp = await fetch(`${getApiBasePath()}/markdown-research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ markdown, isConfluence: true }),
        })
        const data = await resp.json().catch(() => ({}))
        if (!resp.ok) {
          const msg = (data && (data.error || data.message)) || `HTTP ${resp.status}`
          console.warn('markdown-research error:', msg)
        } else if (typeof data?.text === 'string' && data.text.trim()) {
          markdown = data.text
        }
      } catch (e) {
        console.warn('markdown-research 调用失败，跳过增强处理：', e)
      }
    } else {
      throw new Error(result.error || 'Failed to fetch Confluence page')
    }
  } catch (error: any) {
    console.error('Confluence processing error:', error)
    markdown = `Error fetching Confluence page: ${error?.message || error}`
    toast.error('MCP 返回内容为空或无法解析')
  } finally {
    updatePromptContent(markdown)
    isLoading.value = false
  }
}

const handleFigmaEnter = async (urlOverride?: string) => {
  const url = (urlOverride ?? props.contextConfig.contents ?? '').trim()
  if (!url) return

  isLoading.value = true

  try {
    const promptParam = getImageResearchPrompt()
    // Token 由 Worker 按 ownerId 从 D1 (集成中心 → Figma) 读, 前端不再透传明文.
    // Worker 未配置时返 412 + 引导文案, 由下方错误分支 toast 给用户.
    const payload: Record<string, unknown> = { url }
    if (promptParam) {
      payload.prompt = promptParam
    }

    const response = await fetch(`${getApiBasePath()}/figma-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = (data && data.error) || `HTTP ${response.status}`
      throw new Error(String(message))
    }

    let textOutput = ''
    const analyses = Array.isArray(data?.analyses) ? data.analyses : []

    if (analyses.length) {
      const parts: string[] = []
      analyses.forEach((item: any, index: number) => {
        const label = `figma ${index + 1} 图片：`
        const candidate =
          item?.success && typeof item?.data?.text === 'string' ? item.data.text.trim() : typeof item?.error === 'string' ? `解析失败：${item.error}` : ''

        const fallback = !candidate ? (typeof item?.data === 'string' ? item.data : JSON.stringify(item?.data ?? item, null, 2)) : ''

        const body = candidate || fallback || ''
        if (body) {
          parts.push(`${label}\n${body}`)
        }
      })

      if (parts.length) {
        textOutput = parts.join('\n\n')
      }
    }

    if (!textOutput) {
      textOutput = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    }

    updatePromptContent(textOutput)
  } catch (error: any) {
    console.error('Figma processing error:', error)
    toast.error(error?.message || 'Figma parse failed')
  } finally {
    isLoading.value = false
  }
}

const selectType = (type: ContentType) => {
  // 切换类型时清空相关数据
  const newData: ContextConfig = {
    ...props.contextConfig,
    contentType: type,
    contents: '',
  }

  emit('update:contextConfig', newData)
}

// ================= URL Modal 相关逻辑 =================

const openUrlModal = (mode: 'confluence' | 'figma') => {
  urlModalMode.value = mode
  urlModalValue.value = props.contextConfig.contents || ''
  showUrlModal.value = true
  nextTick(() => urlModalInputRef.value?.focus())
}

const handleConfluenceTypeSelect = () => {
  if (props.contextConfig.contentType !== 'prompt_url') {
    selectType('prompt_url')
  }
  openUrlModal('confluence')
}

const handleFigmaTypeSelect = () => {
  if (props.contextConfig.contentType !== 'prompt_figma') {
    selectType('prompt_figma')
  }
  openUrlModal('figma')
}

const cancelUrlModal = () => {
  if (isLoading.value) return
  showUrlModal.value = false
  // 取消时若无已确认的 URL, 自动切回文本类型, 避免遗留空白状态
  if (!props.contextConfig.contents?.trim()) {
    selectType('prompt_plaintext')
  }
}

const onUrlModalMaskClick = () => {
  cancelUrlModal()
}

const submitUrlModal = async () => {
  const trimmed = urlModalValue.value.trim()
  if (!trimmed || isLoading.value) return
  emit('update:contextConfig', { ...props.contextConfig, contents: trimmed })
  showUrlModal.value = false
  if (urlModalMode.value === 'confluence') {
    await handleUrlEnter(trimmed)
  } else {
    await handleFigmaEnter(trimmed)
  }
}

// ================= File 相关逻辑 =================

const triggerFilePicker = async () => {
  await nextTick()
  if (!genericFileInput.value) return
  // 允许选择同名文件时触发 change
  genericFileInput.value.value = ''
  genericFileInput.value.click()
}

const handleFileTypeSelect = async () => {
  selectType('prompt_file')
  await triggerFilePicker()
}

const triggerImagePicker = async () => {
  await nextTick()
  if (!fileInput.value) return
  fileInput.value.value = ''
  fileInput.value.click()
}

const handleImageTypeSelect = async () => {
  selectType('prompt_image')
  await triggerImagePicker()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!isAllowedFileType(file)) {
    toast.error('请选择支持的文件类型（PDF, DOCX, PPTX, CSV, DOC, EPUB, HTML, TXT, XLSX）')
    if (target) target.value = ''
    return
  }

  emit('update:contextConfig', {
    ...props.contextConfig,
    contentType: 'prompt_file',
    contents: file.name,
  })

  isLoading.value = true

  let base64: string
  try {
    base64 = await fileToBase64(file)
  } catch (error) {
    console.error('File read error:', error)
    toast.error('读取文件失败，请重试')
    isLoading.value = false
    if (target) target.value = ''
    return
  }

  try {
    const mime = file.type || 'application/octet-stream'
    const uri = `data:${mime};base64,${base64}`
    const convertRes = await markitdownMcpService.callTool('convert_to_markdown', {
      uri,
      file_name: file.name,
    })

    if (convertRes.isError) {
      console.error('MCP returned error for file conversion:', convertRes)
      toast.error('MCP 返回内容为空或无法解析')
      return
    }

    const [markdown] = getMcpTextContents(convertRes)
    const normalized = (markdown || '').trim()
    if (!normalized) {
      toast.error('MCP 返回内容为空或无法解析')
      return
    }

    updatePromptContent(normalized)
  } catch (error) {
    console.error('File processing error:', error)
    toast.error('文件处理失败，请重试')
  } finally {
    isLoading.value = false
    if (target) {
      target.value = ''
    }
  }
}

// ================= Image 相关逻辑 =================

const handleImageSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      target.value = ''
      return
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片文件大小不能超过5MB')
      target.value = ''
      return
    }

    isLoading.value = true

    try {
      // 转换为 base64（无 data: 前缀）并保存到上下文用于预览
      const base64 = await fileToBase64(file)
      if (props.contextConfig.contentType === 'prompt_image') {
        emit('update:contextConfig', { ...props.contextConfig, contents: base64 })
      }

      // 调用图片识别服务（通过 Vite 代理或生产环境代理）
      const prompt = getImageResearchPrompt() || 'Describe this image in detail.'
      const payload = {
        prompt,
        imageBase64: base64,
        mime: file.type || 'image/png',
      }

      const resp = await fetch(`${getApiBasePath()}/image-research/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const msg = (data && (data.error || data.message)) || `HTTP ${resp.status}`
        throw new Error(String(msg))
      }
      const text = typeof data?.text === 'string' ? data.text : ''
      updatePromptContent(text)
    } catch (error) {
      console.error('Image analyze error:', error)
      toast.error('图片处理失败，请重试')
    } finally {
      isLoading.value = false
      target.value = ''
    }
  }
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const isAllowedFileType = (file: File): boolean => {
  const name = file.name.toLowerCase()
  return allowedFileExtensions.some((ext) => name.endsWith(`.${ext}`))
}
</script>

<style scoped>
/* 弹窗动画 */
.fixed {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 禁用状态样式 */
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--theme-bg-secondary, #f5f5f5);
  color: var(--theme-text-disabled, #9ca3af);
}

input[type='file']:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
