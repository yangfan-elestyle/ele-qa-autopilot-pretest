<template>
  <div v-if="isInitializing" class="boot-skeleton" aria-hidden="true">
    <header class="boot-header">
      <div class="boot-brand">
        <span class="boot-brand-mark"></span>
        <span class="boot-bar w-32"></span>
      </div>
      <div class="boot-actions">
        <span class="boot-bar w-20 boot-action-pill"></span>
        <span class="boot-bar w-20 boot-action-pill"></span>
        <span class="boot-bar w-20 boot-action-pill"></span>
        <span class="boot-bar w-20 boot-action-pill"></span>
      </div>
    </header>
    <main class="boot-main">
      <section class="boot-card">
        <div class="boot-card-head">
          <span class="boot-bar w-24"></span>
          <span class="boot-bar w-40 boot-segment"></span>
        </div>
        <div class="boot-bar boot-textarea"></div>
        <div class="boot-card-footer">
          <span class="boot-bar w-40"></span>
          <span class="boot-bar w-40"></span>
          <span class="boot-bar w-32 boot-primary"></span>
        </div>
      </section>
      <section class="boot-card">
        <div class="boot-card-head">
          <span class="boot-bar w-24"></span>
          <span class="boot-bar w-28 boot-segment"></span>
        </div>
        <div class="boot-bar boot-textarea"></div>
        <div class="boot-status">
          <span class="boot-dot"></span>
          <span>正在加载 AutoTest 工作台…</span>
        </div>
      </section>
    </main>
  </div>
  <div v-else-if="!services" class="loading-container error">
    <p>应用初始化失败，请刷新或联系支持</p>
  </div>
  <template v-if="isReady">
    <MainLayoutUI>
      <!-- Title Slot -->
      <template #title>
        QA AutoPilot · AutoTest
      </template>

      <!-- Actions Slot -->
      <template #actions>
        <ActionButtonUI text="联动" @click="showDataLinkage = true">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </template>
        </ActionButtonUI>
        <ActionButtonUI text="模板" @click="openTemplateManager">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </template>
        </ActionButtonUI>
        <ActionButtonUI text="历史" @click="promptHistory.showHistory = true">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l4 2" />
            </svg>
          </template>
        </ActionButtonUI>

        <span class="ds-vrule hidden sm:inline-block" aria-hidden="true"></span>

        <ActionButtonUI text="集成中心" @click="modelManager.showConfig = true">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </template>
        </ActionButtonUI>
        <ActionButtonUI text="数据" @click="showDataManager = true">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14a9 3 0 0 0 18 0V5" />
              <path d="M3 12a9 3 0 0 0 18 0" />
            </svg>
          </template>
        </ActionButtonUI>
      </template>

      <!-- Main Content -->
      <ContentCardUI class="flex-1 min-w-0 flex flex-col">
        <div class="flex-none">
          <InputPanelUI
            v-model="optimizer.prompt"
            :label="promptInputLabel"
            :placeholder="promptInputPlaceholder"
            model-label="优化模型"
            template-label="优化模版"
            button-text="开始优化 →"
            loading-text="加载中..."
            :loading="optimizer.isOptimizing"
            :disabled="optimizer.isOptimizing"
            :optimization-mode="selectedOptimizationMode"
            :contextConfig="contextConfig"
            :optimized-prompt="optimizer.optimizedPrompt"
            @submit="handleIteratePrompt"
            @update:context-config="contextConfig = $event"
          >
            <template #optimization-mode-selector>
              <OptimizationModeSelectorUI v-model="selectedOptimizationMode" @change="handleOptimizationModeChange" />
            </template>
            <template #model-select>
              <ModelSelectUI
                :modelValue="modelManager.selectedOptimizeModel"
                @update:modelValue="modelManager.selectedOptimizeModel = $event"
                :disabled="optimizer.isOptimizing"
              />
            </template>
            <template #template-select>
              <template v-if="services && services.templateManager">
                <TemplateSelectUI
                  ref="templateSelectRef"
                  v-model="optimizer.selectedMainTemplate"
                  :optimization-mode="selectedOptimizationMode"
                  @manage="openTemplateManager"
                />
              </template>
              <div v-else class="p-2 text-sm theme-placeholder">
                模板加载中...
              </div>
            </template>
          </InputPanelUI>
        </div>
        <div class="flex-1 min-h-0">
          <template v-if="services && services.templateManager">
            <PromptPanelUI
              ref="promptPanelRef"
              v-model:optimized-prompt="optimizer.optimizedPrompt"
              v-model:iteration-template="optimizer.selectedIterationTemplate"
              :reasoning="optimizer.optimizedReasoning"
              :original-prompt="optimizer.prompt"
              :is-optimizing="optimizer.isOptimizing"
              :is-iterating="optimizer.isIterating"
              :versions="optimizer.currentVersions"
              :current-version-id="optimizer.currentVersionId"
              :optimization-mode="selectedOptimizationMode"
              @iterate="handleIteratePrompt"
              @openTemplateManager="openTemplateManager"
              @switchVersion="handleSwitchVersion"
            />
          </template>
          <div v-else class="p-4 text-center theme-placeholder">
            提示词加载中...
          </div>
        </div>
      </ContentCardUI>

      <TestPanelUI
        v-show="selectedOptimizationMode !== 'context'"
        class="flex-1 min-w-0 flex flex-col"
        :prompt-service="promptService"
        :optimized-prompt="optimizer.optimizedPrompt"
        :original-prompt="optimizer.prompt"
        :services="services"
        :history="promptHistory.history"
        v-model="modelManager.selectedTestModel"
      />
    </MainLayoutUI>

    <!-- Modals and Drawers that are conditionally rendered -->
    <ModelManagerUI v-if="isReady" v-model:show="modelManager.showConfig" />
    <TemplateManagerUI
      v-if="isReady"
      v-model:show="templateManagerState.showTemplates"
      @close="() => templateManagerState.handleTemplateManagerClose(() => templateSelectRef?.refresh?.())"
    />
    <HistoryDrawerUI
      v-if="isReady"
      v-model:show="promptHistory.showHistory"
      :history="promptHistory.history"
      @reuse="handleHistoryReuse"
      @clear="promptHistory.handleClearHistory"
      @deleteChain="promptHistory.handleDeleteChain"
    />
    <DataManagerUI v-if="isReady" v-model:show="showDataManager" @imported="handleDataImported" />
    <DataLinkagePanelUI v-if="isReady" v-model:show="showDataLinkage" />

    <!-- ToastUI已在MainLayoutUI中包含，无需重复渲染 -->
  </template>
</template>

<script setup lang="ts">
import { ref, watch, provide, computed, shallowRef, toRef } from 'vue'

import {
  // UI Components
  MainLayoutUI,
  ActionButtonUI,
  ModelManagerUI,
  TemplateManagerUI,
  HistoryDrawerUI,
  DataManagerUI,
  DataLinkagePanelUI,
  InputPanelUI,
  PromptPanelUI,
  OptimizationModeSelectorUI,
  ModelSelectUI,
  TemplateSelectUI,
  ContentCardUI,
  TestPanelUI,

  // Composables
  usePromptOptimizer,
  useToast,
  useModelManager,
  useTemplateManager,
  useAppInitializer,
  usePromptHistory,

  // Types from UI package
  type OptimizationMode,
  ContextConfig,
} from '@prompt-optimizer/ui'
import type { IPromptService } from '@prompt-optimizer/core'

// 1. 基础 composables
const toast = useToast()

// 2. 初始化应用服务
// SPA 生产挂载在 /autotest/ 子路径下 (vite base), 远端存储 API 必须带同样前缀,
// 否则 gateway 把请求当成 /api/* 默认转给 AUTOPILOT, 命中 404 (sync 路由在 AUTOTEST).
const apiBase = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '')
const { services, isInitializing, error } = useAppInitializer(apiBase)

// 3. 向子组件提供服务
provide('services', services)
provide('toast', toast)

// 5. 控制主UI渲染的标志
const isReady = computed(() => services.value !== null && !isInitializing.value)

// 6. 创建所有必要的引用
const promptService = shallowRef<IPromptService | null>(null)
const selectedOptimizationMode = ref<OptimizationMode>('context')
const showDataManager = ref(false)
const showDataLinkage = ref(false)
const templateSelectRef = ref<{ refresh?: () => void } | null>(null)
const promptPanelRef = ref<{
  refreshIterateTemplateSelect?: () => void
} | null>(null)

// 提示词类型数据
const contextConfig = ref<ContextConfig>({
  contentType: 'prompt_plaintext',
  contentMark: '',
  contents: '',
})

// 6. 在顶层调用所有 Composables

// 模型管理器
const modelManager = useModelManager(services as any)

// 提示词优化器
const optimizer = usePromptOptimizer(
  services as any,
  contextConfig,
  selectedOptimizationMode,
  toRef(modelManager, 'selectedOptimizeModel'),
  toRef(modelManager, 'selectedTestModel'),
)

// 提示词历史
const promptHistory = usePromptHistory(
  services as any,
  toRef(optimizer, 'prompt') as any,
  toRef(optimizer, 'optimizedPrompt') as any,
  toRef(optimizer, 'currentChainId') as any,
  toRef(optimizer, 'currentVersions') as any,
  toRef(optimizer, 'currentVersionId') as any,
)

// 模板管理器
const templateManagerState = useTemplateManager(services as any, {
  selectedMainTemplate: toRef(optimizer, 'selectedMainTemplate'),
})

// 7. 监听服务初始化
watch(services, (newServices) => {
  if (!newServices) return

  // 设置服务引用
  promptService.value = newServices.promptService

  console.log('All services and composables initialized.')
})

// 8. 处理数据导入成功后的刷新
const handleDataImported = () => {
  console.log('[App] 数据导入成功，即将刷新页面以应用所有更改...')

  // 显示成功提示，然后刷新页面
  toast.success('数据导入成功，页面将刷新以应用所有更改')

  // 延迟一点时间让用户看到成功提示，然后刷新页面
  setTimeout(() => {
    window.location.reload()
  }, 1500)
}

// 处理迭代提示词
const handleIteratePrompt = (payload?: any) => {
  optimizer.handleIteratePrompt(payload)
}

// 处理切换版本
const handleSwitchVersion = (versionId: any) => {
  optimizer.handleSwitchVersion(versionId)
}

// 打开模板管理器
const openTemplateManager = () => {
  templateManagerState.showTemplates = true
}

// 处理优化模式变更
const handleOptimizationModeChange = (mode: OptimizationMode) => {
  selectedOptimizationMode.value = mode
}

// 处理历史记录使用 - 智能模式切换
const handleHistoryReuse = async (context: { record: any; chainId: string; rootPrompt: string; chain: any }) => {
  const { chain } = context

  // 根据链条的根记录类型确定应该切换到的优化模式
  let targetMode: OptimizationMode
  if (chain.rootRecord.type === 'optimize') {
    targetMode = 'context'
  } else if (chain.rootRecord.type === 'userOptimize') {
    targetMode = 'verify'
  } else {
    // 兜底：从根记录的 metadata 中获取优化模式
    targetMode = chain.rootRecord.metadata?.optimizationMode || 'context'
  }

  // 如果目标模式与当前模式不同，自动切换
  if (targetMode !== selectedOptimizationMode.value) {
    selectedOptimizationMode.value = targetMode
    toast.info(
      `已自动切换到${targetMode === 'context' ? '上下文制作' : '内容生成'}提示词优化模式`,
    )
  }

  // 恢复提示词类型数据（仅在 system mode 时）
  if (targetMode === 'context' && (chain.rootRecord as any).contentType) {
    contextConfig.value = {
      contentType: (chain.rootRecord as any).contentType,
      contentMark: (chain.rootRecord as any).contentMark || '',
      contents: (chain.rootRecord as any).contents || '',
    }
  }

  // 调用原有的历史记录处理逻辑
  await promptHistory.handleSelectHistory(context)
}

// 提示词输入标签
const promptInputLabel = computed(() => {
  return selectedOptimizationMode.value === 'context' ? '上下文提示词' : '内容生成提示词'
})

// 提示词输入占位符
const promptInputPlaceholder = computed(() => {
  return selectedOptimizationMode.value === 'context' ? '请输入需要优化的上下文提示词...' : '请输入需要优化的内容生成提示词...'
})
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 14px;
  color: var(--ds-text-secondary);
  background: var(--ds-surface-canvas);
  letter-spacing: 0.01em;
}

.loading-container.error {
  color: var(--ds-danger);
}

/* === Boot skeleton === */
.boot-skeleton {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--ds-surface-canvas);
}

.boot-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: color-mix(in srgb, var(--ds-surface-elevated) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ds-border-soft);
}

.boot-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.boot-brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--ds-brand-500) 0%, var(--ds-brand-700) 100%);
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.32);
  opacity: 0.9;
}

.boot-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.boot-action-pill {
  height: 32px;
  border-radius: 8px;
}

.boot-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  min-height: 0;
}

@media (max-width: 1024px) {
  .boot-main {
    grid-template-columns: 1fr;
  }
}

.boot-card {
  background: var(--ds-surface-elevated);
  border: 1px solid var(--ds-border-soft);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-sm);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.boot-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.boot-segment {
  height: 28px;
  border-radius: 999px;
}

.boot-textarea {
  flex: 1;
  min-height: 180px;
  border-radius: 10px;
}

.boot-card-footer {
  display: flex;
  align-items: center;
  gap: 12px;
}

.boot-primary {
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--ds-brand-500), var(--ds-brand-700)) !important;
  opacity: 0.7;
  animation: none !important;
}

.boot-bar {
  display: inline-block;
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--ds-surface-subtle) 0%,
    var(--ds-surface-muted) 50%,
    var(--ds-surface-subtle) 100%
  );
  background-size: 200% 100%;
  animation: boot-shimmer 1.6s ease-in-out infinite;
}

.boot-bar.w-20 { width: 80px; }
.boot-bar.w-24 { width: 96px; }
.boot-bar.w-28 { width: 112px; }
.boot-bar.w-32 { width: 128px; }
.boot-bar.w-40 { width: 160px; }

.boot-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ds-text-tertiary);
  margin-top: 2px;
}

.boot-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--ds-brand-500);
  box-shadow: 0 0 0 0 var(--ds-brand-500);
  animation: boot-pulse 1.8s ease-out infinite;
}

@keyframes boot-shimmer {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@keyframes boot-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--ds-brand-500) 50%, transparent);
  }
  70% {
    box-shadow: 0 0 0 10px color-mix(in srgb, var(--ds-brand-500) 0%, transparent);
  }
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--ds-brand-500) 0%, transparent);
  }
}
</style>
