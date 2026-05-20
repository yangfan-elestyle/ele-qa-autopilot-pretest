import { ref, onMounted } from 'vue'
import {
  StorageFactory,
  DexieStorageProvider,
  RemoteStorageProvider,
  createModelManager,
  createTemplateManager,
  createHistoryManager,
  createDataManager,
  createLLMService,
  createPromptService,
  createCompareService,
  DataManager,
  createPreferenceService,
  setProxyBasePath,
  setAuthHeaders,
} from '../' // 从UI包的index导入所有核心模块
import type { AppServices } from '../types/services'
import type { IModelManager, ITemplateManager, IHistoryManager, ILLMService, IPromptService, IDataManager } from '@prompt-optimizer/core'
import type { IPreferenceService } from '../types/services'

/**
 * V1 临时方案: 全部浏览器/会话共享同一个 owner, 方便端到端验证.
 *
 * 后端接到 `X-Device-Id: shared-owner-v1` 后, 数据落在 D1 的
 * owner_id = 'device:shared-owner-v1' 这一行下面.
 *
 * V2 切到 Google 登录时, 把这里换成
 *   const idToken = await getGoogleIdToken()
 *   getAuthHeader: () => ({ Authorization: `Bearer ${idToken}` })
 * 业务层无需改动, 见 packages/server/src/middleware/auth.ts 注释里的 Google 分支.
 *
 * 工具函数 `ensureDeviceId` (core/utils/deviceId.ts) 已保留, 后续需要按浏览器隔离时直接换上.
 */
const SHARED_OWNER_ID = 'shared-owner-v1'

/**
 * 迁移标志带 owner 后缀: 当 SHARED_OWNER_ID 变化 (例如切到 Google 后) 时,
 * 自动重新走一次"云端是否为空 + 本地是否有数据"判断, 避免迁移逻辑被旧标志锁死.
 */
function migrationFlagKey(ownerId: string): string {
  return `app:remote-migrated:${ownerId}`
}

/**
 * 单次 batchUpdate 的最大条目数. 服务端硬限 500
 * (packages/server/src/routes/sync.ts), 这里留 100 个余量.
 */
const MIGRATE_BATCH_SIZE = 400

/**
 * 一次性把本地 Dexie 中的数据上传到远端 D1.
 *
 * 行为:
 * - 已标记完成 → 直接跳过.
 * - 云端非空: 计算 (本地 keys ∖ 云端 keys), 只补传差集, 已存在的 key 不覆盖.
 *   这样可以在「上次迁移途中失败」的情况下下次启动继续补完, 而不是被云端非空状态
 *   永久锁死.
 * - 本地空: 直接标记完成.
 * - 写入分批 (≤ MIGRATE_BATCH_SIZE), 防止超过服务端 batch 上限.
 * - 迁移失败不抛错, 仅记录 error: 应用主体功能 (云端读写) 此时已经能工作,
 *   不应该被一次性的数据搬运失败阻塞掉整个 UI 启动.
 * - 不删除 Dexie 数据 (回滚兜底, 也方便手工导出).
 */
async function migrateDexieToRemoteIfNeeded(remote: RemoteStorageProvider, ownerId: string): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return

  const flagKey = migrationFlagKey(ownerId)
  const flag = window.localStorage.getItem(flagKey)
  if (flag) {
    console.log('[AppInitializer] 本地→远端迁移已完成, 跳过')
    return
  }

  let cloudKeys: Set<string>
  try {
    const entries = await remote.listAll()
    cloudKeys = new Set(Object.keys(entries))
  } catch (e) {
    console.warn('[AppInitializer] 拉取云端数据失败, 跳过迁移 (下次启动会重试):', e)
    return
  }

  let localData: Record<string, string> = {}
  try {
    const dexie = new DexieStorageProvider()
    localData = await dexie.exportAll()
  } catch (e) {
    console.warn('[AppInitializer] 读取本地 Dexie 失败, 跳过迁移:', e)
    return
  }

  const localKeys = Object.keys(localData)
  if (localKeys.length === 0) {
    console.log('[AppInitializer] 本地无数据, 无需迁移')
    window.localStorage.setItem(flagKey, 'local-empty')
    return
  }

  // 只上传"本地有但云端没有"的 key, 避免误覆盖云端已存在的内容.
  const pending = localKeys.filter((k) => !cloudKeys.has(k))
  if (pending.length === 0) {
    console.log('[AppInitializer] 本地数据已全部在云端, 标记完成')
    window.localStorage.setItem(flagKey, `already-in-cloud:${Date.now()}`)
    return
  }

  console.log(
    `[AppInitializer] 开始迁移本地 ${pending.length}/${localKeys.length} 项数据到云端 (批大小 ${MIGRATE_BATCH_SIZE})...`,
  )
  try {
    for (let i = 0; i < pending.length; i += MIGRATE_BATCH_SIZE) {
      const slice = pending.slice(i, i + MIGRATE_BATCH_SIZE)
      await remote.batchUpdate(
        slice.map((key) => ({ key, operation: 'set', value: localData[key] })),
      )
    }
    window.localStorage.setItem(flagKey, `migrated:${Date.now()}`)
    console.log('[AppInitializer] 迁移完成')
  } catch (e) {
    // 不写迁移标志, 下次启动会基于云端 keys 增量补传剩余项.
    // 这里 swallow 而不是 rethrow: 应用主体功能不依赖一次性迁移, 没必要因此阻塞启动.
    console.error('[AppInitializer] 迁移过程中出错 (下次启动会增量重试):', e)
  }
}

/**
 * 应用服务统一初始化器。
 * 负责根据运行环境 Web 创建和初始化所有核心服务。
 *
 * @param apiBase 远端存储 API 前缀, 应当与 SPA 挂载子路径一致 (生产 `/autotest`, dev `''`).
 *                由 web 包通过 `import.meta.env.BASE_URL` 注入 — ui 包是 lib 独立 build,
 *                自己读 BASE_URL 拿到的永远是 ui 自身的 base ('/'), 不能用.
 * @returns { services, isInitializing, error }
 */
export function useAppInitializer(apiBase: string = '') {
  // setup() 同步时机就把 SPA 子路径 (`/autotest` 或 '') 告诉 core, 让 core 内的
  // `getProxyUrl` 后续拼出带前缀的 `/autotest/{stream,http}-proxy?...` URL —
  // 否则 LLM 流式 / HTTP 代理请求被 gateway 默认转给 AUTOPILOT, 404.
  // 必须早于任何 createLLMService 调用, onMounted 内已经够早 (composable 顺序保证).
  const normalizedBase = apiBase.replace(/\/+$/, '')
  setProxyBasePath(normalizedBase)
  // 同步注册业务 API 鉴权头 (V1 SHARED_OWNER_ID): UI 组件后续 fetch `/confluence-parse` /
  // `/figma-parse` / `/image-research/analyze` / `/markdown-research` 时, 拿 getAuthHeaders()
  // 注入, 让后端 resolveOwner 中间件能识别身份并对齐 RemoteStorageProvider 的同一 owner.
  setAuthHeaders({ 'X-Device-Id': SHARED_OWNER_ID })

  const services = ref<AppServices | null>(null)
  const isInitializing = ref(true)
  const error = ref<Error | null>(null)

  onMounted(async () => {
    try {
      console.log('[AppInitializer] 开始应用初始化...')

      let modelManager: IModelManager
      let templateManager: ITemplateManager
      let historyManager: IHistoryManager
      let dataManager: IDataManager
      let llmService: ILLMService
      let promptService: IPromptService
      let preferenceService: IPreferenceService

      console.log('[AppInitializer] 检测到Web环境，初始化完整服务...')
      // 在Web环境中，所有数据走 Cloudflare D1 远程存储.
      // 身份: V1 全局共享单一 owner (方便端到端验证), V2 切 Google id_token.
      // 详见上方 SHARED_OWNER_ID 注释 + packages/server/src/middleware/auth.ts.
      const remoteProvider = StorageFactory.createRemote(normalizedBase, () => ({
        'X-Device-Id': SHARED_OWNER_ID,
      }))

      // 一次性把本地 Dexie 中的数据迁移到云端 (若云端为空)
      await migrateDexieToRemoteIfNeeded(remoteProvider, SHARED_OWNER_ID)

      const storageProvider = remoteProvider

      // 创建基于存储提供器的偏好设置服务，使用core包中的createPreferenceService
      preferenceService = createPreferenceService(storageProvider)

      // Services with no dependencies or only storage
      const modelManagerInstance = createModelManager(storageProvider)

      const templateManagerInstance = createTemplateManager(storageProvider)
      templateManager = templateManagerInstance
      console.log('[AppInitializer] TemplateManager instance in Web:', templateManager)

      // Initialize managers that depend on other managers
      const historyManagerInstance = createHistoryManager(storageProvider, modelManagerInstance)

      // Now ensure model manager with async init is ready (template manager no longer needs async init)
      console.log('[AppInitializer] 确保模型管理器初始化完成...')
      await modelManagerInstance.ensureInitialized()

      // Assign instances after they are fully initialized
      modelManager = modelManagerInstance
      templateManager = templateManagerInstance
      historyManager = historyManagerInstance

      // 创建严格符合接口的适配器
      const modelManagerAdapter: IModelManager = {
        ensureInitialized: () => modelManagerInstance.ensureInitialized(),
        isInitialized: () => modelManagerInstance.isInitialized(),
        getAllModels: () => modelManagerInstance.getAllModels(),
        getModel: (key) => modelManagerInstance.getModel(key),
        addModel: (key, config) => modelManagerInstance.addModel(key, config),
        updateModel: (id, updates) => modelManagerInstance.updateModel(id, updates),
        deleteModel: (id) => modelManagerInstance.deleteModel(id),
        enableModel: (key) => modelManagerInstance.enableModel(key),
        disableModel: (key) => modelManagerInstance.disableModel(key),
        getEnabledModels: () => modelManagerInstance.getEnabledModels(),
      }

      const templateManagerAdapter: ITemplateManager = {
        getTemplate: (id) => templateManagerInstance.getTemplate(id),
        saveTemplate: (template) => templateManagerInstance.saveTemplate(template),
        deleteTemplate: (id) => templateManagerInstance.deleteTemplate(id),
        listTemplates: () => templateManagerInstance.listTemplates(),
        exportTemplate: (id) => templateManagerInstance.exportTemplate(id),
        importTemplate: (json) => templateManagerInstance.importTemplate(json),
        listTemplatesByType: (type) => templateManagerInstance.listTemplatesByType(type),
      }

      const historyManagerAdapter: IHistoryManager = {
        getRecords: () => historyManagerInstance.getRecords(),
        getRecord: (id) => historyManagerInstance.getRecord(id),
        addRecord: (record) => historyManagerInstance.addRecord(record),
        deleteRecord: (id) => historyManagerInstance.deleteRecord(id),
        clearHistory: () => historyManagerInstance.clearHistory(),
        getIterationChain: (id) => historyManagerInstance.getIterationChain(id),
        getAllChains: () => historyManagerInstance.getAllChains(),
        getChain: (id) => historyManagerInstance.getChain(id),
        createNewChain: (record) => historyManagerInstance.createNewChain(record),
        addIteration: (params) => historyManagerInstance.addIteration(params),
        deleteChain: (id) => historyManagerInstance.deleteChain(id),
      }

      // Services that depend on initialized managers
      console.log('[AppInitializer] 创建依赖其他管理器的服务...')
      llmService = createLLMService(modelManagerInstance)
      promptService = createPromptService(modelManager, llmService, templateManager, historyManager)

      dataManager = createDataManager(modelManagerInstance, templateManagerInstance, historyManagerInstance, preferenceService)

      // 创建 CompareService（直接使用）
      const compareService = createCompareService()

      // 将所有服务实例赋值给 services.value
      services.value = {
        modelManager: modelManagerAdapter, // 使用适配器
        templateManager: templateManagerAdapter, // 使用适配器
        historyManager: historyManagerAdapter, // 使用适配器
        dataManager,
        llmService,
        promptService,
        preferenceService, // 使用从core包导入的PreferenceService
        compareService, // 直接使用
      }

      console.log('[AppInitializer] 所有服务初始化完成')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('[AppInitializer] 关键服务初始化失败:', errorMessage)
      console.error('[AppInitializer] 错误详情:', err)
      error.value = err instanceof Error ? err : new Error(String(err))
    } finally {
      isInitializing.value = false
      console.log('[AppInitializer] 应用初始化完成')
    }
  })

  return { services, isInitializing, error }
}
