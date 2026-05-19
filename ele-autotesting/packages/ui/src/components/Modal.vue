<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-show="modelValue" class="fixed inset-0 z-30 overflow-y-auto" @click="handleBackdropClick">
        <div class="flex min-h-full items-center justify-center p-4">
          <!-- Backdrop -->
          <div class="fixed inset-0 theme-mask"></div>

          <!-- Dialog -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <div class="relative theme-modal w-full transform transition-all z-10" :class="widthClass">
              <!-- Header -->
              <div class="theme-modal-header flex items-center justify-between gap-3">
                <h3 class="text-base font-semibold theme-title leading-tight">
                  <slot name="title">标题</slot>
                </h3>
                <button
                  @click="$emit('update:modelValue', false)"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-stone-500 hover:bg-stone-200/60 hover:text-stone-800 transition-colors dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
                  aria-label="关闭"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Body -->
              <div class="theme-modal-content">
                <slot></slot>
              </div>

              <!-- Footer -->
              <div class="theme-modal-footer">
                <slot name="footer">
                  <button @click="$emit('update:modelValue', false)" class="theme-button-secondary">
                    取消
                  </button>
                  <button @click="$emit('confirm')" class="theme-button-primary">
                    确认
                  </button>
                </slot>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md' | 'lg' | 'xl'
  },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const widthClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'max-w-md'
    case 'lg':
      return 'max-w-2xl'
    case 'xl':
      return 'max-w-4xl'
    default:
      return 'max-w-lg'
  }
})

const handleBackdropClick = (event) => {
  if (event.target === event.currentTarget) {
    event.stopPropagation()
    event.preventDefault()
    emit('update:modelValue', false)
  }
}
</script>
