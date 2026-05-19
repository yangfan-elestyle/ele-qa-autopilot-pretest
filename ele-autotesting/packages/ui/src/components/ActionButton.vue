<template>
  <button class="theme-icon-button" @click="$emit('click')" :disabled="loading" :title="text">
    <span class="inline-flex items-center justify-center h-4 w-4">
      <span v-if="loading" class="text-base">⏳</span>
      <slot v-else name="icon">
        <span v-if="icon" class="text-base sm:text-[15px]" aria-hidden="true">{{ icon }}</span>
      </slot>
    </span>
    <span class="text-[13px] font-medium max-md:hidden">{{ loading ? loadingText || '加载中...' : text }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
  text: string
  loading?: boolean
  loadingText?: string
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>
