<template>
  <div class="ds-output-section flex flex-col h-full">
    <!-- 标题和按钮区域 -->
    <header class="ds-panel-head flex-none">
      <div class="ds-panel-head-left">
        <h3 class="ds-panel-title">
          <span class="ds-panel-title-dot" aria-hidden="true"></span>
          优化结果
        </h3>
        <div
          v-if="versions && versions.length > 0"
          class="ds-version-pills"
          role="tablist"
          aria-label="版本"
        >
          <span class="ds-version-pills-label">版本</span>
          <button
            v-for="version in versions.slice().reverse()"
            :key="version.id"
            type="button"
            role="tab"
            :aria-selected="currentVersionId === version.id"
            @click="switchVersion(version)"
            class="ds-version-pill"
            :class="{ 'ds-version-pill--active': currentVersionId === version.id }"
            :title="`切换到 V${version.version}`"
          >
            V{{ version.version }}
          </button>
          <span v-if="versions.length > 0" class="ds-version-pills-count">
            共 {{ versions.length }} 版
          </span>
        </div>
      </div>
      <div class="ds-panel-head-right">
        <button
          v-if="optimizedPrompt"
          @click="handleIterate"
          class="ds-iterate-btn"
          :class="{ 'ds-iterate-btn--loading': isIterating }"
          :disabled="isIterating"
          title="基于当前结果迭代下一版"
        >
          <svg
            v-if="!isIterating"
            class="ds-iterate-btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span class="ds-iterate-btn-spinner" v-else aria-hidden="true"></span>
          <span>{{ isIterating ? '优化中…' : '继续优化' }}</span>
        </button>
      </div>
    </header>

    <!-- 内容区域：使用 OutputDisplay 组件 -->
    <div class="ds-output-body flex-1 min-h-0">
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
        placeholder="优化后的内容将显示在这里…"
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
/* panel-head 类已提至全局 theme.css; 此处只放本组件私有 */
.ds-output-section {
  min-height: 0;
}

.ds-output-body {
  padding: 14px 16px 16px;
}

.ds-version-pills {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border-radius: 8px;
  background: var(--ds-surface-subtle);
  border: 1px solid var(--ds-border-soft);
  flex-wrap: wrap;
}

.ds-version-pills-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ds-text-tertiary);
  padding: 0 6px 0 4px;
}

.ds-version-pill {
  font-family: var(--ds-font-mono);
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  border: 0;
  background: transparent;
  color: var(--ds-text-secondary);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
  letter-spacing: 0.01em;
}

.ds-version-pill:hover:not(.ds-version-pill--active) {
  background: var(--ds-surface-elevated);
  color: var(--ds-text-primary);
}

.ds-version-pill--active {
  background: var(--ds-surface-elevated);
  color: var(--ds-brand-700);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 0 0 1px rgba(99, 102, 241, 0.32);
  font-weight: 600;
}

.ds-version-pills-count {
  font-size: 11px;
  font-weight: 500;
  color: var(--ds-text-tertiary);
  padding-left: 4px;
  padding-right: 4px;
}

.ds-iterate-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  background: var(--ds-surface-elevated);
  color: var(--ds-text-secondary);
  border: 1px solid var(--ds-border-default);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.ds-iterate-btn:hover:not(:disabled) {
  background: var(--ds-brand-50);
  color: var(--ds-brand-700);
  border-color: rgba(99, 102, 241, 0.32);
}

.ds-iterate-btn:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.ds-iterate-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.ds-iterate-btn-icon {
  width: 14px;
  height: 14px;
}

.ds-iterate-btn-spinner {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--ds-brand-500) 25%, transparent);
  border-top-color: var(--ds-brand-600);
  animation: ds-iterate-spin 0.8s linear infinite;
}

.ds-iterate-btn--loading {
  background: var(--ds-brand-50);
  color: var(--ds-brand-700);
  border-color: rgba(99, 102, 241, 0.28);
}

@keyframes ds-iterate-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .ds-panel-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .ds-panel-head-right {
    width: 100%;
    justify-content: flex-end;
  }
  .ds-version-pills {
    width: 100%;
  }
  .ds-iterate-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
