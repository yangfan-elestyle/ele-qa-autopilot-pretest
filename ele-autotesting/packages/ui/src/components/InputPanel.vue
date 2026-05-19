<!-- 输入面板组件 -->
<template>
  <section class="ds-input-section">
    <!-- Panel head -->
    <header class="ds-panel-head">
      <div class="ds-panel-head-left">
        <h3 class="ds-panel-title">
          <span class="ds-panel-title-dot" aria-hidden="true"></span>
          {{ label || '输入 Prompt' }}
        </h3>
        <slot name="optimization-mode-selector"></slot>
      </div>
      <div class="ds-panel-head-right">
        <button
          @click="openFullscreen"
          class="ds-icon-btn-sm"
          title="全屏编辑"
          aria-label="全屏编辑"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
    </header>

    <!-- Panel body -->
    <div class="ds-input-body">
      <!-- 上下文模式: 别名 + 类型选择器 -->
      <div v-if="optimizationMode === 'context'" class="flex flex-wrap items-center gap-2">
        <input
          :value="contextConfig.contentMark"
          @input="$emit('update:contextConfig', { ...contextConfig, contentMark: ($event.target as HTMLInputElement).value })"
          placeholder="上下文别名 (必填)"
          :class="['theme-input min-w-[150px] flex-1 sm:max-w-xs !py-2 !text-[13px]', { 'ds-input-error': !contextConfig.contentMark?.trim() }]"
          required
        />
        <PromptTypeSelector
          :contextConfig="contextConfig"
          :contents="modelValue"
          :optimized-prompt="optimizedPrompt"
          @update:contextConfig="$emit('update:contextConfig', $event)"
          @update:contents="$emit('update:modelValue', $event)"
        />
      </div>

      <!-- 主输入 textarea -->
      <div class="relative">
        <textarea
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          class="w-full theme-input resize-none !font-mono !text-[13px] !leading-relaxed"
          :placeholder="placeholder"
          rows="4"
        ></textarea>
      </div>

      <!-- 控制行: 模型 + 模板 + 操作 + 提交 -->
      <div class="ds-input-controls">
        <div class="ds-input-controls-field min-w-[140px] w-fit shrink-0">
          <label class="theme-label">{{ modelLabel }}</label>
          <slot name="model-select"></slot>
        </div>

        <div v-if="templateLabel" class="ds-input-controls-field flex-1 basis-full sm:basis-0 min-w-0">
          <label class="theme-label truncate">{{ templateLabel }}</label>
          <slot name="template-select"></slot>
        </div>

        <slot name="control-buttons"></slot>

        <div class="ds-input-controls-submit min-w-[120px] flex-1 sm:flex-none">
          <span class="theme-label opacity-0 select-none hidden sm:block" aria-hidden="true">submit</span>
          <button
            @click="$emit('submit')"
            :disabled="loading || disabled || !modelValue.trim() || (optimizationMode === 'context' && !isValidPromptData)"
            class="w-full h-10 theme-button-primary flex items-center truncate justify-center gap-1"
          >
            <span>{{ loading ? loadingText : buttonText }}</span>
            <svg v-if="!loading" class="h-3.5 w-3.5 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- 全屏弹窗 -->
  <FullscreenDialog v-model="isFullscreen" :title="label">
    <div class="h-full flex flex-col">
      <textarea
        v-model="fullscreenValue"
        class="w-full h-full min-h-[70vh] p-4 theme-input resize-none overflow-auto flex-1"
        :placeholder="placeholder"
      ></textarea>
    </div>
  </FullscreenDialog>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useFullscreen } from '../composables/useFullscreen'
import FullscreenDialog from './FullscreenDialog.vue'
import PromptTypeSelector from './PromptTypeSelector.vue'
import type { ContextConfig } from '../composables/usePromptHistory'

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  placeholder: {
    type: String,
    default: '',
  },
  modelLabel: {
    type: String,
    required: true,
  },
  templateLabel: {
    type: String,
    default: '',
  },
  buttonText: {
    type: String,
    required: true,
  },
  loadingText: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  optimizationMode: {
    type: String,
    required: true,
  },
  contextConfig: {
    type: Object as PropType<ContextConfig>,
    required: true,
  },
  optimizedPrompt: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'submit', 'update:contextConfig'])

// 计算提交按钮是否可用（仅在 system mode 时验证）
const isValidPromptData = computed(() => {
  if (props.optimizationMode !== 'context') return true

  if (
    props.contextConfig.contentType === 'prompt_url' ||
    props.contextConfig.contentType === 'prompt_figma' ||
    props.contextConfig.contentType === 'prompt_file'
  ) {
    return !!props.contextConfig.contents?.trim()
  }

  if (props.contextConfig.contentType === 'prompt_image') {
    return !!props.contextConfig.contents?.trim()
  }

  return true
})

// 使用全屏组合函数
const { isFullscreen, fullscreenValue, openFullscreen } = useFullscreen(
  computed(() => props.modelValue),
  (value) => emit('update:modelValue', value),
)
</script>

<style scoped>
.ds-input-section {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-bottom: 1px solid var(--ds-border-soft);
}

.ds-input-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px 16px;
}

.ds-input-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}

.ds-input-controls-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ds-input-controls-field .theme-label {
  margin: 0;
}

.ds-input-controls-submit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ds-input-error {
  border-color: var(--ds-danger) !important;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12) !important;
}
</style>
