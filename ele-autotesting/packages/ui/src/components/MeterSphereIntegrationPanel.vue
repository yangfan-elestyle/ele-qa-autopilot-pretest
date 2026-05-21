<template>
  <div class="space-y-5">
    <div class="ds-integration-intro">
      <h3 class="ds-modal-section-title">
        <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
        MeterSphere 访问凭证
      </h3>
      <p class="ds-integration-intro-text">
        用于联动 MeterSphere 拉取项目 / 模块 / 用例。AK 与 SK 仅保存在当前浏览器本地，刷新后仍然生效；如需撤销访问，清空对应输入框即可。
      </p>
    </div>

    <form @submit.prevent class="space-y-4">
      <div>
        <label class="block text-sm font-medium theme-manager-text mb-1.5">Access Key (AK)</label>
        <input
          v-model="ak"
          type="password"
          autocomplete="off"
          spellcheck="false"
          class="theme-manager-input"
          placeholder="AK (16 字符)"
        />
      </div>
      <div>
        <label class="block text-sm font-medium theme-manager-text mb-1.5">Secret Key (SK)</label>
        <input
          v-model="sk"
          type="password"
          autocomplete="off"
          spellcheck="false"
          class="theme-manager-input"
          placeholder="SK (16/24/32 字符)"
        />
        <p class="text-xs theme-manager-text-secondary mt-1.5">
          在 MeterSphere → 个人信息 → API Keys 中生成；填写后即可在「联动」面板中拉取项目与用例。
        </p>
      </div>

      <div class="ds-integration-status">
        <span v-if="ak && sk" class="ds-integration-status-tag ds-integration-status-tag--ok">已配置</span>
        <span v-else-if="ak || sk" class="ds-integration-status-tag ds-integration-status-tag--warn">仅配置一项</span>
        <span v-else class="ds-integration-status-tag ds-integration-status-tag--off">未配置</span>
        <button
          v-if="ak || sk"
          type="button"
          class="ds-pill-btn"
          @click="clearAll"
        >
          清除
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useBrowserCache } from '../composables/useBrowserCache'

const ak = useBrowserCache<string>('metersphere.ak', '')
const sk = useBrowserCache<string>('metersphere.sk', '')

const clearAll = () => {
  ak.value = ''
  sk.value = ''
}
</script>
