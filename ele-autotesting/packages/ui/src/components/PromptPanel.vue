<template>
  <div class="flex flex-col h-full">
    <!-- 标题和按钮区域 -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 flex-none">
      <div class="flex items-center gap-3 flex-wrap">
        <h3 class="text-lg font-semibold theme-text">
          优化后
        </h3>
        <div v-if="versions && versions.length > 0" class="flex items-center gap-1 version-container" style="position: relative">
          <button
            v-for="version in versions.slice().reverse()"
            :key="version.id"
            @click="switchVersion(version)"
            class="px-2 py-1 text-xs rounded transition-colors flex-shrink-0"
            :class="[currentVersionId === version.id ? 'font-medium theme-prompt-version-selected' : 'theme-prompt-version-unselected']"
          >
            V{{ version.version }}
          </button>
        </div>
      </div>
      <div class="flex items-center space-x-4 flex-shrink-0">
        <button v-if="optimizedPrompt" @click="handleIterate" class="px-3 py-1.5 theme-button-secondary flex items-center space-x-2" :disabled="isIterating">
          <span>{{ isIterating ? '优化中...' : '继续优化' }}</span>
        </button>
      </div>
    </div>

    <!-- 内容区域：使用 OutputDisplay 组件 -->
    <div class="flex-1 min-h-0">
      <OutputDisplay
        ref="outputDisplayRef"
        :content="optimizedPrompt"
        :original-content="previousVersionText"
        :reasoning="reasoning"
        mode="editable"
        :streaming="isOptimizing || isIterating"
        :enable-diff="true"
        :enable-copy="true"
        :enable-fullscreen="true"
        :enable-edit="true"
        placeholder="优化后的内容将显示在这里..."
        @update:content="$emit('update:optimizedPrompt', $event)"
      />
    </div>

    <!-- 迭代优化弹窗 -->
    <Modal v-model="showIterateInput" @confirm="submitIterate">
      <template #title>
        {{ templateTitleText }}
      </template>

      <div class="space-y-4">
        <div>
          <h4 class="theme-label mb-2">{{ templateSelectText }}</h4>
          <TemplateSelect
            ref="iterateTemplateSelectRef"
            :modelValue="iterationTemplate"
            @update:modelValue="(tpl) => emit('update:iterationTemplate', tpl)"
            :optimization-mode="optimizationMode"
            content-filter="advanced"
            @manage="$emit('openTemplateManager')"
          />
        </div>

        <div>
          <h4 class="theme-label mb-2">请输入需要优化的方向：</h4>
          <textarea v-model="iterateInput" class="w-full theme-input resize-none" placeholder="例如：使提示词更简洁、增加特定功能描述等..." rows="3"></textarea>
        </div>
      </div>

      <template #footer>
        <button @click="cancelIterate" class="theme-button-secondary">
          取消
        </button>
        <button
          @click="submitIterate"
          class="theme-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!iterateInput.trim() || isIterating"
        >
          {{ isIterating ? '优化中...' : '确认优化' }}
        </button>
      </template>
    </Modal>

    <!-- 全屏弹窗(已废弃，由OutputDisplay处理) -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, type Ref } from 'vue'
import { useToast } from '../composables/useToast'
import TemplateSelect from './TemplateSelect.vue'
import Modal from './Modal.vue'
import OutputDisplay from './OutputDisplay.vue'
import type { Template, PromptRecord } from '@prompt-optimizer/core'
import type { OptimizationMode } from '@/composables/usePromptOptimizer'

const toast = useToast()

interface IteratePayload {
  originalPrompt: string
  optimizedPrompt: string
  iterateInput: string
}

const props = defineProps({
  optimizedPrompt: {
    type: String,
    default: '',
  },
  reasoning: {
    type: String,
    default: '',
  },
  isOptimizing: {
    type: Boolean,
    default: false,
  },
  isIterating: {
    type: Boolean,
    default: false,
  },
  versions: {
    type: Array as () => PromptRecord[],
    default: () => [],
  },
  currentVersionId: {
    type: String,
    default: '',
  },
  originalPrompt: {
    type: String,
    default: '',
  },
  optimizationMode: {
    type: String as () => OptimizationMode,
    required: true,
  },
  // 通过 v-model 支持传入/同步迭代模板
  iterationTemplate: {
    type: Object as () => Template | null,
    default: null,
  },
})

const emit = defineEmits<{
  'update:optimizedPrompt': [value: string]
  iterate: [payload: IteratePayload]
  openTemplateManager: void
  switchVersion: [version: PromptRecord]
  'update:iterationTemplate': [template: Template | null]
}>()

const showIterateInput = ref(false)
const iterateInput = ref('')

const outputDisplayRef = ref<InstanceType<typeof OutputDisplay> | null>(null)
const iterateTemplateSelectRef = ref<{ refresh?: () => void } | null>(null)

// 计算标题文本
const templateTitleText = computed(() => {
  return '迭代功能提示词（只能使用高级模版）'
})

// 计算模板选择标题
const templateSelectText = computed(() => {
  return '请选择迭代提示词：'
})

// 计算上一版本的文本用于显示
const previousVersionText = computed(() => {
  if (!props.versions || props.versions.length === 0) {
    return props.originalPrompt || ''
  }

  const currentIndex = props.versions.findIndex((v) => v.id === props.currentVersionId)

  if (currentIndex > 0) {
    // 当前版本有上一版本
    return props.versions[currentIndex - 1].optimizedPrompt
  } else if (currentIndex === 0) {
    // 当前是V1，使用原始提示词
    return props.originalPrompt || ''
  } else {
    // 找不到当前版本，使用原始提示词
    return props.originalPrompt || ''
  }
})

const handleIterate = () => {
  showIterateInput.value = true
}

const cancelIterate = () => {
  showIterateInput.value = false
  iterateInput.value = ''
}

const submitIterate = () => {
  if (!iterateInput.value.trim()) return

  emit('iterate', {
    originalPrompt: props.originalPrompt,
    optimizedPrompt: props.optimizedPrompt,
    iterateInput: iterateInput.value.trim(),
  })

  // 重置输入
  iterateInput.value = ''
  showIterateInput.value = false
}

// 添加版本切换函数
const switchVersion = async (version: PromptRecord) => {
  if (version.id === props.currentVersionId) return

  // 发出版本切换事件
  emit('switchVersion', version)

  // 等待父组件更新内容
  await nextTick()

  // 强制刷新OutputDisplay的内容
  if (outputDisplayRef.value) {
    outputDisplayRef.value.forceRefreshContent()
  }

  console.log('[PromptPanel] 版本切换完成，强制刷新内容:', {
    versionId: version.id,
    version: version.version,
  })
}

// 监听流式状态变化，强制退出编辑状态
watch(
  [() => props.isOptimizing, () => props.isIterating],
  ([newOptimizing, newIterating], [oldOptimizing, oldIterating]) => {
    // 当开始优化或迭代时（从false变为true），强制退出编辑状态
    if ((!oldOptimizing && newOptimizing) || (!oldIterating && newIterating)) {
      if (outputDisplayRef.value) {
        outputDisplayRef.value.forceExitEditing()
        console.log('[PromptPanel] 检测到开始优化/迭代，强制退出编辑状态')
      }
    }
  },
  { immediate: false },
)

// 暴露刷新迭代模板选择的方法
const refreshIterateTemplateSelect = () => {
  if (iterateTemplateSelectRef.value?.refresh) {
    iterateTemplateSelectRef.value.refresh()
  }
}

defineExpose({
  refreshIterateTemplateSelect,
})
</script>

<style scoped>
/* 版本容器样式 */
.version-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

@media (max-width: 640px) {
  .version-container {
    margin-top: 4px;
  }
}
</style>
