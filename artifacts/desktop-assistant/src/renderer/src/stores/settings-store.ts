import { create } from 'zustand'
import type { Settings } from '@shared/types'

interface SettingsStore {
  settings: Settings
  isLoading: boolean
  loadSettings: () => Promise<void>
  updateSettings: (partial: Partial<Settings>) => Promise<void>
}

const defaultSettings: Settings = {
  theme: 'dark',
  fontSize: 'md',
  defaultProviderId: '',
  defaultModel: '',
  streamingEnabled: true,
  markdownEnabled: true,
  codeHighlightEnabled: true,
  ocrLanguage: 'eng',
  shortcuts: {
    toggleWindow: 'CommandOrControl+Shift+Space',
    captureScreen: 'CommandOrControl+Shift+S',
    captureRegion: 'CommandOrControl+Shift+R',
    captureWindow: 'CommandOrControl+Shift+W',
    newConversation: 'CommandOrControl+N',
    commandPalette: 'CommandOrControl+K',
    sendMessage: 'Enter',
    focusInput: 'CommandOrControl+L',
  },
  windowMode: 'normal',
  windowOpacity: 1,
  autoStart: false,
  minimizeToTray: true,
  notificationsEnabled: true,
  sendWithEnter: true,
  showTokenCount: false,
  autoSummarize: false,
  maxContextMessages: 20,
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.api['db:getSettings']()
      set({ settings: { ...defaultSettings, ...settings } })
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  updateSettings: async (partial: Partial<Settings>) => {
    const current = get().settings
    const updated = { ...current, ...partial }
    set({ settings: updated })
    try {
      await window.api['db:updateSettings'](partial)
    } catch (err) {
      console.error('Failed to save settings:', err)
      set({ settings: current })
    }
  },
}))
