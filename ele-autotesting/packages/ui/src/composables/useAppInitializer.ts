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
 * 身份注入由 gateway 统一收口: 员工经 gateway 访问时输入公司邮箱, gateway 自签明文 cookie,
 * 转发下游时注入 `X-Auth-User-Email` header 到 ele-autotesting server; 后端 `resolveOwner`
 * (packages/server/src/middleware/auth.ts) 读该 header 取 email → ownerId=`google:<email>`.
 * 浏览器侧无需注入任何业务鉴权头 (gateway cookie 会自动携带).
 *
 * 本地 dev (直连后端, 不经 gateway): 后端读 `DEV_FALLBACK_EMAIL` env 兜底.
 */

/**
 * 迁移标志 (localStorage key) 用的占位 owner. 浏览器侧拿不到真正的 email
 * (后端才从 `X-Auth-User-Email` 解析), 用固定字符串 `cf-access` 作占位即可.
 * 注意: 这个字符串是稳定占位符, 勿改 (改了会让存量用户重新迁移一次本地 Dexie → 云端).
 * 同浏览器只对首次登录的账号迁移一次, 后续切账号不重迁 (避免把 A 的本地残留误送到 B 的云端配置).
 */
const MIGRATION_OWNER_KEY = 'cf-access'

function migrationFlagKey(ownerKey: string): string {
  return `app:remote-migrated:${ownerKey}`
}

/**
 * 单次 batchUpdate 的最大条目数. 服务端硬限 500
 * (packages/server/src/routes/sync.ts), 这里留 100 个余量.
 */
const MIGRATE_BATCH_SIZE = 400

/**
 * 一次性把本地 Dexie 中的数据上传到远端存储 (经后端 /api/sync).
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
async function migrateDexieToRemoteIfNeeded(remote: RemoteStorageProvider, ownerKey: string): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return

  const flagKey = migrationFlagKey(ownerKey)
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
  // 身份头由 gateway 注入 (`X-Auth-User-Email`, gateway cookie 自动携带), 浏览器不必显式注入.
  // setAuthHeaders 仍清一遍状态, 避免 HMR / 测试残留旧头.
  setAuthHeaders({})

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
      // 在Web环境中，所有数据走远程存储 (经后端 /api/sync).
      // 身份: 经 gateway 时由 gateway 注入 `X-Auth-User-Email`, 后端 resolveOwner
      // 取 email → ownerId=`google:<email>`. 浏览器侧 fetch 不显式带任何业务鉴权头.
      const remoteProvider = StorageFactory.createRemote(normalizedBase, () => ({}))

      // 一次性把本地 Dexie 中的数据迁移到云端 (若云端为空)
      await migrateDexieToRemoteIfNeeded(remoteProvider, MIGRATION_OWNER_KEY)

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

      // 创建严格符合接口的适配器 (含 IImportExportable 的 4 个方法).
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
        exportData: () => modelManagerInstance.exportData(),
        importData: (data) => modelManagerInstance.importData(data),
        getDataType: () => modelManagerInstance.getDataType(),
        validateData: (data) => modelManagerInstance.validateData(data),
      }

      const templateManagerAdapter: ITemplateManager = {
        getTemplate: (id) => templateManagerInstance.getTemplate(id),
        saveTemplate: (template) => templateManagerInstance.saveTemplate(template),
        deleteTemplate: (id) => templateManagerInstance.deleteTemplate(id),
        listTemplates: () => templateManagerInstance.listTemplates(),
        exportTemplate: (id) => templateManagerInstance.exportTemplate(id),
        importTemplate: (json) => templateManagerInstance.importTemplate(json),
        listTemplatesByType: (type) => templateManagerInstance.listTemplatesByType(type),
        exportData: () => templateManagerInstance.exportData(),
        importData: (data) => templateManagerInstance.importData(data),
        getDataType: () => templateManagerInstance.getDataType(),
        validateData: (data) => templateManagerInstance.validateData(data),
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
        exportData: () => historyManagerInstance.exportData(),
        importData: (data) => historyManagerInstance.importData(data),
        getDataType: () => historyManagerInstance.getDataType(),
        validateData: (data) => historyManagerInstance.validateData(data),
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
