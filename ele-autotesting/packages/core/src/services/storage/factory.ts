import { IStorageProvider } from './types'
import { LocalStorageProvider } from './localStorageProvider'
import { DexieStorageProvider } from './dexieStorageProvider'
import { MemoryStorageProvider } from './memoryStorageProvider'
import { RemoteStorageProvider, type AuthHeaderProvider } from './remoteStorageProvider'

export type StorageType = 'localStorage' | 'dexie' | 'memory' | 'remote'

/**
 * 存储工厂类
 */
export class StorageFactory {
  // 单例实例缓存
  private static instances: Map<StorageType, IStorageProvider> = new Map()

  /**
   * 创建存储提供器
   * @param type 存储类型
   * @returns 存储提供器实例
   */
  static create(type: StorageType): IStorageProvider {
    if (type === 'remote') {
      throw new Error("StorageType 'remote' requires StorageFactory.createRemote(baseUrl, getAuthHeader)")
    }

    // 检查是否已有缓存实例
    if (StorageFactory.instances.has(type)) {
      return StorageFactory.instances.get(type)!
    }

    let instance: IStorageProvider
    switch (type) {
      case 'localStorage':
        instance = new LocalStorageProvider()
        break
      case 'dexie':
        instance = new DexieStorageProvider()
        break
      case 'memory':
        instance = new MemoryStorageProvider()
        break
      default:
        throw new Error(`Unsupported storage type: ${type}`)
    }

    // 缓存实例
    StorageFactory.instances.set(type, instance)
    return instance
  }

  /**
   * 创建远程存储提供器 (Cloudflare D1 via Worker REST).
   * remote 实例不缓存, 因为 baseUrl/getAuthHeader 可能因环境/登录态变化.
   */
  static createRemote(baseUrl: string, getAuthHeader: AuthHeaderProvider): RemoteStorageProvider {
    return new RemoteStorageProvider(baseUrl, getAuthHeader)
  }

  /**
   * 重置所有实例（主要用于测试）
   */
  static reset(): void {
    StorageFactory.instances.clear()

    // 重置DexieStorageProvider的迁移状态
    DexieStorageProvider.resetMigrationState()
  }

  /**
   * 获取所有支持的存储类型
   */
  static getSupportedTypes(): StorageType[] {
    const types: StorageType[] = []

    // memory 存储总是支持的
    types.push('memory')

    // 检查 localStorage 支持
    if (typeof window !== 'undefined' && window.localStorage) {
      types.push('localStorage')
    }

    // 检查 IndexedDB 支持
    if (typeof window !== 'undefined' && window.indexedDB) {
      types.push('dexie')
    }

    // remote 仅在 fetch 可用时支持
    if (typeof fetch !== 'undefined') {
      types.push('remote')
    }

    return types
  }

  /**
   * 检查特定存储类型是否支持
   */
  static isSupported(type: StorageType): boolean {
    return StorageFactory.getSupportedTypes().includes(type)
  }
}
