<template>
  <button class="theme-icon-button" :title="isDark ? '切换为日间模式' : '切换为夜间模式'" aria-label="主题切换" @click="toggleTheme">
    <span class="inline-flex items-center justify-center h-4 w-4">
      <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--ds-brand-600)">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </span>
    <span class="text-[13px] font-medium max-md:hidden">{{ isDark ? '日间模式' : '夜间模式' }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { useTheme } from '../composables/useTheme'
import type { AppServices } from '../types/services'

const services = inject<Ref<AppServices | null>>('services')!
const { theme, toggleTheme } = useTheme(services)
const isDark = computed(() => theme.value === 'dark')
</script>
