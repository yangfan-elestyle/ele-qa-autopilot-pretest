<template>
  <div class="space-y-5">
    <div class="ds-integration-intro">
      <h3 class="ds-modal-section-title">
        <span class="ds-modal-section-title-dot" aria-hidden="true"></span>
        送至 Autopilot · prompt 模板
      </h3>
      <p class="ds-integration-intro-text">
        在「AutoTest 用例」与「MeterSphere」tab 的「送至 Autopilot」弹窗里, 这里配置的模板会作为 preset 按钮一键填入 prompt 输入框. 已按账号同步到云端 (D1), 多端共用.
      </p>
    </div>

    <div class="flex items-center justify-between gap-2">
      <div class="text-sm theme-manager-text-secondary">
        共 <strong class="theme-manager-text">{{ list.length }}</strong> 个模板
      </div>
      <div class="flex items-center gap-2">
        <button class="ds-pill-btn" type="button" @click="onReset">恢复默认</button>
        <button class="ds-pill-btn ds-pill-btn--primary" type="button" @click="onAdd">+ 新建</button>
      </div>
    </div>

    <div v-if="list.length === 0" class="theme-manager-card p-6 text-center space-y-3">
      <p class="theme-manager-text-secondary">尚无模板. 弹窗里的 preset 按钮区会显示空态提示, 但 prompt 仍可手动编辑.</p>
      <button class="ds-pill-btn ds-pill-btn--primary" type="button" @click="onReset">一键恢复默认 ({{ DEFAULT_PROMPT_PRESETS.length }} 个)</button>
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
            placeholder="名称 (按钮显示文本, 如 '传话人 (原文)')"
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
          placeholder="prompt 模板正文. 弹窗会自动在尾部拼接聚合后的【...】用例文本."
        ></textarea>
      </li>
    </ul>
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

const { presets, setPresets, resetToDefaults } = usePromptPresets()
const toast = useToast()

const list = ref<PromptPreset[]>(deepCopy(presets.value))

let writingBack = false

watch(
  list,
  (next) => {
    writingBack = true
    setPresets(next)
    Promise.resolve().then(() => { writingBack = false })
  },
  { deep: true },
)

watch(presets, (next) => {
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

function onReset() {
  resetToDefaults()
  list.value = deepCopy(DEFAULT_PROMPT_PRESETS)
  toast.success(`已恢复默认 ${DEFAULT_PROMPT_PRESETS.length} 个模板`)
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
