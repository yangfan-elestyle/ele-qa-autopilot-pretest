<!-- 提示词类型选择器组件 - 仅用于 system mode -->
<template>
  <div class="space-y-3">
    <!-- 多媒体内容选择 -->
    <div class="flex items-start space-x-2">
      <!-- 类型选择按钮 -->
      <div class="flex space-x-1">
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
          @click="selectType('prompt_url')"
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
          @click="selectType('prompt_figma')"
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
      <div class="flex-1 min-w-[200px]">
        <!-- Confluence URL 类型 -->
        <template v-if="contextConfig.contentType === 'prompt_url'">
          <div class="flex items-center space-x-2">
            <input
              :value="contextConfig.contents || ''"
              @input="updateUrl(($event.target as HTMLInputElement).value)"
              @keydown.enter="handleUrlEnter"
              type="url"
              placeholder="请输入 Confluence 页面链接"
              class="w-full px-2 py-0.5 text-sm theme-input"
              :disabled="isLoading"
            />
          </div>
        </template>

        <!-- Figma URL 类型 -->
        <template v-else-if="contextConfig.contentType === 'prompt_figma'">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-2 sm:gap-0">
            <input
              :value="contextConfig.contents || ''"
              @input="updateUrl(($event.target as HTMLInputElement).value)"
              @keydown.enter="handleFigmaEnter"
              type="url"
              placeholder="请输入 Figma 文件链接"
              class="flex-1 px-2 py-0.5 text-sm theme-input"
              :disabled="isLoading"
            />
            <input
              :value="figmaToken"
              @input="updateFigmaToken(($event.target as HTMLInputElement).value)"
              @keydown.enter="handleFigmaEnter"
              type="password"
              autocomplete="off"
              placeholder="请输入 Figma Token"
              class="w-full sm:w-64 px-2 py-0.5 text-sm theme-input"
              :disabled="isLoading"
            />
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
import { nextTick, onMounted, ref, type PropType, watch } from 'vue'
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
const FIGMA_TOKEN_STORAGE_KEY = 'qa_figma_token'
const figmaToken = ref('')
const allowedFileExtensions = ['pdf', 'docx', 'pptx', 'csv', 'doc', 'epub', 'html', 'htm', 'txt', 'text', 'plaintext', 'xlsx']
const allowedFileAccept = allowedFileExtensions.map((ext) => `.${ext}`).join(',')

const updatePromptContent = (value: string) => {
  emit('update:contents', value)
}

const updateFigmaToken = (value: string) => {
  figmaToken.value = value
}

onMounted(() => {
  if (typeof window === 'undefined') return
  const storedToken = window.localStorage.getItem(FIGMA_TOKEN_STORAGE_KEY)
  if (storedToken) {
    figmaToken.value = storedToken
  }
})

watch(figmaToken, (value) => {
  if (typeof window === 'undefined') return
  if (value.trim()) {
    window.localStorage.setItem(FIGMA_TOKEN_STORAGE_KEY, value)
  } else {
    window.localStorage.removeItem(FIGMA_TOKEN_STORAGE_KEY)
  }
})

// ================= URL 相关逻辑 =================

const updateUrl = (value: string) => {
  emit('update:contextConfig', { ...props.contextConfig, contents: value })
}

// 创建 MCP 服务实例（用于 text -> markdown 内容）
const markitdownMcpService = createMcpServiceFor({
  serverUrl: '/mcps/markitdown/mcp',
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

// URL回车处理（直接调用服务端 confluence-parse API）
const handleUrlEnter = async () => {
  const url = props.contextConfig.contents?.trim()
  if (!url) return

  isLoading.value = true
  let markdown = ''
  try {
    const pageId = extractConfluencePageId(url)
    if (!pageId) {
      toast.error('无法从该 URL 提取 Confluence 页面ID，请检查链接是否正确')
      return
    }

    // 调用服务端的 confluence-parse API; 后端 resolveOwner 中间件强制 X-Device-Id 头
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

const handleFigmaEnter = async () => {
  const url = (props.contextConfig.contents || '').trim()
  if (!url) return

  const token = figmaToken.value.trim()
  if (!token) {
    toast.error('请先填写 Figma Token')
    return
  }

  isLoading.value = true

  try {
    const promptParam = getImageResearchPrompt()
    const payload: Record<string, unknown> = { url, token }
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
