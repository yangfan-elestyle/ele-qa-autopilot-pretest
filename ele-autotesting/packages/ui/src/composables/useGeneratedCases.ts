/**
 * 跨面板共享 "最新一次生成结果" 的纯文本.
 * TestPanel 生成后写入, 编排面板 (AutotestCasesPanel) 读取并解析为表格.
 *
 * - 模块级单例 ref: 同一会话内多处 useGeneratedCases() 拿到同一份引用.
 * - 不持久化: 刷新即清空, 编排面板看不到旧数据; 跨设备 / 跨会话恢复走「同步到云」+
 *   历史抽屉【使用】, 不依赖本地存储.
 */

import { computed, ref } from 'vue'
import { parseTestCases, type ParsedTestCase } from '../utils/parseTestCases'

const latestRawText = ref<string>('')

function setLatestRawText(text: string) {
  const next = text ?? ''
  if (latestRawText.value === next) return
  latestRawText.value = next
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
