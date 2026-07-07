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
  readonly config: ProviderConfig

  connect(apiKey?: string): Promise<void>
  disconnect(): Promise<void>

  testConnection(): Promise<boolean>
  healthCheck(): Promise<ProviderHealth>

  listModels(): Promise<ModelInfo[]>
  refreshModels(): Promise<ModelInfo[]>

  chat(messages: ChatMessage[], config: ChatConfig): Promise<string>
  streamChat(messages: ChatMessage[], config: ChatConfig, signal?: AbortSignal): AsyncGenerator<string>
  stream(messages: ChatMessage[], config: ChatConfig, onChunk: (chunk: string) => void, signal?: AbortSignal): Promise<void>

  vision?(image: string, prompt: string, config: ChatConfig): Promise<string>
  embeddings?(request: unknown): Promise<unknown>
  imageGeneration?(request: unknown): Promise<unknown>
  speechToText?(request: unknown): Promise<unknown>
  textToSpeech?(request: unknown): Promise<unknown>
  tools?(request: unknown): Promise<unknown>

  capabilities(): Promise<ProviderCapabilities>
  supportsVision(): Promise<boolean>
  supportsStreaming(): Promise<boolean>
  supportsTools(): Promise<boolean>
  supportsReasoning(): Promise<boolean>
  supportsEmbeddings(): Promise<boolean>
  supportsJSON(): Promise<boolean>
  supportsImageGeneration(): Promise<boolean>
  supportsAudio(): Promise<boolean>
  pricing?(): Promise<ProviderPricing>
  limits?(): Promise<ProviderLimits>
}

const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  supportsChat: true,
  supportsStreaming: false,
  supportsVision: false,
  supportsEmbeddings: false,
  supportsTextToSpeech: false,
  supportsSpeechToText: false,
  supportsTools: false,
  supportsReasoning: false,
  supportsJson: false,
  supportsImageGeneration: false,
  supportsAudio: false
}

export abstract class BaseProvider implements AIProvider {
  readonly config: ProviderConfig
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly type: ProviderType

  constructor(config: ProviderConfig) {
    this.config = config
  }

  get displayName(): string {
    return this.name
  }

  async connect(): Promise<void> {
    return Promise.resolve()
  }

  async disconnect(): Promise<void> {
    return Promise.resolve()
  }

  abstract listModels(): Promise<ModelInfo[]>

  async refreshModels(): Promise<ModelInfo[]> {
    return this.listModels()
  }

  protected getModel(config: ChatConfig): string | undefined {
    return config.model ?? this.config.defaultModel
  }

  protected requireModel(config: ChatConfig): string {
    const model = this.getModel(config)
    if (!model) {
      throw new Error('No model selected. Refresh models and choose an available model.')
    }
    return model
  }

  abstract chat(messages: ChatMessage[], config: ChatConfig): Promise<string>

  async *streamChat(
    messages: ChatMessage[],
    config: ChatConfig,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const chunks: string[] = []
    await this.stream(messages, config, (chunk) => chunks.push(chunk), signal)
    for (const chunk of chunks) {
      yield chunk
    }
  }

  async stream(
    messages: ChatMessage[],
    config: ChatConfig,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    for await (const chunk of this.streamChat(messages, config, signal)) {
      onChunk(chunk)
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startedAt = performance.now()
    const models = await this.listModels()
    const latencyMs = Math.round(performance.now() - startedAt)
    return {
      status: models.length > 0 ? 'connected' : 'warning',
      lastChecked: Date.now(),
      latencyMs,
      apiReachable: true,
      lastSuccessfulCall: Date.now(),
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
    return DEFAULT_CAPABILITIES
  }

  async supportsVision(): Promise<boolean> {
    return (await this.capabilities()).supportsVision
  }

  async supportsStreaming(): Promise<boolean> {
    return (await this.capabilities()).supportsStreaming
  }

  async supportsTools(): Promise<boolean> {
    return (await this.capabilities()).supportsTools
  }

  async supportsReasoning(): Promise<boolean> {
    return (await this.capabilities()).supportsReasoning
  }

  async supportsEmbeddings(): Promise<boolean> {
    return (await this.capabilities()).supportsEmbeddings
  }

  async supportsJSON(): Promise<boolean> {
    return (await this.capabilities()).supportsJson
  }

  async supportsImageGeneration(): Promise<boolean> {
    return (await this.capabilities()).supportsImageGeneration
  }

  async supportsAudio(): Promise<boolean> {
    const capabilities = await this.capabilities()
    return capabilities.supportsAudio || capabilities.supportsSpeechToText || capabilities.supportsTextToSpeech
  }

  async pricing(): Promise<ProviderPricing> {
    return { currency: 'USD', modelPricing: [] }
  }

  async limits(): Promise<ProviderLimits> {
    return {}
  }

  protected buildMessages(messages: ChatMessage[], systemPrompt?: string): ChatMessage[] {
    const result: ChatMessage[] = []
    if (systemPrompt) result.push({ role: 'system', content: systemPrompt })
    return [...result, ...messages]
  }
}
