<template>
  <div class="space-y-5">
    <div class="ds-integration-intro">
      <h3 class="ds-modal-section-title">
        <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
        模块配置
      </h3>
      <p class="ds-integration-intro-text">
        预先配置好可能用到的业务模块路径 (例: <code>/dashboard/end</code>)。「开始生成」时可对模块进行多选, 选中的模块路径会追加到 LLM 提示词末尾, 引导模型只产出对应模块的测试用例。
      </p>
    </div>

    <form @submit.prevent="onAdd" class="space-y-3">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div class="flex-1 min-w-0">
          <label class="block text-sm font-medium theme-manager-text mb-1.5">
            模块路径
          </label>
          <input
            v-model="form.path"
            type="text"
            autocomplete="off"
            spellcheck="false"
            class="theme-manager-input"
            placeholder="/a/b"
          />
        </div>
        <div class="flex-1 min-w-0">
          <label class="block text-sm font-medium theme-manager-text mb-1.5">
            备注 <span class="theme-manager-text-secondary text-xs">(可选)</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            autocomplete="off"
            spellcheck="false"
            class="theme-manager-input"
            placeholder="便于识别的简短名称"
          />
        </div>
        <button
          type="submit"
          class="ds-pill-btn ds-pill-btn--primary self-end"
          :disabled="saving || !form.path.trim()"
        >
          {{ saving ? '添加中…' : '添加' }}
        </button>
      </div>
      <p v-if="message" class="text-xs" :class="messageOk ? 'theme-manager-text-secondary' : 'text-red-500'">
        {{ message }}
      </p>
    </form>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="ds-modal-section-title">
          <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
          已配置模块
          <span class="ds-chip ds-chip-neutral ds-text-mono ml-1">{{ modules.length }}</span>
        </h4>
        <button
          type="button"
          class="ds-pill-btn"
          :disabled="loading"
          @click="loadModules"
        >
          {{ loading ? '刷新中…' : '刷新' }}
        </button>
      </div>

      <div v-if="modules.length === 0" class="text-sm theme-manager-text-secondary py-6 text-center">
        {{ loading ? '加载中…' : '暂无模块, 添加一条试试' }}
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="m in modules"
          :key="m.id"
          class="flex items-center justify-between gap-3 p-3 rounded-lg border theme-manager-card theme-manager-border"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <code class="ds-text-mono text-sm theme-manager-text break-all">{{ m.path }}</code>
              <span v-if="m.name" class="ds-chip ds-chip-neutral ds-text-mono">{{ m.name }}</span>
            </div>
          </div>
          <button
            type="button"
            class="ds-pill-btn ds-pill-btn--danger"
            :disabled="deletingId === m.id"
            @click="onDelete(m)"
          >
            {{ deletingId === m.id ? '删除中…' : '删除' }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getApiBasePath } from '@prompt-optimizer/core'

interface ModuleRow {
  id: string
  path: string
  name: string | null
  created_at: number
  updated_at: number
}

const endpoint = () => `${getApiBasePath()}/api/modules`

const form = reactive<{ path: string; name: string }>({ path: '', name: '' })
const modules = ref<ModuleRow[]>([])
const loading = ref(false)
const saving = ref(false)
const deletingId = ref<string | null>(null)
const message = ref('')
const messageOk = ref(true)

async function loadModules() {
  loading.value = true
  try {
    const res = await fetch(endpoint(), { credentials: 'include' })
    if (!res.ok) {
      message.value = `加载失败: HTTP ${res.status}`
      messageOk.value = false
      return
    }
    const data = (await res.json()) as { modules?: ModuleRow[] }
    modules.value = Array.isArray(data.modules) ? data.modules : []
  } catch (e: any) {
    message.value = `加载失败: ${e?.message ?? e}`
    messageOk.value = false
  } finally {
    loading.value = false
  }
}

async function onAdd() {
  const path = form.path.trim()
  if (!path) {
    message.value = '请填写模块路径'
    messageOk.value = false
    return
  }
  saving.value = true
  message.value = ''
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path, name: form.name.trim() }),
    })
    if (!res.ok) {
      const detail = (await res.json().catch(() => ({}))) as { error?: string }
      message.value = `添加失败: ${detail.error ?? `HTTP ${res.status}`}`
      messageOk.value = false
      return
    }
    form.path = ''
    form.name = ''
    message.value = '已添加'
    messageOk.value = true
    await loadModules()
  } catch (e: any) {
    message.value = `添加失败: ${e?.message ?? e}`
    messageOk.value = false
  } finally {
    saving.value = false
  }
}

async function onDelete(m: ModuleRow) {
  if (!confirm(`确定删除模块 ${m.path}? 此操作不可恢复.`)) return
  deletingId.value = m.id
  message.value = ''
  try {
    const res = await fetch(`${endpoint()}/${encodeURIComponent(m.id)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      const detail = (await res.json().catch(() => ({}))) as { error?: string }
      message.value = `删除失败: ${detail.error ?? `HTTP ${res.status}`}`
      messageOk.value = false
      return
    }
    message.value = '已删除'
    messageOk.value = true
    await loadModules()
  } catch (e: any) {
    message.value = `删除失败: ${e?.message ?? e}`
    messageOk.value = false
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  loadModules()
})
</script>
