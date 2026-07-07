import { Settings, ShortcutConfig, ProviderConfig } from '../../../shared/types'
import databaseService from '../index'

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  fontSize: 'md',
  defaultProviderId: '',
  defaultModel: '',
  streamingEnabled: true,
  markdownEnabled: true,
  codeHighlightEnabled: true,
  ocrLanguage: 'eng',
  windowMode: 'normal',
  windowOpacity: 1,
  autoStart: false,
  minimizeToTray: true,
  notificationsEnabled: true,
  sendWithEnter: true,
  showTokenCount: true,
  autoSummarize: false,
  maxContextMessages: 50,
  shortcuts: {
    toggleWindow: 'CommandOrControl+Shift+A',
    captureScreen: 'CommandOrControl+Shift+S',
    captureRegion: 'CommandOrControl+Shift+R',
    captureWindow: 'CommandOrControl+Shift+W',
    newConversation: 'CommandOrControl+N',
    commandPalette: 'CommandOrControl+K',
    sendMessage: 'Enter',
    focusInput: 'Escape'
  }
}

export const settingsRepository = {
  getDefaultSettings(): Settings {
    return { ...DEFAULT_SETTINGS, shortcuts: { ...DEFAULT_SETTINGS.shortcuts } }
  },

  get<T>(key: string, defaultValue: T): T {
    const db = databaseService.getDb()
    const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as
      | { value: string }
      | undefined
    if (!row) return defaultValue
    try {
      return JSON.parse(row.value) as T
    } catch {
      return defaultValue
    }
  },

  set(key: string, value: unknown): void {
    const db = databaseService.getDb()
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(
      key,
      JSON.stringify(value)
    )
  },

  getAll(): Settings {
    const db = databaseService.getDb()
    const rows = db.prepare(`SELECT key, value FROM settings`).all() as {
      key: string
      value: string
    }[]

    const map: Record<string, unknown> = {}
    for (const row of rows) {
      try {
        map[row.key] = JSON.parse(row.value)
      } catch {
        map[row.key] = row.value
      }
    }

    // Merge with defaults so all keys are always present
    const defaults = this.getDefaultSettings()

    // Handle shortcuts object specially — merge nested
    const shortcuts: ShortcutConfig = {
      ...defaults.shortcuts,
      ...(map.shortcuts as ShortcutConfig | undefined)
    }

    return {
      theme: (map.theme as Settings['theme']) ?? defaults.theme,
      fontSize: (map.fontSize as Settings['fontSize']) ?? defaults.fontSize,
      defaultProviderId:
        typeof map.defaultProviderId === 'string' && map.defaultProviderId.length > 0
          ? (map.defaultProviderId as string)
          : defaults.defaultProviderId,
      defaultModel:
        typeof map.defaultModel === 'string' && map.defaultModel.length > 0
          ? (map.defaultModel as string)
          : defaults.defaultModel,
      streamingEnabled:
        map.streamingEnabled != null
          ? Boolean(map.streamingEnabled)
          : defaults.streamingEnabled,
      markdownEnabled:
        map.markdownEnabled != null
          ? Boolean(map.markdownEnabled)
          : defaults.markdownEnabled,
      codeHighlightEnabled:
        map.codeHighlightEnabled != null
          ? Boolean(map.codeHighlightEnabled)
          : defaults.codeHighlightEnabled,
      ocrLanguage: (map.ocrLanguage as string) ?? defaults.ocrLanguage,
      windowMode: (map.windowMode as Settings['windowMode']) ?? defaults.windowMode,
      windowOpacity:
        map.windowOpacity != null
          ? Number(map.windowOpacity)
          : defaults.windowOpacity,
      autoStart:
        map.autoStart != null ? Boolean(map.autoStart) : defaults.autoStart,
      minimizeToTray:
        map.minimizeToTray != null
          ? Boolean(map.minimizeToTray)
          : defaults.minimizeToTray,
      notificationsEnabled:
        map.notificationsEnabled != null
          ? Boolean(map.notificationsEnabled)
          : defaults.notificationsEnabled,
      proxyUrl: (map.proxyUrl as string | undefined) ?? undefined,
      providerConfigs: (map.providerConfigs as ProviderConfig[] | undefined) ?? undefined,
      sendWithEnter:
        map.sendWithEnter != null
          ? Boolean(map.sendWithEnter)
          : defaults.sendWithEnter,
      showTokenCount:
        map.showTokenCount != null
          ? Boolean(map.showTokenCount)
          : defaults.showTokenCount,
      autoSummarize:
        map.autoSummarize != null
          ? Boolean(map.autoSummarize)
          : defaults.autoSummarize,
      maxContextMessages:
        map.maxContextMessages != null
          ? Number(map.maxContextMessages)
          : defaults.maxContextMessages,
      shortcuts
    }
  },

  update(settings: Partial<Settings>): void {
    const db = databaseService.getDb()
    const upsert = db.prepare(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`
    )
    const updateMany = db.transaction((entries: [string, unknown][]) => {
      for (const [key, value] of entries) {
        upsert.run(key, JSON.stringify(value))
      }
    })

    const entries = Object.entries(settings) as [string, unknown][]
    updateMany(entries)
  }
}

export default settingsRepository
