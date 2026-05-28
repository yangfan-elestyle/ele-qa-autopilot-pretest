<template>
  <div class="space-y-5">
    <div class="ds-integration-intro">
      <h3 class="ds-modal-section-title">
        <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
        送至 Autopilot · prompt 模板
      </h3>
      <p class="ds-integration-intro-text">
        在「AutoTest 用例」与「MeterSphere」tab 的「送至 Autopilot」弹窗里, 这里配置的模板会作为 preset 按钮一键填入.
      </p>
    </div>

    <!-- 系统默认模板 (来自代码, 升级全员同步) -->
    <section class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm theme-manager-text">
          系统默认模板 · <strong>{{ DEFAULT_PROMPT_PRESETS.length }}</strong> 个 (只读)
        </div>
      </div>
      <ul class="space-y-2">
        <li
          v-for="d in DEFAULT_PROMPT_PRESETS"
          :key="d.key"
          class="theme-manager-card p-3 space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="theme-manager-text font-medium truncate">{{ d.label }}</div>
              <div v-if="d.tip" class="text-xs theme-manager-text-secondary truncate">{{ d.tip }}</div>
            </div>
            <button
              class="ds-pill-btn shrink-0"
              type="button"
              title="复制此模板为可编辑的自定义版本"
              @click="cloneToCustom(d)"
            >克隆为我的</button>
          </div>
          <details>
            <summary class="cursor-pointer text-xs theme-manager-text-secondary">查看模板内容 ({{ d.template.length }} chars)</summary>
            <pre class="mt-2 p-2 rounded text-xs whitespace-pre-wrap" style="background: rgba(0,0,0,0.04); font-family: ui-monospace, SFMono-Regular, Menlo, monospace">{{ d.template }}</pre>
          </details>
        </li>
      </ul>
    </section>

    <!-- 我的模板 (D1 sync, 跨设备) -->
    <section class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm theme-manager-text">
          我的模板 · <strong>{{ list.length }}</strong> 个
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="list.length > 0"
            class="ds-pill-btn"
            type="button"
            @click="onReset"
          >清空我的模板</button>
          <button class="ds-pill-btn ds-pill-btn--primary" type="button" @click="onAdd">+ 新建</button>
        </div>
      </div>

      <div v-if="list.length === 0" class="theme-manager-card p-6 text-center">
        <p class="theme-manager-text-secondary">尚无自定义模板. 弹窗里会显示上方 {{ DEFAULT_PROMPT_PRESETS.length }} 个系统默认.</p>
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="(item, idx) in list"
          :key="item.key"
          class="theme-manager-card p-4 space-y-3"
        >
          <div class="flex items-center justify-between gap-2">
            <input
              v-model="item.label"
              class="theme-manager-input flex-1"
              placeholder="名称 (按钮显示文本)"
            />
            <div class="flex items-center gap-1 shrink-0">
              <button class="ds-pill-btn" type="button" :disabled="idx === 0" @click="moveUp(idx)" title="上移">↑</button>
              <button class="ds-pill-btn" type="button" :disabled="idx === list.length - 1" @click="moveDown(idx)" title="下移">↓</button>
              <button class="ds-pill-btn ds-pill-btn--danger" type="button" @click="remove(idx)" title="删除">删除</button>
            </div>
          </div>
          <input
            v-model="item.tip"
            class="theme-manager-input"
            placeholder="悬浮提示 (鼠标 hover 在按钮上时显示, 可空)"
          />
          <textarea
            v-model="item.template"
            rows="6"
            class="theme-manager-input"
            style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; resize: vertical"
            placeholder="prompt 模板正文, 作为 appendSystemPrompt 注入 harness."
          ></textarea>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  usePromptPresets,
  DEFAULT_PROMPT_PRESETS,
  type PromptPreset,
} from '../composables/usePromptPresets'
import { useToast } from '../composables/useToast'

const { customs, resetToDefaults } = usePromptPresets()
const toast = useToast()

// list 仅持有 customs (用户可编辑). DEFAULT 通过 DEFAULT_PROMPT_PRESETS 直接渲染上方只读区.
const list = ref<PromptPreset[]>(deepCopy(customs.value))

let writingBack = false

watch(
  list,
  (next) => {
    writingBack = true
    customs.value = next
    Promise.resolve().then(() => { writingBack = false })
  },
  { deep: true },
)

watch(customs, (next) => {
  if (writingBack) return
  list.value = deepCopy(next)
})

function deepCopy(arr: PromptPreset[]): PromptPreset[] {
  return arr.map((x) => ({ ...x }))
}

function genKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8)
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function onAdd() {
  list.value = [
    ...list.value,
    { key: genKey(), label: '新模板', tip: '', template: '在这里填写 prompt 模板...' },
  ]
}

function cloneToCustom(d: PromptPreset) {
  list.value = [
    ...list.value,
    {
      key: genKey(),
      label: `${d.label} (我的副本)`,
      tip: d.tip,
      template: d.template,
    },
  ]
  toast.success(`已克隆「${d.label}」, 可在下方编辑`)
}

function onReset() {
  resetToDefaults()
  list.value = []
  toast.success('已清空我的模板')
}

function remove(idx: number) {
  list.value = list.value.filter((_, i) => i !== idx)
}

function moveUp(idx: number) {
  if (idx === 0) return
  const next = [...list.value]
  ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
  list.value = next
}

function moveDown(idx: number) {
  if (idx === list.value.length - 1) return
  const next = [...list.value]
  ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
  list.value = next
}
</script>
