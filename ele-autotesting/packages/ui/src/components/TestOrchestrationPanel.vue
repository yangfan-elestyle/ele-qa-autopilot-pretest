<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 theme-mask z-50 flex items-center justify-center p-4" @click="close">
      <div
        class="theme-manager-container w-full mx-auto flex flex-col overflow-hidden"
        style="max-width: 1080px; max-height: 92vh"
        @click.stop
      >
        <header class="ds-modal-head">
          <div class="ds-modal-head-left">
            <span class="ds-modal-title-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </span>
            <h2 class="ds-modal-title">
              测试编排
              <span class="ds-modal-subtitle hidden sm:inline">AutoTest ⇄ AutoPilot ⇄ MeterSphere</span>
            </h2>
          </div>
          <div class="ds-modal-head-right">
            <button @click="close" class="ds-icon-btn-sm" type="button" aria-label="关闭">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </header>

        <!-- Tab 切换 -->
        <div class="ds-ms-tabs">
          <button
            class="ds-ms-tab"
            :class="{ 'ds-ms-tab--active': active === 'autotest' }"
            @click="active = 'autotest'"
            type="button"
          >AutoTest 用例</button>
          <button
            class="ds-ms-tab"
            :class="{ 'ds-ms-tab--active': active === 'metersphere' }"
            @click="active = 'metersphere'"
            type="button"
          >MeterSphere</button>
        </div>

        <div class="ds-modal-body ds-ms-body">
          <AutotestCasesPanel v-show="active === 'autotest'" />
          <MeterSphereDataPanel v-show="active === 'metersphere'" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import AutotestCasesPanel from './AutotestCasesPanel.vue'
import MeterSphereDataPanel from './MeterSphereDataPanel.vue'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: 'update:show', v: boolean): void; (e: 'close'): void }>()

const active = ref<'autotest' | 'metersphere'>('autotest')

function close() {
  emit('update:show', false)
  emit('close')
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.show) close()
}

watch(() => props.show, (v) => { if (v) active.value = 'autotest' })

onMounted(() => document.addEventListener('keydown', handleKeyDown))
onUnmounted(() => document.removeEventListener('keydown', handleKeyDown))
</script>
