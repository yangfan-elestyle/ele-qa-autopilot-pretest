<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 space-y-2 max-w-sm" style="z-index: 100">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform translate-x-full opacity-0"
        enter-to-class="transform translate-x-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform translate-x-0 opacity-100"
        leave-to-class="transform translate-x-full opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="ds-toast flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg shadow-lg backdrop-blur-md"
          :class="`ds-toast--${toast.type}`"
        >
          <span class="inline-flex items-center justify-center h-4 w-4 mt-0.5 shrink-0">
            <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="h-4 w-4" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="h-4 w-4" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-3a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="toast.type === 'warning'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="h-4 w-4" fill="currentColor">
              <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clip-rule="evenodd" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="h-4 w-4" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9z" clip-rule="evenodd" />
            </svg>
          </span>
          <span class="text-sm leading-relaxed flex-1">{{ toast.message }}</span>
          <button
            @click="remove(toast.id)"
            class="opacity-60 hover:opacity-100 transition-opacity -mt-0.5 -mr-0.5"
            aria-label="关闭"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast'

const { toasts, remove } = useToast()
</script>

<style scoped>
.ds-toast {
  border: 1px solid;
}
.ds-toast--success {
  background: var(--ds-success-soft);
  color: #15803d;
  border-color: rgba(22, 163, 74, 0.28);
}
.ds-toast--error {
  background: var(--ds-danger-soft);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.28);
}
.ds-toast--warning {
  background: var(--ds-warning-soft);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.28);
}
.ds-toast--info {
  background: var(--ds-info-soft);
  color: #1d4ed8;
  border-color: rgba(37, 99, 235, 0.28);
}
:root.dark .ds-toast--success {
  background: rgba(22, 163, 74, 0.16);
  color: #86efac;
}
:root.dark .ds-toast--error {
  background: rgba(220, 38, 38, 0.16);
  color: #fca5a5;
}
:root.dark .ds-toast--warning {
  background: rgba(217, 119, 6, 0.18);
  color: #fcd34d;
}
:root.dark .ds-toast--info {
  background: rgba(37, 99, 235, 0.18);
  color: #93c5fd;
}
</style>
