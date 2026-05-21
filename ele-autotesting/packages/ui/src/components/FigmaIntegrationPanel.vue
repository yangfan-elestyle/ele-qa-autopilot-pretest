<template>
  <div class="space-y-5">
    <div class="ds-integration-intro">
      <h3 class="ds-modal-section-title">
        <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
        Figma 访问凭证
      </h3>
      <p class="ds-integration-intro-text">
        用于解析 Figma 文件链接生成上下文。Token 仅保存在当前浏览器本地，刷新或重新打开仍然有效；如需撤销访问，清空输入框即可。
      </p>
    </div>

    <form @submit.prevent class="space-y-4">
      <div>
        <label class="block text-sm font-medium theme-manager-text mb-1.5">
          Personal Access Token
        </label>
        <input
          v-model="figmaToken"
          type="password"
          autocomplete="off"
          spellcheck="false"
          class="theme-manager-input"
          placeholder="请输入 Figma Token"
        />
        <p class="text-xs theme-manager-text-secondary mt-1.5">
          在 Figma → Settings → Personal access tokens 生成。最小授权范围即可读取文件结构。
        </p>
      </div>

      <div class="ds-integration-status">
        <span v-if="figmaToken" class="ds-integration-status-tag ds-integration-status-tag--ok">已配置</span>
        <span v-else class="ds-integration-status-tag ds-integration-status-tag--off">未配置</span>
        <button
          v-if="figmaToken"
          type="button"
          class="ds-pill-btn"
          @click="clearToken"
        >
          清除
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const FIGMA_TOKEN_STORAGE_KEY = 'qa_figma_token'
const figmaToken = ref('')

onMounted(() => {
  if (typeof window === 'undefined') return
  const stored = window.localStorage.getItem(FIGMA_TOKEN_STORAGE_KEY)
  if (stored) figmaToken.value = stored
})

watch(figmaToken, (value) => {
  if (typeof window === 'undefined') return
  if (value.trim()) {
    window.localStorage.setItem(FIGMA_TOKEN_STORAGE_KEY, value)
  } else {
    window.localStorage.removeItem(FIGMA_TOKEN_STORAGE_KEY)
  }
})

const clearToken = () => {
  figmaToken.value = ''
}
</script>
