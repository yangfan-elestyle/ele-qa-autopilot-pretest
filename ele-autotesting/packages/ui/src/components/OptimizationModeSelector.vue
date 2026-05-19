<!-- 优化模式选择器 — 段控件 + 模式描述 -->
<template>
  <div
    class="ds-mode-segment"
    role="tablist"
    aria-label="优化模式"
  >
    <button
      type="button"
      role="tab"
      :aria-selected="modelValue === 'context'"
      :class="[
        'ds-mode-segment__btn',
        { 'ds-mode-segment__btn--active': modelValue === 'context' },
      ]"
      @click="updateOptimizationMode('context')"
      :title="contextDescription"
    >
      <span class="ds-mode-segment__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      </span>
      <span class="ds-mode-segment__text">
        <span class="ds-mode-segment__label">上下文制作</span>
        <span class="ds-mode-segment__hint">为 AI 准备角色与背景信息</span>
      </span>
    </button>
    <span class="ds-mode-segment__divider" aria-hidden="true"></span>
    <button
      type="button"
      role="tab"
      :aria-selected="modelValue === 'verify'"
      :class="[
        'ds-mode-segment__btn',
        { 'ds-mode-segment__btn--active': modelValue === 'verify' },
      ]"
      @click="updateOptimizationMode('verify')"
      :title="verifyDescription"
    >
      <span class="ds-mode-segment__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
        </svg>
      </span>
      <span class="ds-mode-segment__text">
        <span class="ds-mode-segment__label">内容生成</span>
        <span class="ds-mode-segment__hint">为具体交互生成提示词</span>
      </span>
    </button>
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

const contextDescription = '上下文提示词优化模式：定义 AI 助手的角色、行为与回应风格'
const verifyDescription = '内容生成提示词优化模式：让用户与 AI 的具体交互更精准'

const updateOptimizationMode = (mode: OptimizationMode) => {
  if (mode !== props.modelValue) {
    emit('update:modelValue', mode)
    emit('change', mode)
  }
}
</script>

<style scoped>
.ds-mode-segment {
  display: inline-flex;
  align-items: stretch;
  padding: 4px;
  border-radius: 10px;
  background: var(--ds-surface-subtle);
  border: 1px solid var(--ds-border-soft);
  gap: 0;
  position: relative;
}

.ds-mode-segment__btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 8px;
  background: transparent;
  color: var(--ds-text-secondary);
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
  border: 0;
  text-align: left;
  white-space: nowrap;
  min-height: 44px;
}

.ds-mode-segment__btn:hover {
  color: var(--ds-text-primary);
}

.ds-mode-segment__btn:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.ds-mode-segment__btn--active {
  background: var(--ds-surface-elevated);
  color: var(--ds-brand-700);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 0 0 1px rgba(99, 102, 241, 0.24);
}

.ds-mode-segment__btn--active:hover {
  color: var(--ds-brand-700);
}

.ds-mode-segment__btn:active:not(.ds-mode-segment__btn--active) {
  transform: scale(0.98);
}

.ds-mode-segment__icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--ds-text-tertiary);
  transition: color 0.18s ease;
}

.ds-mode-segment__btn--active .ds-mode-segment__icon {
  color: var(--ds-brand-600);
}

.ds-mode-segment__icon svg {
  width: 100%;
  height: 100%;
}

.ds-mode-segment__text {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.15;
  gap: 2px;
}

.ds-mode-segment__label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.005em;
}

.ds-mode-segment__hint {
  font-size: 11px;
  font-weight: 500;
  color: var(--ds-text-tertiary);
  letter-spacing: 0;
}

.ds-mode-segment__btn--active .ds-mode-segment__hint {
  color: var(--ds-brand-500);
  opacity: 0.85;
}

.ds-mode-segment__divider {
  width: 1px;
  margin: 6px 0;
  background: transparent;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .ds-mode-segment {
    width: 100%;
  }
  .ds-mode-segment__btn {
    flex: 1;
    justify-content: center;
    min-height: 40px;
    padding: 6px 8px;
  }
  .ds-mode-segment__text {
    align-items: flex-start;
  }
  .ds-mode-segment__hint {
    display: none;
  }
}
</style>
