import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { ModelInfo, ProviderConfig, ProviderDiagnostics } from '@shared/types'
import { providerManager } from '../providers'
import { aiService } from '../services/ai-service'

const PROVIDERS_SETTINGS_KEY = 'providerConfigs'

interface ProviderStore {
  providers: ProviderConfig[]
  activeProviderId: string
  activeModel: string
  availableModels: ModelInfo[]
  diagnostics: Record<string, ProviderDiagnostics>
  isLoadingModels: boolean

  loadProviders: () => Promise<void>
  setActiveProvider: (id: string) => void
  setActiveModel: (model: string) => void
  loadModels: (providerId?: string) => Promise<void>
  refreshModels: (providerId: string) => Promise<ModelInfo[]>
  discoverModels: (config: ProviderConfig) => Promise<ModelInfo[]>
  saveProvider: (config: ProviderConfig) => Promise<void>
  deleteProvider: (id: string) => Promise<void>
  duplicateProvider: (id: string) => Promise<void>
  testProvider: (config: ProviderConfig | string) => Promise<boolean>
  loadDiagnostics: (providerId: string) => Promise<ProviderDiagnostics | null>
  getActiveProvider: () => ProviderConfig | undefined
  syncRegistry: (providers: ProviderConfig[]) => Promise<void>
  exportProviders: () => string
  importProviders: (json: string) => Promise<void>
}

async function loadStoredProviders(): Promise<ProviderConfig[]> {
  const settings = await window.api['db:getSettings']()
  const raw = (settings as Record<string, unknown>)[PROVIDERS_SETTINGS_KEY]
  if (Array.isArray(raw)) return raw as ProviderConfig[]
  return []
}

async function storeProviders(providers: ProviderConfig[]): Promise<void> {
  await window.api['db:updateSettings']({ [PROVIDERS_SETTINGS_KEY]: providers } as never)
}

function withoutSecrets(provider: ProviderConfig): ProviderConfig {
  return { ...provider, apiKey: provider.apiKey ? '' : provider.apiKey }
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: [],
  activeProviderId: '',
  activeModel: '',
  availableModels: [],
  diagnostics: {},
  isLoadingModels: false,

  loadProviders: async () => {
    try {
      const settings = await window.api['db:getSettings']()
      const providers = await loadStoredProviders()
      await get().syncRegistry(providers)

      const activeId = settings.defaultProviderId || providers[0]?.id || ''
      const activeProvider = providers.find((p) => p.id === activeId)
      const activeModels = activeProvider?.availableModels ?? []

      set({
        providers,
        activeProviderId: activeId,
        activeModel: activeProvider?.defaultModel || settings.defaultModel || activeModels[0]?.id || '',
        availableModels: activeModels
      })
    } catch (err) {
      console.error('Failed to load providers:', err)
    }
  },

  syncRegistry: async (providers: ProviderConfig[]) => {
    await providerManager.loadProviders(providers)
  },

  setActiveProvider: (id: string) => {
    const provider = get().providers.find((p) => p.id === id)
    set({
      activeProviderId: id,
      activeModel: provider?.defaultModel || provider?.availableModels?.[0]?.id || '',
      availableModels: provider?.availableModels ?? []
    })
  },

  setActiveModel: (model: string) => set({ activeModel: model }),

  loadModels: async (providerId?: string) => {
    const id = providerId ?? get().activeProviderId
    if (!id) return

    set({ isLoadingModels: true })
    try {
      const models = await aiService.listModels(id)
      set({ availableModels: models })
    } catch (err) {
      console.error('Failed to load models:', err)
      set({ availableModels: [] })
    } finally {
      set({ isLoadingModels: false })
    }
  },

  refreshModels: async (providerId: string) => {
    set({ isLoadingModels: true })
    try {
      const models = await providerManager.refreshModels(providerId)
      const diagnostics = await providerManager.diagnostics(providerId).catch(() => null)
      const updated = get().providers.map((provider) =>
        provider.id === providerId
          ? {
              ...provider,
              availableModels: models,
              lastModelRefresh: Date.now(),
              capabilities: diagnostics?.capabilities ?? provider.capabilities,
              health: diagnostics?.health ?? provider.health,
              defaultModel: provider.defaultModel || models[0]?.id
            }
          : provider
      )
      set((state) => ({
        providers: updated,
        availableModels: state.activeProviderId === providerId ? models : state.availableModels,
        activeModel:
          state.activeProviderId === providerId && !state.activeModel
            ? models[0]?.id ?? ''
            : state.activeModel,
        diagnostics: diagnostics
          ? { ...state.diagnostics, [providerId]: diagnostics }
          : state.diagnostics
      }))
      await storeProviders(updated)
      await providerManager.loadProviders(updated)
      return models
    } finally {
      set({ isLoadingModels: false })
    }
  },

  discoverModels: async (config: ProviderConfig) => {
    const tempId = config.id || `__discover__${Date.now()}`
    const discoverConfig = { ...config, id: tempId }
    providerManager.register(discoverConfig)
    try {
      return await providerManager.refreshModels(tempId)
    } finally {
      providerManager.unregister(tempId)
    }
  },

  saveProvider: async (config: ProviderConfig) => {
    const { providers } = get()
    const existing = providers.find((p) => p.id === config.id)
    const endpointChanged =
      existing &&
      (existing.apiKey !== config.apiKey ||
        existing.baseUrl !== config.baseUrl ||
        JSON.stringify(existing.customHeaders ?? {}) !== JSON.stringify(config.customHeaders ?? {}))

    const nextConfig: ProviderConfig = {
      ...existing,
      ...config,
      availableModels: endpointChanged ? [] : config.availableModels ?? existing?.availableModels,
      lastModelRefresh: endpointChanged ? undefined : config.lastModelRefresh ?? existing?.lastModelRefresh,
      capabilities: endpointChanged ? undefined : config.capabilities ?? existing?.capabilities,
      health: endpointChanged ? undefined : config.health ?? existing?.health
    }

    const updated =
      existing != null
        ? providers.map((p) => (p.id === config.id ? nextConfig : p))
        : [...providers, nextConfig]

    set({ providers: updated })
    await get().syncRegistry(updated)
    await storeProviders(updated)
  },

  deleteProvider: async (id: string) => {
    const updated = get().providers.filter((p) => p.id !== id)
    set((state) => {
      const { [id]: _deleted, ...diagnostics } = state.diagnostics
      return { providers: updated, diagnostics }
    })
    providerManager.unregister(id)
    await storeProviders(updated)

    if (get().activeProviderId === id && updated.length > 0) {
      get().setActiveProvider(updated[0].id)
    }
  },

  duplicateProvider: async (id: string) => {
    const provider = get().providers.find((p) => p.id === id)
    if (!provider) return
    await get().saveProvider({
      ...provider,
      id: uuidv4(),
      name: `${provider.name} Copy`,
      defaultModel: provider.defaultModel,
      fallbackModel: provider.fallbackModel
    })
  },

  testProvider: async (config: ProviderConfig | string) => {
    try {
      const ok = await providerManager.testConnection(config)
      if (typeof config === 'string') {
        await get().loadDiagnostics(config)
      }
      return ok
    } catch {
      return false
    }
  },

  loadDiagnostics: async (providerId: string) => {
    try {
      const diagnostics = await providerManager.diagnostics(providerId)
      set((state) => ({
        diagnostics: { ...state.diagnostics, [providerId]: diagnostics },
        providers: state.providers.map((provider) =>
          provider.id === providerId
            ? {
                ...provider,
                capabilities: diagnostics.capabilities,
                health: diagnostics.health
              }
            : provider
        )
      }))
      await storeProviders(get().providers)
      return diagnostics
    } catch (err) {
      console.error('Failed to load provider diagnostics:', err)
      return null
    }
  },

  getActiveProvider: () => {
    const { providers, activeProviderId } = get()
    return providers.find((p) => p.id === activeProviderId)
  },

  exportProviders: () => {
    return JSON.stringify(get().providers.map(withoutSecrets), null, 2)
  },

  importProviders: async (json: string) => {
    const parsed = JSON.parse(json) as ProviderConfig[]
    if (!Array.isArray(parsed)) throw new Error('Provider import must be an array.')
    const normalized = parsed.map((provider) => ({
      ...provider,
      id: provider.id || uuidv4(),
      enabled: provider.enabled !== false
    }))
    set({ providers: normalized })
    await get().syncRegistry(normalized)
    await storeProviders(normalized)
  }
}))
