<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 theme-mask z-[60] flex items-center justify-center overflow-y-auto" @click="onBackdropClick">
      <div class="relative theme-manager-container min-h-[80vh] h-[90vh] w-[90vw] m-4 flex flex-col overflow-hidden">
        <!-- 标题栏 -->
        <header class="ds-modal-head">
          <div class="ds-modal-head-left">
            <span class="ds-modal-title-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </span>
            <h3 class="ds-modal-title">{{ title || '全屏编辑' }}</h3>
          </div>
          <div class="ds-modal-head-right">
            <span class="ds-modal-subtitle hidden sm:inline">Esc 关闭</span>
            <button @click="close" class="ds-icon-btn-sm" type="button" aria-label="退出全屏">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </header>

        <!-- 内容区域 -->
        <div class="flex-1 min-h-0 p-4 overflow-auto">
          <slot></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

// 关闭弹窗
const close = () => {
  emit('update:modelValue', false)
}

const onBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    close()
  }
}

// 监听ESC键
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue) {
    close()
  }
}

// 挂载和卸载事件监听器
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.overflow-auto {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.overflow-auto::-webkit-scrollbar {
  display: none;
}
</style>
