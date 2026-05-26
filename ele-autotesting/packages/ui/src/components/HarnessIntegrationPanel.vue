<template>
  <div class="space-y-5">
    <div class="ds-integration-intro">
      <h3 class="ds-modal-section-title">
        <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
        ELE-Harness LLM 凭证
      </h3>
      <p class="ds-integration-intro-text">
        用于驱动 ELE-Harness Agent 跑测试用例。凭证以登录账号维度保存在云端 D1（不写入本地浏览器），跨设备一致；apiKey 已配置后，留空即可保留原值。
      </p>
    </div>

    <form @submit.prevent="onSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium theme-manager-text mb-1.5">Provider</label>
        <select v-model="form.provider" class="theme-manager-input" @change="onProviderChange">
          <option v-for="p in PROVIDERS" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium theme-manager-text mb-1.5">Model</label>
        <input
          v-model.trim="form.model"
          type="text"
          autocomplete="off"
          spellcheck="false"
          class="theme-manager-input"
          placeholder="如 gpt-4o / gemini-2.0-flash / llama3.1:8b"
        />
      </div>

      <div>
        <label class="block text-sm font-medium theme-manager-text mb-1.5">API Key</label>
        <input
          v-model="form.apiKey"
          type="password"
          autocomplete="off"
          spellcheck="false"
          class="theme-manager-input"
          :placeholder="apiKeyPlaceholder"
        />
        <p class="text-xs theme-manager-text-secondary mt-1.5">
          自托管 runner（ollama / lmstudio / llamacpp）若无需鉴权，可填占位字符串。
        </p>
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-sm font-medium theme-manager-text">Base URL</label>
          <button
            v-if="canResetBaseUrl"
            type="button"
            class="text-xs theme-manager-text-secondary hover:underline"
            @click="resetBaseUrl"
          >
            恢复默认
          </button>
        </div>
        <input
          v-model.trim="form.baseUrl"
          type="text"
          autocomplete="off"
          spellcheck="false"
          class="theme-manager-input"
          placeholder="如 https://api.openai.com/v1"
          @input="baseUrlDirty = true"
        />
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="block text-sm font-medium theme-manager-text mb-1.5">Max Turns（可选）</label>
          <input
            v-model="form.maxTurns"
            type="number"
            min="1"
            step="1"
            class="theme-manager-input"
            placeholder="单次 turn 上限"
          />
        </div>
        <div>
          <label class="block text-sm font-medium theme-manager-text mb-1.5">Max Tokens（可选）</label>
          <input
            v-model="form.maxTokens"
            type="number"
            min="1"
            step="1"
            class="theme-manager-input"
            placeholder="留空走 harness 默认"
          />
        </div>
        <div>
          <label class="block text-sm font-medium theme-manager-text mb-1.5">Temperature（可选）</label>
          <input
            v-model="form.temperature"
            type="number"
            min="0"
            max="2"
            step="0.1"
            class="theme-manager-input"
            placeholder="0 ~ 2"
          />
        </div>
      </div>

      <div class="ds-integration-status">
        <span v-if="configured" class="ds-integration-status-tag ds-integration-status-tag--ok">已配置</span>
        <span v-else class="ds-integration-status-tag ds-integration-status-tag--off">未配置</span>
        <button type="submit" class="ds-pill-btn ds-pill-btn--primary" :disabled="saving">
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <button
          v-if="configured"
          type="button"
          class="ds-pill-btn"
          :disabled="saving"
          @click="onClear"
        >
          清除
        </button>
      </div>

      <p v-if="message" class="text-xs" :class="messageOk ? 'theme-manager-text-secondary' : 'text-red-500'">
        {{ message }}
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { getApiBasePath } from '@prompt-optimizer/core'

const PROVIDERS = ['openai', 'google', 'ollama', 'lmstudio', 'llamacpp'] as const
type Provider = (typeof PROVIDERS)[number]

const BASE_URL_DEFAULTS: Record<Provider, string> = {
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: '',
  lmstudio: '',
  llamacpp: '',
}

interface FormState {
  provider: Provider
  model: string
  apiKey: string
  baseUrl: string
  maxTurns: string
  maxTokens: string
  temperature: string
}

const form = reactive<FormState>({
  provider: 'openai',
  model: '',
  apiKey: '',
  baseUrl: BASE_URL_DEFAULTS.openai,
  maxTurns: '',
  maxTokens: '',
  temperature: '',
})
const configured = ref(false)
const baseUrlDirty = ref(false)
const apiKeyAlreadyStored = ref(false)
const saving = ref(false)
const message = ref('')
const messageOk = ref(true)

const endpoint = () => `${getApiBasePath()}/api/integrations/harness-llm`

const canResetBaseUrl = computed(
  () =>
    BASE_URL_DEFAULTS[form.provider] !== '' && form.baseUrl !== BASE_URL_DEFAULTS[form.provider],
)

const apiKeyPlaceholder = computed(() =>
  apiKeyAlreadyStored.value ? '已保存（留空表示沿用原值）' : '请输入 API Key',
)

function applyConfig(data: any) {
  configured.value = !!data?.configured
  if (data?.configured) {
    form.provider = (data.provider as Provider) || 'openai'
    form.model = data.model || ''
    form.baseUrl = data.baseUrl || BASE_URL_DEFAULTS[form.provider]
    form.maxTurns = data.maxTurns != null ? String(data.maxTurns) : ''
    form.maxTokens = data.maxTokens != null ? String(data.maxTokens) : ''
    form.temperature = data.temperature != null ? String(data.temperature) : ''
    form.apiKey = ''
    apiKeyAlreadyStored.value = true
    baseUrlDirty.value = data.baseUrl !== BASE_URL_DEFAULTS[form.provider]
  } else {
    form.baseUrl = BASE_URL_DEFAULTS[form.provider]
    apiKeyAlreadyStored.value = false
    baseUrlDirty.value = false
  }
}

async function loadConfig() {
  // 集成面板不显示 apiKey 实际值, 走默认掩码 GET 即可; 避免明文 key 流入浏览器.
  try {
    const res = await fetch(endpoint(), { credentials: 'include' })
    if (!res.ok) {
      message.value = `加载失败: HTTP ${res.status}`
      messageOk.value = false
      return
    }
    applyConfig(await res.json())
  } catch (e: any) {
    message.value = `加载失败: ${e?.message ?? e}`
    messageOk.value = false
  }
}

function onProviderChange() {
  if (!baseUrlDirty.value) {
    form.baseUrl = BASE_URL_DEFAULTS[form.provider]
  }
}

function resetBaseUrl() {
  form.baseUrl = BASE_URL_DEFAULTS[form.provider]
  baseUrlDirty.value = false
}

async function onSubmit() {
  if (!form.model.trim()) {
    message.value = '请填写 model'
    messageOk.value = false
    return
  }
  if (!form.apiKey && !apiKeyAlreadyStored.value) {
    message.value = '请填写 apiKey'
    messageOk.value = false
    return
  }
  if (!form.baseUrl.trim()) {
    message.value = '请填写 baseUrl'
    messageOk.value = false
    return
  }

  saving.value = true
  message.value = ''
  try {
    const payload: Record<string, unknown> = {
      provider: form.provider,
      model: form.model.trim(),
      apiKey: form.apiKey,
      baseUrl: form.baseUrl.trim(),
    }
    if (form.maxTurns !== '') payload.maxTurns = Number(form.maxTurns)
    if (form.maxTokens !== '') payload.maxTokens = Number(form.maxTokens)
    if (form.temperature !== '') payload.temperature = Number(form.temperature)

    const res = await fetch(endpoint(), {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const detail = (await res.json().catch(() => ({}))) as { error?: string }
      message.value = `保存失败: ${detail.error ?? `HTTP ${res.status}`}`
      messageOk.value = false
      return
    }
    message.value = '已保存'
    messageOk.value = true
    await loadConfig()
  } catch (e: any) {
    message.value = `保存失败: ${e?.message ?? e}`
    messageOk.value = false
  } finally {
    saving.value = false
  }
}

async function onClear() {
  saving.value = true
  message.value = ''
  try {
    const res = await fetch(endpoint(), { method: 'DELETE', credentials: 'include' })
    if (!res.ok) {
      message.value = `清除失败: HTTP ${res.status}`
      messageOk.value = false
      return
    }
    form.provider = 'openai'
    form.model = ''
    form.apiKey = ''
    form.baseUrl = BASE_URL_DEFAULTS.openai
    form.maxTurns = ''
    form.maxTokens = ''
    form.temperature = ''
    configured.value = false
    apiKeyAlreadyStored.value = false
    baseUrlDirty.value = false
    message.value = '已清除'
    messageOk.value = true
  } catch (e: any) {
    message.value = `清除失败: ${e?.message ?? e}`
    messageOk.value = false
  } finally {
    saving.value = false
  }
}

onMounted(loadConfig)
</script>
