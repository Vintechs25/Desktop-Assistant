import type {
  ProviderConfig,
  ProviderType,
  ModelInfo,
  ChatMessage,
  ChatConfig,
  ProviderHealth,
  ProviderCapabilities,
  ProviderPricing,
  ProviderLimits
} from '@shared/types'

export interface AIProvider {
  readonly id: string
  readonly name: string
  readonly type: ProviderType
  readonly displayName: string

  connect(apiKey?: string): Promise<void>
  disconnect(): Promise<void>

  listModels(): Promise<ModelInfo[]>
  refreshModels(): Promise<ModelInfo[]>

  chat(request: {
    messages: ChatMessage[]
    config: ChatConfig
  }): Promise<string>
  streamChat(request: {
    messages: ChatMessage[]
    config: ChatConfig
  }): AsyncGenerator<string>

  embeddings?(request: unknown): Promise<unknown>
  imageGeneration?(request: unknown): Promise<unknown>
  speechToText?(request: unknown): Promise<unknown>
  textToSpeech?(request: unknown): Promise<unknown>
  vision?(request: unknown): Promise<unknown>
  tools?(request: unknown): Promise<unknown>

  healthCheck(): Promise<ProviderHealth>
  testConnection(): Promise<boolean>
  capabilities(): Promise<ProviderCapabilities>
  pricing?(): Promise<ProviderPricing>
  limits?(): Promise<ProviderLimits>
}

export abstract class BaseProvider implements AIProvider {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly type: ProviderType
  abstract readonly displayName: string

  abstract connect(apiKey?: string): Promise<void>
  abstract disconnect(): Promise<void>

  abstract listModels(): Promise<ModelInfo[]>
  abstract refreshModels(): Promise<ModelInfo[]>

  abstract chat(request: {
    messages: ChatMessage[]
    config: ChatConfig
  }): Promise<string>
  abstract streamChat(request: {
    messages: ChatMessage[]
    config: ChatConfig
  }): AsyncGenerator<string>

  async healthCheck(): Promise<ProviderHealth> {
    const models = await this.listModels()
    return {
      status: models.length > 0 ? 'ok' : 'warning',
      lastChecked: Date.now(),
      details: models.length > 0 ? 'Provider responded with available models.' : 'Provider returned no models.'
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const models = await this.listModels()
      return models.length > 0
    } catch {
      return false
    }
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      supportsStreaming: false,
      supportsVision: false,
      supportsEmbeddings: false,
      supportsTextToSpeech: false,
      supportsSpeechToText: false,
      supportsTools: false,
      supportsReasoning: false,
      supportsJson: false,
      supportsImageGeneration: false,
      supportsChat: true
    }
  }

  connect(): Promise<void> {
    return Promise.resolve()
  }

  disconnect(): Promise<void> {
    return Promise.resolve()
  }

  pricing?(): Promise<ProviderPricing> {
    return Promise.resolve({ currency: 'USD', modelPricing: [] })
  }

  limits?(): Promise<ProviderLimits> {
    return Promise.resolve({})
  }
}
