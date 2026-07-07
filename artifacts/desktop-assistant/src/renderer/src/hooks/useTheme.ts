import { useEffect, useCallback } from 'react'
import type { Theme } from '@shared/types'
import { useSettingsStore } from '../stores/settings-store'
import { useUIStore } from '../stores/ui-store'

interface UseThemeResult {
  theme: Theme
  systemTheme: 'dark' | 'light'
  effectiveTheme: 'dark' | 'light'
  setTheme: (t: Theme) => void
}

export function useTheme(): UseThemeResult {
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const setUITheme = useUIStore((s) => s.setTheme)

  const systemTheme: 'dark' | 'light' =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'

  const effectiveTheme: 'dark' | 'light' =
    settings.theme === 'system' ? systemTheme : (settings.theme as 'dark' | 'light')

  useEffect(() => {
    const root = document.documentElement
    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    setUITheme(settings.theme)
  }, [effectiveTheme, settings.theme, setUITheme])

  // Listen for system theme changes
  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement
      if (e.matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings.theme])

  const setTheme = useCallback(
    (t: Theme) => {
      updateSettings({ theme: t })
    },
    [updateSettings]
  )

  return { theme: settings.theme, systemTheme, effectiveTheme, setTheme }
}
