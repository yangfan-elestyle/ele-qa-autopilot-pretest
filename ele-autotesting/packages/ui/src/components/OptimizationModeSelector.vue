<!-- 优化模式选择器组件 - 简化版 -->
<template>
  <div class="optimization-mode-selector">
    <div class="inline-flex theme-background-surface rounded theme-border-strong text-base">
      <button
        @click="updateOptimizationMode('context')"
        :class="[
          'px-2.5 py-0.5 transition-colors duration-150 rounded-l',
          'focus:outline-none focus:ring-1 focus:ring-blue-400',
          modelValue === 'context' ? 'theme-button-toggle-active' : 'theme-button-toggle-inactive',
        ]"
        :aria-pressed="modelValue === 'context'"
        title="上下文提示词优化模式：优化用于定义AI助手角色、行为和回应风格的上下文提示词"
      >
        上下文制作
      </button>
      <div class="w-px theme-border-strong"></div>
      <button
        @click="updateOptimizationMode('verify')"
        :class="[
          'px-2.5 py-0.5 transition-colors duration-150 rounded-r',
          'focus:outline-none focus:ring-1 focus:ring-blue-400',
          modelValue === 'verify' ? 'theme-button-toggle-active' : 'theme-button-toggle-inactive',
        ]"
        :aria-pressed="modelValue === 'verify'"
        title="内容生成提示词优化模式：优化用户与AI交互时使用的提示词，提高交互效果和准确性"
      >
        内容生成
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OptimizationMode } from '../composables/usePromptOptimizer'

interface Props {
  modelValue: OptimizationMode
}

interface Emits {
  (e: 'update:modelValue', value: OptimizationMode): void
  (e: 'change', value: OptimizationMode): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/**
 * 更新优化模式
 */
const updateOptimizationMode = (mode: OptimizationMode) => {
  if (mode !== props.modelValue) {
    emit('update:modelValue', mode)
    emit('change', mode)
  }
}
</script>

<style scoped>
.optimization-mode-selector {
  display: inline-flex;
}

/* 微妙的按钮反馈 */
.optimization-mode-selector button:active {
  transform: scale(0.95);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .optimization-mode-selector {
    width: 100%;
  }

  .optimization-mode-selector .inline-flex {
    display: flex;
    width: 100%;
  }

  .optimization-mode-selector button {
    flex: 1;
  }
}
</style>
