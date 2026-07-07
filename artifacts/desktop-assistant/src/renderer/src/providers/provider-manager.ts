import type {
  ChatConfig,
  ChatMessage,
  ModelInfo,
  ProviderCapabilities,
  ProviderConfig,
  ProviderDiagnostics,
  ProviderHealth,
  ProviderType
} from '@shared/types'
import type { AIProvider } from './base'
import { OpenAIProvider } from './openai-provider'
import { AnthropicProvider } from './anthropic-provider'
import { GeminiProvider } from './gemini-provider'
import { XAIProvider } from './xai-provider'
import { OpenRouterProvider } from './openrouter-provider'
import { OllamaProvider } from './ollama-provider'
import { CustomProvider } from './custom-provider'
import { OpenAICompatibleProvider } from './openai-compatible-provider'

export type ProviderFactory = (config: ProviderConfig) => AIProvider

interface ModelCacheEntry {
  signature: string
  models: ModelInfo[]
  updatedAt: number
}

interface RouteRequest {
  providerId: string
  messages: ChatMessage[]
  config: ChatConfig
  onFallback?: (details: { providerId: string; fromModel?: string; toModel: string; reason: string }) => void
}

const MODEL_CACHE_TTL_MS = 60 * 60 * 1000

const RECOVERABLE_STATUS_CODES = new Set(['404', '410', '429', '500', '503'])

function configSignature(config: ProviderConfig): string {
  return JSON.stringify({
    type: config.type,
    apiKey: config.apiKey || '',
    baseUrl: config.baseUrl || '',
    customHeaders: config.customHeaders || {}
  })
}

function providerErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function providerErrorStatus(error: unknown): string {
  const err = error as { status?: unknown; statusCode?: unknown; code?: unknown; response?: { status?: unknown } }
  return String(err?.status ?? err?.statusCode ?? err?.response?.status ?? err?.code ?? '')
}

function isRecoverableModelError(error: unknown): boolean {
  const status = providerErrorStatus(error)
  if (RECOVERABLE_STATUS_CODES.has(status)) return true
  return /model.*not.*found|not.*supported|unavailable|unknown model|does not exist|invalid model/i.test(
    providerErrorMessage(error)
  )
}

function friendlyProviderError(error: unknown): string {
  const message = providerErrorMessage(error)
  if (/model.*not.*found|unknown model|does not exist|not.*supported/i.test(message)) {
    return 'The selected model is unavailable. Refresh available models and choose another model.'
  }
  if (/unauthorized|api key|401/i.test(message)) {
    return 'The provider rejected the API key. Check the key and test the connection again.'
  }
  if (/rate|quota|429/i.test(message)) {
    return 'The provider is rate-limiting this request. Try again later or use a fallback model.'
  }
  return message
}

export class ProviderManager {
  private providerFactories = new Map<ProviderType, ProviderFactory>()
  private providerConfigs = new Map<string, ProviderConfig>()
  private providers = new Map<string, AIProvider>()
  private modelCache = new Map<string, ModelCacheEntry>()
  private healthCache = new Map<string, ProviderHealth>()

  constructor() {
    this.registerProviderFactory('openai', (config) => new OpenAIProvider(config))
    this.registerProviderFactory('anthropic', (config) => new AnthropicProvider(config))
    this.registerProviderFactory('gemini', (config) => new GeminiProvider(config))
    this.registerProviderFactory('xai', (config) => new XAIProvider(config))
    this.registerProviderFactory('openrouter', (config) => new OpenRouterProvider(config))
    this.registerProviderFactory('ollama', (config) => new OllamaProvider(config))
    this.registerProviderFactory('custom', (config) => new CustomProvider(config))

    for (const type of ['groq', 'deepseek', 'together', 'fireworks', 'lmstudio', 'azure-openai'] as ProviderType[]) {
      this.registerProviderFactory(type, (config) => new OpenAICompatibleProvider(config))
    }
  }

  registerProviderFactory(type: ProviderType, factory: ProviderFactory): void {
    this.providerFactories.set(type, factory)
  }

  private createProvider(config: ProviderConfig): AIProvider {
    const factory = this.providerFactories.get(config.type)
    if (!factory) {
      throw new Error(`Unsupported provider type: ${config.type}`)
    }
    return factory(config)
  }

  register(config: ProviderConfig): AIProvider {
    const provider = this.createProvider(config)
    this.providerConfigs.set(config.id, config)
    this.providers.set(config.id, provider)
    const cache = this.modelCache.get(config.id)
    if (cache && cache.signature !== configSignature(config)) {
      this.modelCache.delete(config.id)
    }
    return provider
  }

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider)
    this.providerConfigs.set(provider.id, provider.config)
  }

  unregister(id: string): void {
    this.providers.delete(id)
    this.providerConfigs.delete(id)
    this.modelCache.delete(id)
    this.healthCache.delete(id)
  }

  has(id: string): boolean {
    return this.providers.has(id)
  }

  clear(): void {
    this.providers.clear()
    this.providerConfigs.clear()
    this.modelCache.clear()
    this.healthCache.clear()
  }

  get(id: string): AIProvider | undefined {
    return this.providers.get(id)
  }

  getConfig(id: string): ProviderConfig | undefined {
    return this.providerConfigs.get(id)
  }

  getAll(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  getProviderByType(type: ProviderType): AIProvider[] {
    return Array.from(this.providers.values()).filter((provider) => provider.type === type)
  }

  async loadProviders(configs: ProviderConfig[]): Promise<void> {
    this.clear()
    for (const config of configs) {
      if (config.enabled !== false) {
        this.register(config)
        if (config.availableModels?.length) {
          this.modelCache.set(config.id, {
            signature: configSignature(config),
            models: config.availableModels,
            updatedAt: config.lastModelRefresh ?? Date.now()
          })
        }
        if (config.health) this.healthCache.set(config.id, config.health)
      }
    }
  }

  async listModels(providerId: string, options?: { force?: boolean }): Promise<ModelInfo[]> {
    const provider = this.requireProvider(providerId)
    const providerConfig = this.requireConfig(providerId)
    const cache = this.modelCache.get(providerId)
    const signature = configSignature(providerConfig)
    const fresh = cache && cache.signature === signature && Date.now() - cache.updatedAt < MODEL_CACHE_TTL_MS

    if (!options?.force && fresh) {
      return cache.models
    }

    const models = await provider.refreshModels()
    this.modelCache.set(providerId, { signature, models, updatedAt: Date.now() })
    return models
  }

  async refreshModels(providerId: string): Promise<ModelInfo[]> {
    return this.listModels(providerId, { force: true })
  }

  async connect(providerId: string, apiKey?: string): Promise<void> {
    await this.requireProvider(providerId).connect(apiKey)
  }

  async disconnect(providerId: string): Promise<void> {
    await this.requireProvider(providerId).disconnect()
    this.healthCache.set(providerId, {
      status: 'disconnected',
      lastChecked: Date.now(),
      apiReachable: false,
      details: 'Disconnected'
    })
  }

  async healthCheck(providerId: string): Promise<ProviderHealth> {
    const startedAt = performance.now()
    try {
      const health = await this.requireProvider(providerId).healthCheck()
      const enriched: ProviderHealth = {
        ...health,
        status: health.status === 'ok' ? 'connected' : health.status,
        latencyMs: health.latencyMs ?? Math.round(performance.now() - startedAt),
        apiReachable: health.apiReachable ?? true,
        lastSuccessfulCall: health.lastSuccessfulCall ?? Date.now()
      }
      this.healthCache.set(providerId, enriched)
      return enriched
    } catch (error) {
      const health: ProviderHealth = {
        status: 'error',
        lastChecked: Date.now(),
        latencyMs: Math.round(performance.now() - startedAt),
        apiReachable: false,
        details: friendlyProviderError(error)
      }
      this.healthCache.set(providerId, health)
      return health
    }
  }

  async testConnection(config: ProviderConfig | string): Promise<boolean> {
    if (typeof config === 'string') {
      return this.requireProvider(config).testConnection()
    }
    const testProvider = this.createProvider(config)
    return testProvider.testConnection()
  }

  async getProviderCapabilities(providerId: string): Promise<ProviderCapabilities> {
    return this.requireProvider(providerId).capabilities()
  }

  async diagnostics(providerId: string): Promise<ProviderDiagnostics> {
    const provider = this.requireProvider(providerId)
    const [capabilities, models, health] = await Promise.all([
      provider.capabilities(),
      this.listModels(providerId).catch(() => []),
      this.healthCheck(providerId)
    ])
    return {
      providerId,
      connected: health.status === 'connected' || health.status === 'ok',
      apiReachable: health.apiReachable ?? false,
      lastSuccessfulCall: health.lastSuccessfulCall,
      latencyMs: health.latencyMs,
      availableModels: models.length,
      capabilities,
      health,
      rateLimit: health.rateLimit,
      quota: health.quota
    }
  }

  async chat(request: RouteRequest): Promise<string> {
    const provider = this.requireProvider(request.providerId)
    const config = await this.resolveChatConfig(request)
    try {
      return await provider.chat(request.messages, config)
    } catch (error) {
      if (!isRecoverableModelError(error)) throw new Error(friendlyProviderError(error))
      const fallbackConfig = await this.resolveFallbackConfig(request, config, error)
      request.onFallback?.({
        providerId: request.providerId,
        fromModel: config.model,
        toModel: fallbackConfig.model!,
        reason: friendlyProviderError(error)
      })
      return provider.chat(request.messages, fallbackConfig)
    }
  }

  async *streamChat(request: RouteRequest & { signal?: AbortSignal }): AsyncGenerator<string> {
    const provider = this.requireProvider(request.providerId)
    const config = await this.resolveChatConfig(request)
    try {
      for await (const chunk of provider.streamChat(request.messages, config, request.signal)) {
        yield chunk
      }
    } catch (error) {
      if (!isRecoverableModelError(error)) throw new Error(friendlyProviderError(error))
      const fallbackConfig = await this.resolveFallbackConfig(request, config, error)
      request.onFallback?.({
        providerId: request.providerId,
        fromModel: config.model,
        toModel: fallbackConfig.model!,
        reason: friendlyProviderError(error)
      })
      for await (const chunk of provider.streamChat(request.messages, fallbackConfig, request.signal)) {
        yield chunk
      }
    }
  }

  private async resolveChatConfig(request: RouteRequest): Promise<ChatConfig> {
    const providerConfig = this.requireConfig(request.providerId)
    const model = request.config.model || providerConfig.defaultModel || providerConfig.fallbackModel
    if (model) {
      return this.withProviderDefaults(request.config, providerConfig, model)
    }

    const models = await this.listModels(request.providerId)
    const compatible = this.firstCompatibleModel(models)
    if (!compatible) {
      throw new Error('No available chat models were discovered for this provider.')
    }
    return this.withProviderDefaults(request.config, providerConfig, compatible.id)
  }

  private async resolveFallbackConfig(
    request: RouteRequest,
    failedConfig: ChatConfig,
    error: unknown
  ): Promise<ChatConfig> {
    const providerConfig = this.requireConfig(request.providerId)
    const models = await this.refreshModels(request.providerId)
    const fallback =
      models.find((model) => model.id === providerConfig.fallbackModel && model.id !== failedConfig.model) ||
      models.find((model) => model.id !== failedConfig.model && this.isChatModel(model))

    if (!fallback) {
      throw new Error(friendlyProviderError(error))
    }

    return this.withProviderDefaults(request.config, providerConfig, fallback.id)
  }

  private withProviderDefaults(config: ChatConfig, providerConfig: ProviderConfig, model: string): ChatConfig {
    return {
      ...config,
      model,
      temperature: config.temperature ?? providerConfig.temperature,
      maxTokens: config.maxTokens ?? providerConfig.maxTokens,
      topP: config.topP ?? providerConfig.topP,
      presencePenalty: config.presencePenalty ?? providerConfig.presencePenalty,
      frequencyPenalty: config.frequencyPenalty ?? providerConfig.frequencyPenalty,
      systemPrompt: config.systemPrompt ?? providerConfig.systemPrompt
    }
  }

  private firstCompatibleModel(models: ModelInfo[]): ModelInfo | undefined {
    return models.find((model) => this.isChatModel(model))
  }

  private isChatModel(model: ModelInfo): boolean {
    return model.supportsStreaming !== false &&
      model.supportsEmbeddings !== true &&
      model.supportsImageGeneration !== true &&
      model.supportsAudio !== true
  }

  private requireProvider(providerId: string): AIProvider {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider "${providerId}" is not registered. Configure it in Settings > Providers.`)
    }
    return provider
  }

  private requireConfig(providerId: string): ProviderConfig {
    const config = this.providerConfigs.get(providerId)
    if (!config) {
      throw new Error(`Provider "${providerId}" is not configured.`)
    }
    return config
  }
}

export const providerManager = new ProviderManager()
export const providerRegistry = providerManager
