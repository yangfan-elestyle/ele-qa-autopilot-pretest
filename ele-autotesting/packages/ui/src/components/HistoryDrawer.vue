<template>
  <div v-if="show" class="fixed inset-0 theme-mask z-[60] flex items-center justify-center" @click="onBackdropClick">
    <div
      class="w-full max-w-4xl h-[85vh] theme-history transform transition-all duration-300 ease-in-out"
      :class="show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'"
    >
      <div class="h-full flex flex-col">
        <div class="flex-none px-4 py-3 sm:px-5 sm:py-4 theme-history-header flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="ds-drawer-title">
              <span class="ds-panel-title-dot" aria-hidden="true"></span>
              历史
            </h2>
            <span v-if="activeCount > 0" class="ds-chip ds-chip-neutral ds-text-mono">
              {{ activeCount }} 条
            </span>
            <button v-if="activeCount > 0" @click.stop="handleClearActive" class="theme-history-empty-button">
              清空
            </button>
          </div>
          <button @click.stop="close" class="ds-icon-btn-sm" title="关闭" aria-label="关闭历史抽屉">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <!-- 子 tab 切换: 抽屉内分类不同来源的"历史". 计数 chip / 清空按钮跟随激活 tab. -->
        <div class="ds-integration-tabs">
          <button
            type="button"
            class="ds-integration-tab"
            :class="{ 'is-active': activeTab === 'context' }"
            @click="activeTab = 'context'"
          >
            上下文历史
          </button>
          <button
            type="button"
            class="ds-integration-tab"
            :class="{ 'is-active': activeTab === 'autotest' }"
            @click="switchToAutotest"
          >
            AutoTest 用例历史
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 sm:p-6">
          <!-- Tab 1: 上下文历史 (原 PromptRecordChain 列表) -->
          <template v-if="activeTab === 'context'">
            <template v-if="sortedHistory && sortedHistory.length > 0">
              <div class="space-y-4">
                <div v-for="chain in sortedHistory" :key="chain.chainId" class="theme-history-card">
                  <div class="theme-history-card-header">
                    <div class="flex items-start justify-between mb-2 gap-2 flex-wrap">
                      <div class="ds-history-scene-title">
                        <span class="ds-history-scene-tag">场景</span>
                        <span
                          class="ds-history-scene-name"
                          :class="{ 'ds-history-scene-name--placeholder': !(chain.rootRecord as ContextConfig).contentMark?.trim() }"
                        >
                          {{ (chain.rootRecord as ContextConfig).contentMark?.trim() || '未命名场景' }}
                        </span>
                      </div>
                      <button
                        @click.stop="deleteChain(chain.chainId)"
                        class="ds-text-link-danger flex-none"
                        title="删除整条上下文"
                      >
                        删除
                      </button>
                    </div>
                    <div class="flex items-center gap-2 text-xs theme-manager-text-secondary mb-2 flex-wrap">
                      <span class="ds-text-mono">{{ formatDate(chain.rootRecord.timestamp) }}</span>
                      <span
                        v-if="(chain.rootRecord as ContextConfig).contentType"
                        class="ds-chip ds-chip-brand"
                        >{{ promptTypeLabel((chain.rootRecord as ContextConfig).contentType) }}</span
                      >
                    </div>
                    <div class="space-y-2">
                      <div class="text-sm theme-manager-text break-all">
                        {{ truncateText(chain.rootRecord.originalPrompt.replace(/\s+/g, ' '), 200) }}
                      </div>
                      <div
                        v-if="['prompt_url', 'prompt_figma'].includes((chain.rootRecord as ContextConfig).contentType) && (chain.rootRecord as ContextConfig).contents"
                        class="text-xs theme-manager-text-secondary"
                      >
                        <span class="font-medium">{{ promptTypeLabel((chain.rootRecord as ContextConfig).contentType) }}:</span>
                        <a
                          :href="(chain.rootRecord as ContextConfig).contents"
                          target="_blank"
                          class="ml-1 ds-text-link break-all"
                        >
                          {{ truncateText(((chain.rootRecord as ContextConfig).contents || '').replace(/\s+/g, ' '), 200) }}
                        </a>
                      </div>
                      <div
                        v-if="(chain.rootRecord as ContextConfig).contentType === 'prompt_file' && (chain.rootRecord as ContextConfig).contents"
                        class="text-xs theme-manager-text-secondary"
                      >
                        <span class="font-medium">本地文件:</span>
                        <span class="ml-1 break-all">
                          {{ truncateText(((chain.rootRecord as ContextConfig).contents || '').replace(/\s+/g, ' '), 200) }}
                        </span>
                      </div>
                      <div
                        v-if="(chain.rootRecord as ContextConfig).contentType === 'prompt_image' && (chain.rootRecord as ContextConfig).contents"
                        class="text-xs theme-manager-text-secondary"
                      >
                        <span class="font-medium">图片:</span>
                        <div class="mt-1">
                          <img
                            :src="`data:image/jpeg;base64,${(chain.rootRecord as ContextConfig).contents}`"
                            alt="Prompt image"
                            class="max-w-full h-20 object-contain border rounded"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="divide-y theme-manager-divider">
                    <div v-for="record in chain.versions.slice().reverse()" :key="record.id" class="relative">
                      <div class="ds-history-version-row" @click="toggleVersion(record.id)">
                        <div class="flex items-center gap-3 overflow-hidden">
                          <span class="ds-history-version-tag ds-text-mono">V{{ record.version }}</span>
                          <span class="text-xs theme-manager-text-secondary flex-none ds-text-mono">{{ formatDate(record.timestamp) }}</span>
                          <span class="text-xs theme-manager-text-secondary flex-none truncate">
                            {{ truncateText((record.modelName || record.modelKey).replace(/\s+/g, ' '), 80) }}
                          </span>
                          <span v-if="record.type === 'IterateRecordType' && record.iterationNote" class="text-xs theme-manager-text-secondary truncate">
                            · {{ truncateText(record.iterationNote.replace(/\s+/g, ' '), 80) }}
                          </span>
                        </div>
                        <div class="flex items-center gap-1.5 flex-none">
                          <span v-if="record.type === 'IterateRecordType'" class="ds-chip ds-chip-success">迭代</span>
                          <button @click.stop="reuse(record, chain)" class="ds-history-pill-btn ds-history-pill-btn--primary">
                            使用
                          </button>
                          <button class="ds-history-pill-btn" :aria-expanded="!!expandedVersions[record.id]">
                            {{ expandedVersions[record.id] ? '收起' : '展开' }}
                          </button>
                        </div>
                      </div>

                      <div v-show="expandedVersions[record.id]" class="p-4 theme-history-card-content space-y-3">
                        <div v-if="(record as ContextConfig).contentType || (record as ContextConfig).contentMark" class="space-y-1">
                          <div class="text-xs theme-manager-text-secondary">类型:</div>
                          <div class="flex items-center gap-2">
                            <span
                              v-if="(record as ContextConfig).contentType"
                              class="ds-chip ds-chip-brand"
                            >
                              {{ promptTypeLabel((record as ContextConfig).contentType) }}
                            </span>
                            <span v-if="(record as ContextConfig).contentMark" class="text-xs theme-manager-text-secondary">
                              {{ (record as ContextConfig).contentMark }}
                            </span>
                          </div>
                          <div
                            v-if="['prompt_url', 'prompt_figma'].includes((record as ContextConfig).contentType) && (record as ContextConfig).contents"
                            class="text-xs"
                          >
                            <span class="theme-manager-text">{{ promptTypeLabel((record as ContextConfig).contentType) }}:</span>
                            <a
                              :href="(record as ContextConfig).contents"
                              target="_blank"
                              class="ml-1 ds-text-link break-all"
                            >
                              {{ truncateText(((record as ContextConfig).contents || '').replace(/\s+/g, ' '), 200) }}
                            </a>
                          </div>
                          <div v-if="(record as ContextConfig).contentType === 'prompt_file' && (record as ContextConfig).contents" class="text-xs">
                            <span class="theme-manager-text">本地文件:</span>
                            <span class="ml-1 break-all">
                              {{ truncateText(((record as ContextConfig).contents || '').replace(/\s+/g, ' '), 200) }}
                            </span>
                          </div>
                          <div v-if="(chain.rootRecord as ContextConfig).contentType === 'prompt_image' && (record as ContextConfig).contents" class="text-xs">
                            <span class="theme-manager-text">图片:</span>
                            <div class="mt-1">
                              <img
                                :src="`data:image/jpeg;base64,${(record as ContextConfig).contents}`"
                                alt="Version image"
                                class="max-w-full h-16 object-contain border rounded"
                              />
                            </div>
                          </div>
                        </div>
                        <div v-if="record.iterationNote" class="text-xs">
                          <span class="theme-manager-text">迭代说明:</span>
                          <span class="theme-manager-text-secondary ml-1">{{ record.iterationNote }}</span>
                        </div>
                        <div class="space-y-1">
                          <div class="text-xs theme-manager-text-secondary">优化后:</div>
                          <div class="text-sm theme-manager-text break-all">
                            {{ truncateText(record.optimizedPrompt.replace(/\s+/g, ' '), 200) }}
                          </div>
                        </div>
                        <div class="flex justify-end">
                          <button @click="reuse(record, chain)" class="ds-history-pill-btn ds-history-pill-btn--primary">
                            使用此版本
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="ds-history-empty">
                <div class="ds-history-empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M12 7v5l4 2" />
                  </svg>
                </div>
                <div class="ds-history-empty-title">暂无上下文历史</div>
                <div class="ds-history-empty-hint">完成一次提示词优化后，记录会自动出现在这里</div>
              </div>
            </template>
          </template>

          <!-- Tab 2: AutoTest 用例历史 (云端同步的快照) -->
          <template v-else-if="activeTab === 'autotest'">
            <template v-if="autotestLoading && autotestList.length === 0">
              <div class="ds-history-empty">
                <div class="ds-history-empty-title">加载中…</div>
              </div>
            </template>
            <template v-else-if="autotestError">
              <div class="ds-history-empty">
                <div class="ds-history-empty-title">加载失败</div>
                <div class="ds-history-empty-hint">{{ autotestError }}</div>
                <div class="mt-3">
                  <button class="ds-history-pill-btn ds-history-pill-btn--primary" @click="refreshAutotest">重试</button>
                </div>
              </div>
            </template>
            <template v-else-if="autotestList.length === 0">
              <div class="ds-history-empty">
                <div class="ds-history-empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div class="ds-history-empty-title">暂无云端用例</div>
                <div class="ds-history-empty-hint">在生成结果区点击「同步到云」即可保存当前用例</div>
              </div>
            </template>
            <template v-else>
              <div class="space-y-3">
                <div v-for="snap in autotestList" :key="snap.id" class="theme-history-card">
                  <div class="theme-history-card-header">
                    <div class="flex items-start justify-between mb-2 gap-2 flex-wrap">
                      <div class="ds-history-scene-title">
                        <span class="ds-history-scene-tag">用例</span>
                        <span
                          class="ds-history-scene-name"
                          :class="{ 'ds-history-scene-name--placeholder': !snap.title }"
                        >
                          {{ snap.title || '未命名' }}
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5 flex-none">
                        <button
                          @click.stop="reuseAutotest(snap)"
                          class="ds-history-pill-btn ds-history-pill-btn--primary"
                          :disabled="!!reusingId"
                        >
                          {{ reusingId === snap.id ? '加载中…' : '使用' }}
                        </button>
                        <button
                          @click.stop="deleteAutotest(snap.id)"
                          class="ds-history-pill-btn"
                          :disabled="deletingId === snap.id"
                        >
                          {{ deletingId === snap.id ? '删除中…' : '删除' }}
                        </button>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 text-xs theme-manager-text-secondary mb-2 flex-wrap">
                      <span class="ds-text-mono">{{ formatDate(snap.savedAt) }}</span>
                      <span class="ds-chip ds-chip-brand">{{ snap.casesCount }} 条</span>
                      <span v-if="snap.sceneMark" class="ds-chip ds-chip-neutral">{{ truncateText(snap.sceneMark, 30) }}</span>
                      <span v-if="snap.modelName" class="ds-text-mono">{{ truncateText(snap.modelName, 40) }}</span>
                      <span class="ds-text-mono">{{ formatBytes(snap.bytes) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, onUnmounted } from 'vue'
import type { PropType } from 'vue'
import type { PromptRecord, PromptRecordChain } from '@prompt-optimizer/core'
import { useToast } from '../composables/useToast'
import {
  useAutotestCasesHistory,
  type AutotestCaseSnapshotMeta,
} from '../composables/useAutotestCasesHistory'
import type { ContextConfig } from '@/composables'

const props = defineProps({
  show: Boolean,
  history: {
    type: Array as PropType<PromptRecordChain[]>,
    default: () => [],
  },
})

const PROMPT_TYPE_LABELS: Record<string, string> = {
  prompt_plaintext: '文本',
  prompt_url: 'Confluence 链接',
  prompt_figma: 'Figma 链接',
  prompt_image: '图片',
  prompt_file: '本地文件',
}
const promptTypeLabel = (type: string | undefined) => (type ? PROMPT_TYPE_LABELS[type] ?? type : '')

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (
    e: 'reuse',
    context: {
      record: PromptRecord
      chainId: string
      rootPrompt: string
      chain: PromptRecordChain
    },
  ): void
  (e: 'clear'): void
  (e: 'deleteChain', chainId: string): void
  (
    e: 'reuseAutotestCases',
    payload: { rawText: string; meta: AutotestCaseSnapshotMeta },
  ): void
}>()

const toast = useToast()
const expandedVersions = ref<Record<string, boolean>>({})

// 子 tab 状态: 'context' = 上下文历史, 'autotest' = 云端同步的 AutoTest 用例.
type ActiveTab = 'context' | 'autotest'
const activeTab = ref<ActiveTab>('context')

const {
  list: autotestList,
  loading: autotestLoading,
  error: autotestError,
  loadList: loadAutotest,
  getSnapshot: getAutotestSnapshot,
  deleteSnapshot: deleteAutotestSnapshot,
  clearAll: clearAutotestAll,
} = useAutotestCasesHistory()

const reusingId = ref<string>('')
const deletingId = ref<string>('')

async function switchToAutotest() {
  activeTab.value = 'autotest'
  await loadAutotest()
}

async function refreshAutotest() {
  await loadAutotest(true)
}

async function reuseAutotest(snap: AutotestCaseSnapshotMeta) {
  if (reusingId.value) return
  reusingId.value = snap.id
  try {
    const full = await getAutotestSnapshot(snap.id)
    if (!full) {
      toast.error('快照已不存在')
      await loadAutotest(true)
      return
    }
    emit('reuseAutotestCases', { rawText: full.rawText, meta: snap })
    emit('update:show', false)
  } catch (e: any) {
    toast.error(`恢复失败: ${e?.message || e}`)
  } finally {
    reusingId.value = ''
  }
}

async function deleteAutotest(id: string) {
  if (deletingId.value) return
  if (!confirm('确定要删除该云端用例? 此操作不可恢复.')) return
  deletingId.value = id
  try {
    await deleteAutotestSnapshot(id)
    toast.success('已删除')
  } catch (e: any) {
    toast.error(`删除失败: ${e?.message || e}`)
  } finally {
    deletingId.value = ''
  }
}

const close = () => {
  emit('update:show', false)
}

const onBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    close()
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.show) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

const sortedHistory = computed(() => {
  return props.history
    .filter((chain) => chain.rootRecord.type === 'ContextOptimizeRecordType')
    .sort((a, b) => b.currentRecord.timestamp - a.currentRecord.timestamp)
})

const activeCount = computed(() => {
  if (activeTab.value === 'context') return sortedHistory.value.length
  return autotestList.value.length
})

const toggleVersion = (recordId: string) => {
  expandedVersions.value = {
    ...expandedVersions.value,
    [recordId]: !expandedVersions.value[recordId],
  }
}

async function handleClearActive() {
  if (activeTab.value === 'context') {
    if (confirm('确定要清空所有上下文吗？此操作不可恢复。')) {
      emit('clear')
    }
    return
  }
  if (confirm('确定要清空所有云端 AutoTest 用例吗? 此操作不可恢复.')) {
    try {
      await clearAutotestAll()
      toast.success('已清空云端用例')
    } catch (e: any) {
      toast.error(`清空失败: ${e?.message || e}`)
    }
  }
}

// 抽屉重新打开 + 当前在 autotest tab 时强制刷新, 覆盖跨设备新增的快照.
watch(
  () => props.show,
  (newShow) => {
    if (!newShow) {
      expandedVersions.value = {}
      return
    }
    if (activeTab.value === 'autotest') {
      loadAutotest(true)
    }
  },
)

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString()

const formatBytes = (bytes: number) => {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const reuse = (record: PromptRecord, chain: PromptRecordChain) => {
  emit('reuse', {
    record,
    chainId: chain.chainId,
    rootPrompt: chain.rootRecord.originalPrompt,
    chain,
  })
  emit('update:show', false)
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

const deleteChain = (chainId: string) => {
  if (confirm('确定要删除此条上下文吗？此操作不可恢复。')) {
    emit('deleteChain', chainId)
  }
}
</script>

<style scoped></style>
