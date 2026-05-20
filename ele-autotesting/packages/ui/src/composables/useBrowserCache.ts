import { ref, watch, type Ref } from 'vue'

/**
 * 通用浏览器本地缓存 (响应式 ref ↔ localStorage 自动 sync).
 *
 * 用途: 用户态偏好 / 凭据 (MeterSphere AK/SK 等) 在刷新后保留, 避免重复输入.
 * 不用于业务数据 (业务数据走 D1 sync 服务).
 *
 * 仅支持 string / number / boolean / null. 复杂结构上层自行 JSON.stringify.
 *
 * - 读: 初始化时优先 localStorage, 空 / 不存在 / 解析失败均回退 default.
 * - 写: ref 变更 → setItem; 空值 ('' / null / undefined) → removeItem.
 * - 安全: 无 window / localStorage 异常 (quota / 隐私模式) 时降级纯 in-memory.
 *
 * 跨标签 storage event 同步暂不做, 当前场景单标签即可.
 */
export function useBrowserCache<T extends string | number | boolean | null>(
  key: string,
  defaultValue: T,
): Ref<T> {
  const hasStorage = typeof window !== 'undefined' && !!window.localStorage

  const initial = (() => {
    if (!hasStorage) return defaultValue
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null || raw === '') return defaultValue
      if (typeof defaultValue === 'number') {
        const n = Number(raw)
        return (Number.isFinite(n) ? n : defaultValue) as T
      }
      if (typeof defaultValue === 'boolean') return (raw === 'true') as unknown as T
      return raw as unknown as T
    } catch {
      return defaultValue
    }
  })()

  const state = ref(initial) as Ref<T>

  watch(state, (v) => {
    if (!hasStorage) return
    try {
      if (v === '' || v === null || v === undefined) {
        window.localStorage.removeItem(key)
      } else {
        window.localStorage.setItem(key, String(v))
      }
    } catch {
      // localStorage 写失败 (quota / 隐私模式) 静默, 不影响业务.
    }
  })

  return state
}
