import OpenAI from 'openai'
import type {
  ChatConfig,
  ChatMessage,
  ModelInfo,
  ProviderCapabilities,
  ProviderConfig,
  ProviderType
} from '@shared/types'
import { BaseProvider } from './base'

const OPENAI_COMPATIBLE_DEFAULT_URLS: Partial<Record<ProviderType, string>> = {
  openai: 'https://api.openai.com/v1',
  xai: 'https://api.x.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  together: 'https://api.together.xyz/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  lmstudio: 'http://localhost:1234/v1',
  custom: 'http://localhost:8000/v1'
}

const PROVIDER_NAMES: Partial<Record<ProviderType, string>> = {
  openai: 'OpenAI',
  xai: 'xAI',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  deepseek: 'DeepSeek',
  together: 'Together',
  fireworks: 'Fireworks',
  lmstudio: 'LM Studio',
  'azure-openai': 'Azure OpenAI',
  custom: 'OpenAI-compatible'
}

function modelHasAny(modelId: string, fragments: string[]): boolean {
  const normalized = modelId.toLowerCase()
  return fragments.some((fragment) => normalized.includes(fragment))
}

export class OpenAICompatibleProvider extends BaseProvider {
  readonly id: string
  readonly name: string
  readonly type: ProviderType

  protected client: OpenAI

  constructor(config: ProviderConfig) {
    super(config)
    this.id = config.id
    this.name = config.name || PROVIDER_NAMES[config.type] || config.type
    this.type = config.type
    this.client = new OpenAI({
      apiKey: config.apiKey || 'not-required',
      baseURL: config.baseUrl || OPENAI_COMPATIBLE_DEFAULT_URLS[config.type],
      dangerouslyAllowBrowser: true,
      defaultHeaders: config.customHeaders
    })
  }

  async chat(messages: ChatMessage[], config: ChatConfig): Promise<string> {
    const response = await this.client.chat.completions.create({
      messages: this.buildMessages(messages, config.systemPrompt) as OpenAI.Chat.ChatCompletionMessageParam[],
      model: this.requireModel(config),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      presence_penalty: config.presencePenalty,
      frequency_penalty: config.frequencyPenalty,
      stream: false
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('The provider returned an empty response.')
    return content
  }

  async *streamChat(
    messages: ChatMessage[],
    config: ChatConfig,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create(
      {
        messages: this.buildMessages(messages, config.systemPrompt) as OpenAI.Chat.ChatCompletionMessageParam[],
        model: this.requireModel(config),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        presence_penalty: config.presencePenalty,
        frequency_penalty: config.frequencyPenalty,
        stream: true
      },
      { signal }
    )

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) yield delta
    }
  }

  async vision(image: string, prompt: string, config: ChatConfig): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (config.systemPrompt) {
      messages.push({ role: 'system', content: config.systemPrompt })
    }

    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: image, detail: 'auto' } },
        { type: 'text', text: prompt }
      ]
    })

    const response = await this.client.chat.completions.create({
      messages,
      model: this.requireModel(config),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('The provider returned an empty vision response.')
    return content
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await this.client.models.list()
    return response.data
      .map((model) => this.toModelInfo(model.id))
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      supportsChat: true,
      supportsStreaming: true,
      supportsVision: true,
      supportsEmbeddings: true,
      supportsTextToSpeech: false,
      supportsSpeechToText: false,
      supportsTools: true,
      supportsReasoning: true,
      supportsJson: true,
      supportsImageGeneration: true,
      supportsAudio: false
    }
  }

  protected toModelInfo(modelId: string): ModelInfo {
    return {
      id: modelId,
      name: modelId,
      providerId: this.id,
      supportsStreaming: !modelHasAny(modelId, ['embedding', 'moderation', 'image', 'audio', 'tts', 'whisper']),
      supportsVision: modelHasAny(modelId, ['vision', 'vl', 'multimodal', 'omni']),
      supportsEmbeddings: modelHasAny(modelId, ['embedding']),
      supportsImageGeneration: modelHasAny(modelId, ['image']),
      supportsAudio: modelHasAny(modelId, ['audio', 'tts', 'whisper']),
      supportsTools: !modelHasAny(modelId, ['embedding', 'image', 'audio']),
      supportsJson: !modelHasAny(modelId, ['embedding', 'image', 'audio']),
      supportsReasoning: modelHasAny(modelId, ['reason', 'thinking'])
    }
  }
}
