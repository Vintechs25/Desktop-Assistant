import type { ProviderConfig, ChatMessage, ChatConfig, ModelInfo, ProviderType } from '@shared/types'
import { BaseProvider } from './base'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const APP_REFERER = 'https://desktop-assistant.app'
const APP_TITLE = 'Desktop AI Assistant'

interface OpenRouterModel {
  id: string
  name: string
  context_length?: number
  description?: string
  architecture?: {
    modality?: string
  }
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[]
}

export class OpenRouterProvider extends BaseProvider {
  readonly id: string
  readonly name: string
  readonly type: ProviderType = 'openrouter'

  private apiKey: string
  private baseUrl: string
  private customHeaders: Record<string, string>

  constructor(config: ProviderConfig) {
    super(config)
    this.id = config.id
    this.name = config.name
    this.apiKey = config.apiKey ?? ''
    this.baseUrl = config.baseUrl ?? OPENROUTER_BASE_URL
    this.customHeaders = config.customHeaders ?? {}
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': APP_REFERER,
      'X-Title': APP_TITLE,
      ...this.customHeaders
    }
  }

  private convertMessages(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Array<{ role: string; content: unknown }> {
    const result: Array<{ role: string; content: unknown }> = []

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt })
    }

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        result.push({ role: msg.role, content: msg.content })
      } else {
        result.push({
          role: msg.role,
          content: msg.content.map((part) => {
            if (part.type === 'text') return { type: 'text', text: part.text ?? '' }
            return {
              type: 'image_url',
              image_url: { url: part.image_url?.url ?? '', detail: part.image_url?.detail ?? 'auto' }
            }
          })
        })
      }
    }

    return result
  }

  async chat(messages: ChatMessage[], config: ChatConfig): Promise<string> {
    const body: Record<string, unknown> = {
      messages: this.convertMessages(messages, config.systemPrompt),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
    }
    body.model = this.requireModel(config)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }
    const content = data.choices[0]?.message?.content
    if (!content) throw new Error('No content in OpenRouter response')
    return content
  }

  async stream(
    messages: ChatMessage[],
    config: ChatConfig,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const body: Record<string, unknown> = {
      messages: this.convertMessages(messages, config.systemPrompt),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    }
    body.model = this.requireModel(config)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
    }

    if (!response.body) throw new Error('No response body for streaming')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (!trimmed.startsWith('data: ')) continue

          try {
            const json = JSON.parse(trimmed.slice(6)) as {
              choices: Array<{ delta?: { content?: string } }>
            }
            const delta = json.choices[0]?.delta?.content
            if (delta) onChunk(delta)
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async vision(image: string, prompt: string, config: ChatConfig): Promise<string> {
    const messages: Array<{ role: string; content: unknown }> = []

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

    const body: Record<string, unknown> = {
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
    }
    body.model = this.requireModel(config)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter vision API error ${response.status}: ${errorText}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }
    const content = data.choices[0]?.message?.content
    if (!content) throw new Error('No content in OpenRouter vision response')
    return content
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders()
      })

      if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`)

      const data = await response.json() as OpenRouterModelsResponse

      return data.data.map((m) => ({
        id: m.id,
        name: m.name ?? m.id,
        providerId: this.id,
        contextLength: m.context_length,
        supportsVision: m.architecture?.modality?.includes('image') ?? false,
        supportsStreaming: true,
        description: m.description
      }))
    } catch {
      // Return empty list on error — user can still type model IDs manually
      return []
    }
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
