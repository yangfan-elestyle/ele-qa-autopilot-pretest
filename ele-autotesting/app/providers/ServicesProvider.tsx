import { createContext, useContext, useEffect, useState } from "react";

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
  createPreferenceService,
  setProxyBasePath,
} from "~/lib";
import type {
  IModelManager,
  ITemplateManager,
  IHistoryManager,
  ILLMService,
  IPromptService,
  IDataManager,
  IPreferenceService,
  ICompareService,
} from "~/lib";

const SHARED_OWNER_ID = "shared-owner-v1";
const MIGRATE_BATCH_SIZE = 400;

function migrationFlagKey(ownerId: string): string {
  return `app:remote-migrated:${ownerId}`;
}

async function migrateDexieToRemoteIfNeeded(
  remote: RemoteStorageProvider,
  ownerId: string,
): Promise<void> {
  if (typeof window === "undefined" || !window.localStorage) return;
  const flagKey = migrationFlagKey(ownerId);
  if (window.localStorage.getItem(flagKey)) return;

  let cloudKeys: Set<string>;
  try {
    const entries = await remote.listAll();
    cloudKeys = new Set(Object.keys(entries));
  } catch (e) {
    console.warn("[Services] 拉取云端失败, 跳过迁移:", e);
    return;
  }

  let localData: Record<string, string> = {};
  try {
    const dexie = new DexieStorageProvider();
    localData = await dexie.exportAll();
  } catch (e) {
    console.warn("[Services] 读 Dexie 失败, 跳过迁移:", e);
    return;
  }

  const localKeys = Object.keys(localData);
  if (localKeys.length === 0) {
    window.localStorage.setItem(flagKey, "local-empty");
    return;
  }
  const pending = localKeys.filter((k) => !cloudKeys.has(k));
  if (pending.length === 0) {
    window.localStorage.setItem(flagKey, `already-in-cloud:${Date.now()}`);
    return;
  }

  try {
    for (let i = 0; i < pending.length; i += MIGRATE_BATCH_SIZE) {
      const slice = pending.slice(i, i + MIGRATE_BATCH_SIZE);
      await remote.batchUpdate(
        slice.map((key) => ({ key, operation: "set", value: localData[key] })),
      );
    }
    window.localStorage.setItem(flagKey, `migrated:${Date.now()}`);
  } catch (e) {
    console.error("[Services] 迁移过程出错 (下次启动会增量重试):", e);
  }
}

export interface AppServices {
  modelManager: IModelManager;
  templateManager: ITemplateManager;
  historyManager: IHistoryManager;
  dataManager: IDataManager;
  llmService: ILLMService;
  promptService: IPromptService;
  preferenceService: IPreferenceService;
  compareService: ICompareService;
  storage: RemoteStorageProvider;
}

interface ServicesContextValue {
  services: AppServices | null;
  isInitializing: boolean;
  error: Error | null;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<AppServices | null>(null);
  const [isInitializing, setInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apiBase = "/autotest";
    setProxyBasePath(apiBase);

    (async () => {
      try {
        const remote = StorageFactory.createRemote(apiBase, () => ({
          "X-Device-Id": SHARED_OWNER_ID,
        }));
        await migrateDexieToRemoteIfNeeded(remote, SHARED_OWNER_ID);
        const storage = remote;

        const preferenceService = createPreferenceService(storage);
        const modelManager = createModelManager(storage);
        const templateManager = createTemplateManager(storage);
        const historyManager = createHistoryManager(storage, modelManager);
        await modelManager.ensureInitialized();
        const llmService = createLLMService(modelManager);
        const promptService = createPromptService(modelManager, llmService, templateManager, historyManager);
        const dataManager = createDataManager(modelManager, templateManager, historyManager, preferenceService);
        const compareService = createCompareService();

        if (cancelled) return;
        setServices({
          modelManager,
          templateManager,
          historyManager,
          dataManager,
          llmService,
          promptService,
          preferenceService,
          compareService,
          storage: remote,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[Services] 关键服务初始化失败:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ServicesContext.Provider value={{ services, isInitializing, error }}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServicesContext(): ServicesContextValue {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServices must be used within ServicesProvider");
  return ctx;
}

export function useServices(): AppServices {
  const { services } = useServicesContext();
  if (!services) throw new Error("Services not yet initialized");
  return services;
}
