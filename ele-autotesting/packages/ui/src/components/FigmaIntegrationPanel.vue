<template>
  <div class="space-y-5">
    <div class="ds-integration-intro">
      <h3 class="ds-modal-section-title">
        <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
        Figma 访问凭证
      </h3>
      <p class="ds-integration-intro-text">
        用于解析 Figma 文件链接生成上下文。
      </p>
    </div>

    <form @submit.prevent="onSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium theme-manager-text mb-1.5">
          Personal Access Token
        </label>
        <input
          v-model="form.token"
          type="password"
          autocomplete="off"
          spellcheck="false"
          class="theme-manager-input"
          :placeholder="tokenPlaceholder"
        />
        <p class="text-xs theme-manager-text-secondary mt-1.5">
          在 Figma → Settings → Personal access tokens 生成。最小授权范围即可读取文件结构。
        </p>
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

interface FormState {
  token: string
}

const form = reactive<FormState>({ token: '' })
const configured = ref(false)
const tokenAlreadyStored = ref(false)
const saving = ref(false)
const message = ref('')
const messageOk = ref(true)

const endpoint = () => `${getApiBasePath()}/api/integrations/figma`

const tokenPlaceholder = computed(() =>
  tokenAlreadyStored.value ? '已保存（留空表示沿用原值）' : '请输入 Figma Token',
)

function applyConfig(data: any) {
  configured.value = !!data?.configured
  tokenAlreadyStored.value = !!data?.configured
  form.token = ''
}

async function loadConfig() {
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

async function onSubmit() {
  // 已配置 (tokenAlreadyStored) 时允许"留空沿用原值": 表单空 = 用户没改 token, 直接交给后端 reuse;
  // 但纯空白字符串既不是"空"也不是有效 token, 应在前端拒绝避免后端 trim 后 no-op 还显示"已保存".
  const trimmed = form.token.trim()
  if (!trimmed) {
    if (!tokenAlreadyStored.value) {
      message.value = '请填写 Token'
      messageOk.value = false
      return
    }
    if (form.token !== '') {
      message.value = 'Token 不可仅为空白字符'
      messageOk.value = false
      return
    }
  }

  saving.value = true
  message.value = ''
  try {
    const res = await fetch(endpoint(), {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: form.token }),
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
    form.token = ''
    configured.value = false
    tokenAlreadyStored.value = false
    message.value = '已清除'
    messageOk.value = true
  } catch (e: any) {
    message.value = `清除失败: ${e?.message ?? e}`
    messageOk.value = false
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>
