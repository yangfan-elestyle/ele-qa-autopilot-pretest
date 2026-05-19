<template>
  <div class="h-screen flex flex-col min-h-0">
    <!-- Header -->
    <header class="theme-header flex-none">
      <div class="w-full mx-auto px-3 sm:px-5 h-[60px] flex justify-between items-center gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <a
            href="/"
            class="ds-brand-link flex shrink-0 items-center gap-2.5 rounded-md px-1 py-1 transition-colors"
            aria-label="返回首页"
          >
            <div class="ds-brand-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <img src="../assets/logo.png" alt="" class="h-4 w-4" />
            </div>
            <div class="hidden sm:flex flex-col leading-tight min-w-0">
              <h1 class="text-[15px] font-semibold theme-title tracking-tight truncate">
                <slot name="title">QA AutoPilot · AutoTest</slot>
              </h1>
              <span class="text-[10.5px] font-medium uppercase" style="color: var(--ds-text-tertiary); letter-spacing: 0.08em">
                Prompt Engineering Studio
              </span>
            </div>
            <h1 class="sm:hidden text-[14px] font-semibold theme-title truncate">
              <slot name="title">AutoTest</slot>
            </h1>
          </a>
          <span
            class="hidden md:inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ml-2 text-[10.5px] font-semibold uppercase"
            style="background: var(--ds-surface-subtle); color: var(--ds-text-tertiary); box-shadow: inset 0 0 0 1px var(--ds-border-soft); letter-spacing: 0.08em"
            aria-hidden="true"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full" style="background: var(--ds-brand-500)"></span>
            AutoTest
          </span>
          <span
            class="hidden lg:inline-flex ds-status-pill ds-status-pill-success ml-1"
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
    <main class="flex-1 min-h-0 w-full mx-auto px-3 py-3 sm:px-4 sm:py-4">
      <div class="ds-workspace-row">
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

.ds-brand-link {
  color: inherit;
  text-decoration: none;
}
.ds-brand-link:hover {
  background: var(--ds-surface-subtle);
}
.ds-brand-link:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
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
