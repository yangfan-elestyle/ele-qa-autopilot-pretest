<template>
  <div v-if="isInitializing" class="loading-container">
    <div class="spinner"></div>
    <p>正在初始化...</p>
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
        <ActionButtonUI icon="🏠" text="返回首页" @click="goHome" />
        <ThemeToggleUI />
        <ActionButtonUI icon="📝" text="功能提示词" @click="openTemplateManager" />
        <ActionButtonUI icon="📜" text="上下文" @click="promptHistory.showHistory = true" />
        <ActionButtonUI icon="⚙️" text="模型管理" @click="modelManager.showConfig = true" />
        <ActionButtonUI icon="💾" text="数据管理" @click="showDataManager = true" />
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
                @config="modelManager.showConfig = true"
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
        @showConfig="modelManager.showConfig = true"
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

    <!-- ToastUI已在MainLayoutUI中包含，无需重复渲染 -->
  </template>
</template>

<script setup lang="ts">
import { ref, watch, provide, computed, shallowRef, toRef } from 'vue'

import {
  // UI Components
  MainLayoutUI,
  ThemeToggleUI,
  ActionButtonUI,
  ModelManagerUI,
  TemplateManagerUI,
  HistoryDrawerUI,
  DataManagerUI,
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

// 返回 gateway 首页 (跳出 /autotest/ SPA base 到根入口)
const goHome = () => {
  window.location.href = '/'
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
  font-size: 1.2rem;
  color: var(--text-color);
  background-color: var(--background-color);
}

.loading-container.error {
  color: #f56c6c;
}

.spinner {
  border: 4px solid rgba(128, 128, 128, 0.2);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: var(--primary-color);
  animation: spin 1s ease infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
