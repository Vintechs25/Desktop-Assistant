import Anthropic from '@anthropic-ai/sdk'
import type { ProviderConfig, ChatMessage, ChatConfig, ModelInfo, ProviderType } from '@shared/types'
import { BaseProvider } from './base'

export class AnthropicProvider extends BaseProvider {
  readonly id: string
  readonly name: string
  readonly type: ProviderType = 'anthropic'

  private client: Anthropic

  constructor(config: ProviderConfig) {
    super(config)
    this.id = config.id
    this.name = config.name
    this.client = new Anthropic({
      apiKey: config.apiKey ?? '',
      baseURL: config.baseUrl,
      dangerouslyAllowBrowser: true,
      defaultHeaders: config.customHeaders
    })
  }

  private convertMessages(
    messages: ChatMessage[]
  ): Anthropic.MessageParam[] {
    const result: Anthropic.MessageParam[] = []

    for (const msg of messages) {
      // Skip system messages — handled separately
      if (msg.role === 'system') continue

      if (typeof msg.content === 'string') {
        result.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })
      } else {
        // ContentPart array
        const blocks: Anthropic.ContentBlockParam[] = msg.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text ?? '' } as Anthropic.TextBlockParam
          } else {
            // image_url — convert to base64 image block
            const url = part.image_url?.url ?? ''
            if (url.startsWith('data:')) {
              const [header, data] = url.split(',')
              const mediaType = header.replace('data:', '').replace(';base64', '') as
                | 'image/jpeg'
                | 'image/png'
                | 'image/gif'
                | 'image/webp'
              return {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data }
              } as Anthropic.ImageBlockParam
            } else {
              return {
                type: 'image',
                source: { type: 'url', url }
              } as Anthropic.ImageBlockParam
            }
          }
        })
        result.push({
          role: msg.role as 'user' | 'assistant',
          content: blocks
        })
      }
    }

    return result
  }

  private extractSystemPrompt(messages: ChatMessage[], configSystem?: string): string | undefined {
    if (configSystem) return configSystem
    const systemMsg = messages.find((m) => m.role === 'system')
    if (!systemMsg) return undefined
    return typeof systemMsg.content === 'string' ? systemMsg.content : undefined
  }

  async chat(messages: ChatMessage[], config: ChatConfig): Promise<string> {
    const system = this.extractSystemPrompt(messages, config.systemPrompt)
    const converted = this.convertMessages(messages)

    const params: any = {
      max_tokens: config.maxTokens ?? 4096,
      temperature: config.temperature,
      system,
      messages: converted,
      model: this.requireModel(config),
    }

    const response = await this.client.messages.create(params)

    const block = response.content[0]
    if (!block || block.type !== 'text') throw new Error('No text content in response')
    return block.text
  }

  async *streamChat(
    messages: ChatMessage[],
    config: ChatConfig,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const system = this.extractSystemPrompt(messages, config.systemPrompt)
    const converted = this.convertMessages(messages)

    const streamParams: any = {
      max_tokens: config.maxTokens ?? 4096,
      temperature: config.temperature,
      system,
      messages: converted,
      model: this.requireModel(config),
    }

    const stream = this.client.messages.stream(streamParams)

    // Handle abort
    if (signal) {
      signal.addEventListener('abort', () => stream.abort())
    }

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text
      }
    }
  }

  async vision(image: string, prompt: string, config: ChatConfig): Promise<string> {
    let imageBlock: Anthropic.ImageBlockParam

    if (image.startsWith('data:')) {
      const [header, data] = image.split(',')
      const mediaType = header.replace('data:', '').replace(';base64', '') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp'
      imageBlock = {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data }
      }
    } else {
      imageBlock = {
        type: 'image',
        source: { type: 'url', url: image }
      }
    }

    const params: any = {
      max_tokens: config.maxTokens ?? 4096,
      system: config.systemPrompt,
      model: this.requireModel(config),
      messages: [
        {
          role: 'user',
          content: [imageBlock, { type: 'text', text: prompt }]
        }
      ],
    }

    const response = await this.client.messages.create(params)

    const block = response.content[0]
    if (!block || block.type !== 'text') throw new Error('No text content in vision response')
    return block.text
  }

  async listModels(): Promise<ModelInfo[]> {
    const client = this.client as unknown as {
      models?: {
        list: () => Promise<{ data?: Array<{ id: string; display_name?: string; created_at?: string }> }>
      }
    }
    if (!client.models?.list) return []
    const response = await client.models.list()
    return (response.data ?? []).map((model) => ({
      id: model.id,
      name: model.display_name || model.id,
      providerId: this.id,
      supportsVision: true,
      supportsStreaming: true
    }))
  }

  async capabilities() {
    return {
      supportsChat: true,
      supportsStreaming: true,
      supportsVision: true,
      supportsEmbeddings: false,
      supportsTextToSpeech: false,
      supportsSpeechToText: false,
      supportsTools: false,
      supportsReasoning: false,
      supportsJson: false,
      supportsImageGeneration: false,
      supportsAudio: false,
    }
  }
}
