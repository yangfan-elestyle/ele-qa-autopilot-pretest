<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 theme-mask z-50 flex items-center justify-center p-4" @click="close">
      <div class="theme-manager-container w-full max-w-md mx-auto flex flex-col overflow-hidden" @click.stop style="max-height: 90vh">
        <!-- Header -->
        <header class="ds-modal-head">
          <div class="ds-modal-head-left">
            <span class="ds-modal-title-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14a9 3 0 0 0 18 0V5" />
                <path d="M3 12a9 3 0 0 0 18 0" />
              </svg>
            </span>
            <h2 class="ds-modal-title">
              数据管理
              <span class="ds-modal-subtitle hidden sm:inline">导出 / 导入工作台配置</span>
            </h2>
          </div>
          <div class="ds-modal-head-right">
            <button @click="close" class="ds-icon-btn-sm" type="button" aria-label="关闭">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </header>

        <!-- Content -->
        <div class="ds-modal-body space-y-5">
          <!-- 导出功能 -->
          <div class="space-y-2.5">
            <h3 class="ds-modal-section-title">
              <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
              导出数据
            </h3>
            <p class="ds-modal-section-desc">
              导出所有上下文、模型配置、自定义提示词和用户设置（包括主题、语言、模型选择等）
            </p>
            <button
              @click="handleExport"
              :disabled="isExporting"
              class="w-full theme-button-primary"
              style="height: 38px"
            >
              <span v-if="isExporting" class="flex items-center justify-center gap-2">
                <span class="ds-spinner" aria-hidden="true"></span>
                导出中…
              </span>
              <span v-else class="flex items-center justify-center gap-2">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                导出数据
              </span>
            </button>
          </div>

          <!-- 导入功能 -->
          <div class="space-y-2.5">
            <h3 class="ds-modal-section-title">
              <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
              导入数据
            </h3>
            <p class="ds-modal-section-desc">
              导入之前导出的数据文件（将覆盖现有数据和用户设置）
            </p>

            <!-- 文件选择区域 -->
            <div
              class="ds-dropzone"
              :class="{ 'is-over': isDragOver }"
              @dragover.prevent="handleDragOver"
              @dragenter.prevent="handleDragEnter"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
            >
              <input ref="fileInput" type="file" accept=".json" @change="handleFileSelect" class="hidden" />

              <template v-if="!selectedFile">
                <div @click="fileInput?.click()" class="contents">
                  <div class="ds-dropzone-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <polyline points="9 15 12 12 15 15" />
                    </svg>
                  </div>
                  <div class="ds-dropzone-title">点击选择 .json 文件</div>
                  <div class="ds-dropzone-hint">或将文件拖拽至此处</div>
                </div>
              </template>

              <template v-else>
                <div class="ds-dropzone-icon" aria-hidden="true" style="color: var(--ds-success)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div class="ds-dropzone-selected">
                  <span class="ds-dropzone-selected-name">{{ selectedFile.name }}</span>
                  <span class="ds-dropzone-selected-size">{{ formatFileSize(selectedFile.size) }}</span>
                  <div class="ds-dropzone-selected-actions">
                    <button @click="fileInput?.click()" type="button" class="ds-pill-btn">更换文件</button>
                    <button @click="clearSelectedFile" type="button" class="ds-pill-btn ds-pill-btn--danger">清空</button>
                  </div>
                </div>
              </template>
            </div>

            <!-- 导入按钮 -->
            <button
              @click="handleImport"
              :disabled="!selectedFile || isImporting"
              class="w-full theme-manager-button-success disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style="height: 38px; border-radius: var(--ds-radius-md);"
            >
              <span v-if="isImporting" class="flex items-center justify-center gap-2">
                <span class="ds-spinner" aria-hidden="true"></span>
                导入中…
              </span>
              <span v-else class="flex items-center justify-center gap-2">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                导入数据
              </span>
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
