import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { UI_SETTINGS_KEYS } from '@prompt-optimizer/core'
import { usePreferences } from './usePreferenceManager'
import type { AppServices } from '../types/services'

export type ThemeId = 'light' | 'dark'

const SYSTEM_DARK = '(prefers-color-scheme: dark)'

const detectSystem = (): ThemeId => (window.matchMedia(SYSTEM_DARK).matches ? 'dark' : 'light')

const applyTheme = (t: ThemeId): void => {
  document.documentElement.classList.toggle('dark', t === 'dark')
}

// 模块级单例：跨组件共享, 模块加载即应用以减少首屏闪烁
const theme = ref<ThemeId>(detectSystem())
const userOverride = ref(false)
applyTheme(theme.value)

export function useTheme(services: Ref<AppServices | null>) {
  const { getPreference, setPreference } = usePreferences(services)

  const setTheme = async (next: ThemeId): Promise<void> => {
    theme.value = next
    userOverride.value = true
    applyTheme(next)
    try {
      await setPreference(UI_SETTINGS_KEYS.THEME_ID, next)
    } catch (e) {
      console.error('保存主题失败:', e)
    }
  }

  const toggleTheme = () => setTheme(theme.value === 'dark' ? 'light' : 'dark')

  const media = window.matchMedia(SYSTEM_DARK)
  const onSystemChange = (e: MediaQueryListEvent) => {
    if (userOverride.value) return
    theme.value = e.matches ? 'dark' : 'light'
    applyTheme(theme.value)
  }

  onMounted(async () => {
    try {
      const stored = await getPreference<ThemeId | null>(UI_SETTINGS_KEYS.THEME_ID, null)
      if (stored === 'light' || stored === 'dark') {
        userOverride.value = true
        theme.value = stored
        applyTheme(stored)
      }
    } catch (e) {
      console.error('初始化主题失败:', e)
    }
    media.addEventListener('change', onSystemChange)
  })

  onBeforeUnmount(() => media.removeEventListener('change', onSystemChange))

  return { theme, toggleTheme, setTheme }
}
