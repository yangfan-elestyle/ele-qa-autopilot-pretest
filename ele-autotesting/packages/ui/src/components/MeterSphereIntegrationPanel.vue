<template>
  <div class="space-y-5">
    <div class="ds-integration-intro">
      <h3 class="ds-modal-section-title">
        <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
        MeterSphere 访问凭证
      </h3>
      <p class="ds-integration-intro-text">
        用于联动 MeterSphere 拉取项目 / 模块 / 用例。AK 与 SK 以登录账号维度保存在云端 D1（不写入本地浏览器），跨设备一致；已配置后留空即可保留原值。
      </p>
    </div>

    <form @submit.prevent="onSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium theme-manager-text mb-1.5">Access Key (AK)</label>
        <input
          v-model="form.ak"
          type="password"
          autocomplete="off"
          spellcheck="false"
          class="theme-manager-input"
          :placeholder="akPlaceholder"
        />
      </div>
      <div>
        <label class="block text-sm font-medium theme-manager-text mb-1.5">Secret Key (SK)</label>
        <input
          v-model="form.sk"
          type="password"
          autocomplete="off"
          spellcheck="false"
          class="theme-manager-input"
          :placeholder="skPlaceholder"
        />
        <p class="text-xs theme-manager-text-secondary mt-1.5">
          在 MeterSphere → 个人信息 → API Keys 中生成；填写后即可在「联动」面板中拉取项目与用例。
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
  ak: string
  sk: string
}

const form = reactive<FormState>({ ak: '', sk: '' })
const configured = ref(false)
const secretsAlreadyStored = ref(false)
const saving = ref(false)
const message = ref('')
const messageOk = ref(true)

const endpoint = () => `${getApiBasePath()}/api/integrations/metersphere`

const akPlaceholder = computed(() =>
  secretsAlreadyStored.value ? '已保存（留空表示沿用原值）' : 'AK (16 字符)',
)
const skPlaceholder = computed(() =>
  secretsAlreadyStored.value ? '已保存（留空表示沿用原值）' : 'SK (16/24/32 字符)',
)

function applyConfig(data: any) {
  configured.value = !!data?.configured
  secretsAlreadyStored.value = !!data?.configured
  form.ak = ''
  form.sk = ''
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

async function migrateLegacyLocalSecrets(): Promise<boolean> {
  // 一次性迁移: 早期版本把 AK/SK 存在 useBrowserCache(metersphere.ak/sk) -> localStorage.
  // 若云端未配置且本地两项齐全, 推到 D1 后删本地, 升级用户无需重填.
  if (typeof window === 'undefined') return false
  const LEGACY_AK = 'metersphere.ak'
  const LEGACY_SK = 'metersphere.sk'
  const rawAk = window.localStorage.getItem(LEGACY_AK) ?? ''
  const rawSk = window.localStorage.getItem(LEGACY_SK) ?? ''
  // useBrowserCache 字符串值是直接 String(v) 写入, 但泛型为 string 默认就是裸字符串;
  // 早期可能存在 JSON 包裹的旧值, 双向兼容.
  const unwrap = (v: string) => {
    try {
      const parsed = JSON.parse(v)
      return typeof parsed === 'string' ? parsed : v
    } catch {
      return v
    }
  }
  const ak = unwrap(rawAk).trim()
  const sk = unwrap(rawSk).trim()
  if (!ak || !sk) return false
  try {
    const res = await fetch(endpoint(), {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ak, sk }),
    })
    if (!res.ok) return false
    window.localStorage.removeItem(LEGACY_AK)
    window.localStorage.removeItem(LEGACY_SK)
    return true
  } catch {
    return false
  }
}

async function onSubmit() {
  if (!secretsAlreadyStored.value) {
    if (!form.ak.trim()) {
      message.value = '请填写 AK'
      messageOk.value = false
      return
    }
    if (!form.sk.trim()) {
      message.value = '请填写 SK'
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
      body: JSON.stringify({ ak: form.ak, sk: form.sk }),
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
    form.ak = ''
    form.sk = ''
    configured.value = false
    secretsAlreadyStored.value = false
    message.value = '已清除'
    messageOk.value = true
  } catch (e: any) {
    message.value = `清除失败: ${e?.message ?? e}`
    messageOk.value = false
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadConfig()
  if (!configured.value) {
    const migrated = await migrateLegacyLocalSecrets()
    if (migrated) {
      message.value = '已将浏览器旧 AK/SK 迁移到云端'
      messageOk.value = true
      await loadConfig()
    }
  } else if (typeof window !== 'undefined') {
    // 已云端配置, 清理浏览器旧 AK/SK, 防止两端不一致.
    window.localStorage.removeItem('metersphere.ak')
    window.localStorage.removeItem('metersphere.sk')
  }
})
</script>
