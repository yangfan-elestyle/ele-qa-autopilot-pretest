<template>
  <div class="h-screen flex flex-col min-h-0">
    <!-- Header -->
    <header class="theme-header flex-none">
      <div class="w-full mx-auto px-3 sm:px-5 h-[60px] flex justify-between items-center gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="ds-brand-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <img src="../assets/logo.png" alt="" class="h-5 w-5" />
          </div>
          <div class="hidden sm:flex flex-col leading-tight min-w-0">
            <h1 class="text-[15px] font-semibold theme-title tracking-tight truncate">
              <slot name="title">QA AutoPilot · AutoTest</slot>
            </h1>
            <span class="text-[11px] font-medium uppercase tracking-wide" style="color: var(--ds-text-tertiary);">
              Prompt Engineering Studio
            </span>
          </div>
          <h1 class="sm:hidden text-[14px] font-semibold theme-title truncate">
            <slot name="title">AutoTest</slot>
          </h1>
          <span
            class="hidden md:inline-flex ds-status-pill ds-status-pill-success ml-2"
            title="Studio 已就绪"
            aria-label="Studio 已就绪"
          >
            <span class="ds-status-dot-pulse" aria-hidden="true"></span>
            Studio 就绪
          </span>
        </div>
        <div class="flex items-center gap-1.5 sm:gap-2">
          <slot name="actions"></slot>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="flex-1 min-h-0 w-full mx-auto px-2 py-2 sm:px-4 sm:py-4">
      <div class="flex flex-col lg:flex-row gap-2 sm:gap-4 h-full">
        <slot></slot>
      </div>
    </main>

    <slot name="modals"></slot>
    <ToastUI />
  </div>
</template>

<script setup lang="ts">
import { ToastUI } from '../index'
</script>

<style scoped>
.custom-select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: none !important;
}
.custom-select::-ms-expand {
  display: none;
}

.ds-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0 0 currentColor;
  animation: ds-status-pulse 2.4s ease-out infinite;
}

@keyframes ds-status-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 60%, transparent);
  }
  70% {
    box-shadow: 0 0 0 7px color-mix(in srgb, currentColor 0%, transparent);
  }
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 0%, transparent);
  }
}
</style>
