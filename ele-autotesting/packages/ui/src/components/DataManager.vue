<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 theme-mask z-50 flex items-center justify-center p-4" @click="close">
      <div class="theme-manager-container w-full max-w-md mx-auto" @click.stop>
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b theme-manager-border">
          <h2 class="text-xl font-semibold theme-manager-text">
            数据管理
          </h2>
          <button @click="close" class="theme-manager-text-secondary hover:theme-manager-text transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          <!-- 导出功能 -->
          <div class="space-y-3">
            <h3 class="text-lg font-medium theme-manager-text">
              导出数据
            </h3>
            <p class="text-sm theme-manager-text-secondary">
              导出所有上下文、模型配置、自定义提示词和用户设置（包括主题、语言、模型选择等）
            </p>
            <button
              @click="handleExport"
              :disabled="isExporting"
              class="w-full px-4 py-2 theme-manager-button-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="isExporting" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                导出中...
              </span>
              <span v-else> 📥 导出数据 </span>
            </button>
          </div>

          <!-- 导入功能 -->
          <div class="space-y-3">
            <h3 class="text-lg font-medium theme-manager-text">
              导入数据
            </h3>
            <p class="text-sm theme-manager-text-secondary">
              导入之前导出的数据文件（将覆盖现有数据和用户设置）
            </p>

            <!-- 文件选择区域 -->
            <div
              class="border-2 border-dashed theme-manager-border rounded-lg p-6 text-center transition-colors"
              :class="{
                'theme-manager-border-active theme-manager-bg-active': isDragOver,
              }"
              @dragover.prevent="handleDragOver"
              @dragenter.prevent="handleDragEnter"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
            >
              <input ref="fileInput" type="file" accept=".json" @change="handleFileSelect" class="hidden" />

              <div v-if="!selectedFile" @click="fileInput?.click()" class="cursor-pointer">
                <div class="theme-manager-text-secondary mb-2">
                  <svg class="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
                <p class="text-sm theme-manager-text-secondary">
                  点击选择文件或拖拽文件到此处
                </p>
              </div>

              <div v-else class="space-y-2">
                <p class="text-sm font-medium theme-manager-text">
                  {{ selectedFile.name }}
                </p>
                <p class="text-xs theme-manager-text-secondary">
                  {{ formatFileSize(selectedFile.size) }}
                </p>
                <div class="flex gap-2 justify-center">
                  <button @click="fileInput?.click()" class="text-sm theme-manager-button-link">
                    更换文件
                  </button>
                  <button @click="clearSelectedFile" class="text-sm theme-manager-button-danger">
                    清空
                  </button>
                </div>
              </div>
            </div>

            <!-- 导入按钮 -->
            <button
              @click="handleImport"
              :disabled="!selectedFile || isImporting"
              class="w-full px-4 py-2 theme-manager-button-success disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="isImporting" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                导入中...
              </span>
              <span v-else> 📤 导入数据 </span>
            </button>
          </div>

          <!-- 警告信息 -->
          <div class="theme-manager-warning-container rounded-lg p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 theme-manager-warning-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm theme-manager-warning-text">
                  导入数据将覆盖现有的上下文、模型配置、自定义提示词和所有用户设置（包括主题、语言偏好等），请确保已备份重要数据。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, type Ref } from 'vue'
import { useToast } from '../composables/useToast'
import type { IDataManager } from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'

interface Props {
  show: boolean
  // dataManager现在通过inject获取，不再需要props
}

interface Emits {
  (e: 'close'): void
  (e: 'imported'): void
  (e: 'update:show', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const toast = useToast()

// 统一使用inject获取services
const services = inject<Ref<AppServices | null>>('services')
if (!services) {
  throw new Error('[DataManager] services未正确注入，请确保在App组件中正确provide了services')
}

const getDataManager = computed(() => {
  const servicesValue = services.value
  if (!servicesValue) {
    throw new Error('[DataManager] services未初始化，请确保应用已正确启动')
  }

  const manager = servicesValue.dataManager
  if (!manager) {
    throw new Error('[DataManager] dataManager未初始化，请确保服务已正确配置')
  }

  return manager
})

const isExporting = ref(false)
const isImporting = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)

// --- Close Logic ---
const close = () => {
  emit('update:show', false)
  emit('close')
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.show) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// 处理导出
const handleExport = async () => {
  try {
    const dataManager = getDataManager.value
    if (!dataManager) {
      toast.error('数据管理服务不可用')
      return
    }

    isExporting.value = true

    const data = await dataManager.exportAllData()

    // 创建下载链接
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `prompt-optimizer-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('数据导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    toast.error('数据导出失败')
  } finally {
    isExporting.value = false
  }
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

// 清除选中的文件
const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 处理导入
const handleImport = async () => {
  if (!selectedFile.value) return

  try {
    isImporting.value = true

    const content = await selectedFile.value.text()
    const dataManager = getDataManager.value
    if (!dataManager) {
      toast.error('数据管理服务不可用')
      return
    }
    await dataManager.importAllData(content)

    toast.success('数据导入成功')
    emit('imported')
    emit('close')
    clearSelectedFile()
  } catch (error) {
    console.error('导入失败:', error)
    toast.error('数据导入失败' + ': ' + (error as Error).message)
  } finally {
    isImporting.value = false
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 处理拖拽事件
const handleDragOver = () => {
  isDragOver.value = true
}

const handleDragEnter = () => {
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const dataTransfer = event.dataTransfer
  if (dataTransfer) {
    const files = dataTransfer.files
    if (files.length > 0) {
      selectedFile.value = files[0]
    }
  }
  isDragOver.value = false
}
</script>
