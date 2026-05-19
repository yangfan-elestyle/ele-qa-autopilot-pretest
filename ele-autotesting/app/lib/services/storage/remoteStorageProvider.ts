import { IStorageProvider } from './types'
import { StorageError } from './errors'

export type AuthHeaderProvider = () => Record<string, string>

/**
 * RemoteStorageProvider — 通过 HTTP REST 把 KV 操作打到 Cloudflare Worker.
 *
 * 服务端约定 (与 packages/server/src/routes/sync.ts 一一对应):
 *   GET    {base}/api/sync/items          -> { entries: Record<string,string> }
 *   GET    {base}/api/sync/items/:key     -> { value: string | null }
 *   PUT    {base}/api/sync/items/:key     <- { value: string }
 *   DELETE {base}/api/sync/items/:key
 *   DELETE {base}/api/sync/items          (clear all for owner)
 *   POST   {base}/api/sync/batch          <- { ops: [{key, op, value?}] }
 *
 * 身份: 全部依赖 getAuthHeader() 注入 (V1 X-Device-Id, V2 Authorization).
 * 业务层只认 IStorageProvider, 不感知后端是 D1 还是 Dexie.
 */
export class RemoteStorageProvider implements IStorageProvider {
  private readonly baseUrl: string
  private readonly getAuthHeader: AuthHeaderProvider

  constructor(baseUrl: string, getAuthHeader: AuthHeaderProvider) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.getAuthHeader = getAuthHeader
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`
  }

  private async request(method: string, path: string, body?: unknown): Promise<Response> {
    const headers: Record<string, string> = {
      ...this.getAuthHeader(),
    }
    let payload: BodyInit | undefined
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
    const res = await fetch(this.url(path), { method, headers, body: payload })
    return res
  }

  private async assertOk(res: Response, op: 'read' | 'write' | 'delete' | 'clear'): Promise<void> {
    if (res.ok) return
    let detail = ''
    try {
      const data = (await res.json()) as { error?: string }
      detail = data.error || ''
    } catch {
      try {
        detail = await res.text()
      } catch {
        detail = ''
      }
    }
    throw new StorageError(`remote storage ${op} failed (${res.status}): ${detail}`, op)
  }

  async getItem(key: string): Promise<string | null> {
    const res = await this.request('GET', `/api/sync/items/${encodeURIComponent(key)}`)
    await this.assertOk(res, 'read')
    const data = (await res.json()) as { value: string | null }
    return data.value ?? null
  }

  async setItem(key: string, value: string): Promise<void> {
    const res = await this.request('PUT', `/api/sync/items/${encodeURIComponent(key)}`, { value })
    await this.assertOk(res, 'write')
  }

  async removeItem(key: string): Promise<void> {
    const res = await this.request('DELETE', `/api/sync/items/${encodeURIComponent(key)}`)
    await this.assertOk(res, 'delete')
  }

  async clearAll(): Promise<void> {
    const res = await this.request('DELETE', `/api/sync/items`)
    await this.assertOk(res, 'clear')
  }

  /**
   * V1 单用户场景下走客户端 read-modify-write.
   * 多端并发场景在 V2 接入 Google 登录后再加版本号/乐观锁.
   */
  async updateData<T>(key: string, modifier: (currentValue: T | null) => T): Promise<void> {
    const current = await this.getItem(key)
    const parsed: T | null = current ? (JSON.parse(current) as T) : null
    const next = modifier(parsed)
    await this.setItem(key, JSON.stringify(next))
  }

  async batchUpdate(
    operations: Array<{
      key: string
      operation: 'set' | 'remove'
      value?: string
    }>,
  ): Promise<void> {
    if (operations.length === 0) return
    const ops = operations.map((o) => ({
      key: o.key,
      op: o.operation,
      ...(o.operation === 'set' && o.value !== undefined ? { value: o.value } : {}),
    }))
    const res = await this.request('POST', `/api/sync/batch`, { ops })
    await this.assertOk(res, 'write')
  }

  /**
   * 给数据迁移用: 一次性把当前 owner 的所有 (key,value) 拉回来.
   * 业务层不应调用; useAppInitializer 检测云端是否空时使用.
   */
  async listAll(): Promise<Record<string, string>> {
    const res = await this.request('GET', `/api/sync/items`)
    await this.assertOk(res, 'read')
    const data = (await res.json()) as { entries: Record<string, string> }
    return data.entries || {}
  }

  getCapabilities() {
    return {
      supportsAtomic: false,
      supportsBatch: true,
    }
  }
}
