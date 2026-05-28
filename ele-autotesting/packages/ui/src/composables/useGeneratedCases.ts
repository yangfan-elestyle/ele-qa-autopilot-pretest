/**
 * 跨面板共享 "最新一次生成结果" 的纯文本.
 * TestPanel 生成后写入, 联动面板 (AutotestCasesPanel) 读取并解析为表格.
 *
 * - 模块级单例 ref: 同一会话内多处 useGeneratedCases() 拿到同一份引用.
 * - sessionStorage 持久化: 单标签页刷新不丢, 关闭标签页自动清掉, 避免跨会话串台.
 */

import { computed, ref } from 'vue'
import { parseTestCases, type ParsedTestCase } from '../utils/parseTestCases'

const STORAGE_KEY = 'ele-autotesting:latest-generated-cases'

function loadInitial(): string {
  if (typeof window === 'undefined' || !window.sessionStorage) return ''
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

const latestRawText = ref<string>(loadInitial())

function setLatestRawText(text: string) {
  const next = text ?? ''
  if (latestRawText.value === next) return
  latestRawText.value = next
  if (typeof window === 'undefined' || !window.sessionStorage) return
  try {
    if (next) window.sessionStorage.setItem(STORAGE_KEY, next)
    else window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 沉默: 隐私模式 / quota 失败不影响内存共享.
  }
}

export function useGeneratedCases() {
  const parsedCases = computed<ParsedTestCase[]>(() => parseTestCases(latestRawText.value))
  const hasGenerated = computed(() => parsedCases.value.length > 0)
  return {
    latestRawText,
    setLatestRawText,
    parsedCases,
    hasGenerated,
  }
}

export type { ParsedTestCase }
