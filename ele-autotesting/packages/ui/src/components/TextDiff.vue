<template>
  <div class="ds-diff-shell">
    <!-- 对比模式切换 -->
    <header class="ds-diff-header" v-if="showHeader">
      <button
        type="button"
        class="ds-pill-btn"
        :class="{ 'ds-pill-btn--primary': !isEnabled }"
        @click="$emit('toggleDiff')"
        :aria-label="isEnabled ? '关闭对比模式' : '开启对比模式'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v18" />
          <path d="m7 7-4 5 4 5" />
          <path d="m17 7 4 5-4 5" />
        </svg>
        {{ isEnabled ? '关闭对比' : '开启对比' }}
      </button>

      <div v-if="isEnabled && compareResult" class="inline-flex items-center gap-2">
        <span class="ds-diff-stat ds-diff-stat--added" v-if="compareResult.summary.additions > 0">
          +{{ compareResult.summary.additions }}
        </span>
        <span class="ds-diff-stat ds-diff-stat--removed" v-if="compareResult.summary.deletions > 0">
          -{{ compareResult.summary.deletions }}
        </span>
        <span class="ds-diff-stat ds-diff-stat--unchanged" v-if="compareResult.summary.additions === 0 && compareResult.summary.deletions === 0">
          无差异
        </span>
      </div>
    </header>

    <!-- 文本内容 -->
    <div class="ds-diff-body">
      <template v-if="isEnabled && compareResult">
        <span
          v-for="fragment in compareResult.fragments"
          :key="fragment.index"
          :class="getFragmentClass(fragment.type)"
          class="ds-diff-fragment"
        >{{ fragment.text }}</span>
      </template>

      <template v-else>
        {{ displayText }}
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CompareResult, ChangeType } from '@prompt-optimizer/core'

interface Props {
  /** 原始文本 */
  originalText: string
  /** 优化后的文本 */
  optimizedText: string
  /** 对比结果 */
  compareResult?: CompareResult
  /** 是否启用对比模式 */
  isEnabled: boolean
  /** 是否显示头部控制栏 */
  showHeader?: boolean
  /** 显示的文本类型：original | optimized */
  displayMode?: 'original' | 'optimized'
}

interface Emits {
  (e: 'toggleDiff'): void
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  displayMode: 'optimized',
})

defineEmits<Emits>()

const displayText = computed(() => {
  return props.displayMode === 'original' ? props.originalText : props.optimizedText
})

const getFragmentClass = (type: ChangeType): string => {
  switch (type) {
    case 'added':
      return 'ds-diff-fragment--added'
    case 'removed':
      return 'ds-diff-fragment--removed'
    case 'unchanged':
    default:
      return ''
  }
}
</script>
