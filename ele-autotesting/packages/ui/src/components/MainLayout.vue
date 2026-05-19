<template>
  <div class="h-screen flex flex-col min-h-0">
    <!-- Header -->
    <header class="theme-header flex-none">
      <div class="w-full mx-auto px-3 sm:px-5 h-[60px] flex justify-between items-center gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
            style="background: linear-gradient(135deg, var(--ds-brand-500) 0%, var(--ds-brand-700) 100%); box-shadow: 0 2px 6px rgba(99, 102, 241, 0.32);"
          >
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

<style>
.custom-select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: none !important;
}
.custom-select::-ms-expand {
  display: none;
}
</style>
