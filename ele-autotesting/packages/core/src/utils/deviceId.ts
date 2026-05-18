const DEVICE_ID_KEY = 'app:device-id'

/**
 * 获取并持久化当前浏览器的 deviceId.
 *
 * V1 用 localStorage 作为持久层 (跨标签页可见, 关浏览器不丢).
 * 这是身份系统 V1 的载体, V2 接入 Google 登录后, 用户首次登录
 * 会触发一次性 'device:<id>' → 'google:<sub>' 的数据迁移.
 *
 * 注意: 无痛模式 / 清缓存会丢失 deviceId, 导致云端数据"看不到".
 * 这与目前完全本地存储的体验一致, 没有功能退化.
 */
export function ensureDeviceId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('ensureDeviceId requires a browser environment')
  }

  const existing = window.localStorage.getItem(DEVICE_ID_KEY)
  if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) {
    return existing
  }

  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : // 兜底: 16 字节随机 hex
        Array.from({ length: 16 }, () =>
          Math.floor(Math.random() * 256).toString(16).padStart(2, '0'),
        ).join('')

  window.localStorage.setItem(DEVICE_ID_KEY, id)
  return id
}

export function clearDeviceId(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(DEVICE_ID_KEY)
  }
}
