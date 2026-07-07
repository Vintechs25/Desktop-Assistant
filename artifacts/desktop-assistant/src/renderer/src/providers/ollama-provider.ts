import axios from 'axios'
import type { ProviderConfig, ChatMessage, ChatConfig, ModelInfo, ProviderType } from '@shared/types'
import { BaseProvider } from './base'

const DEFAULT_BASE_URL = 'http://localhost:11434'

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  images?: string[]
}

interface OllamaTagsResponse {
  models: Array<{
    name: string
    modified_at: string
    size: number
    details?: {
      family?: string
      parameter_size?: string
      quantization_level?: string
    }
  }>
}

interface OllamaChatResponse {
  model: string
  message: {
    role: string
    content: string
  }
  done: boolean
}

export class OllamaProvider extends BaseProvider {
  readonly id: string
  readonly name: string
  readonly type: ProviderType = 'ollama'

  private baseUrl: string

  constructor(config: ProviderConfig) {
    super(config)
    this.id = config.id
    this.name = config.name
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  }

  private convertMessages(messages: ChatMessage[], systemPrompt?: string): OllamaMessage[] {
    const result: OllamaMessage[] = []

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt })
    }

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        result.push({ role: msg.role, content: msg.content })
      } else {
        // Extract text and images from ContentPart array
        let text = ''
        const images: string[] = []

        for (const part of msg.content) {
          if (part.type === 'text' && part.text) {
            text += part.text
          } else if (part.type === 'image_url' && part.image_url?.url) {
            const url = part.image_url.url
            // Ollama expects raw base64 without the data URI prefix
            if (url.startsWith('data:')) {
              const base64 = url.split(',')[1]
              if (base64) images.push(base64)
            } else {
              images.push(url)
            }
          }
        }

        const ollamaMsg: OllamaMessage = { role: msg.role, content: text }
        if (images.length > 0) ollamaMsg.images = images
        result.push(ollamaMsg)
      }
    }

    return result
  }

  async chat(messages: ChatMessage[], config: ChatConfig): Promise<string> {
    const converted = this.convertMessages(messages, config.systemPrompt)

    const body: any = {
      messages: converted,
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens
      }
    }
    body.model = this.requireModel(config)

    const response = await axios.post<OllamaChatResponse>(
      `${this.baseUrl}/api/chat`,
      body,
      { timeout: 120000 }
    )

    const content = response.data.message?.content
    if (!content) throw new Error('No content in Ollama response')
    return content
  }

  async stream(
    messages: ChatMessage[],
    config: ChatConfig,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const converted = this.convertMessages(messages, config.systemPrompt)

    const body: any = {
      messages: converted,
      stream: true,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens
      }
    }
    body.model = this.requireModel(config)

    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      body,
      {
        responseType: 'stream',
        timeout: 120000,
        signal
      }
    )

    return new Promise<void>((resolve, reject) => {
      let buffer = ''

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          try {
            const parsed = JSON.parse(trimmed) as OllamaChatResponse
            if (parsed.message?.content) {
              onChunk(parsed.message.content)
            }
          } catch {
            // skip malformed lines
          }
        }
      })

      response.data.on('end', resolve)
      response.data.on('error', reject)

      if (signal) {
        signal.addEventListener('abort', () => {
          response.data.destroy()
          resolve()
        })
      }
    })
  }

  async vision(image: string, prompt: string, config: ChatConfig): Promise<string> {
    let base64Image: string

    if (image.startsWith('data:')) {
      base64Image = image.split(',')[1] ?? image
    } else {
      base64Image = image
    }

    const messages: OllamaMessage[] = []

    if (config.systemPrompt) {
      messages.push({ role: 'system', content: config.systemPrompt })
    }

    messages.push({
      role: 'user',
      content: prompt,
      images: [base64Image]
    })

    const body: any = {
      messages,
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens
      }
    }
    body.model = this.requireModel(config)

    const response = await axios.post<OllamaChatResponse>(
      `${this.baseUrl}/api/chat`,
      body,
      { timeout: 120000 }
    )

    const content = response.data.message?.content
    if (!content) throw new Error('No content in Ollama vision response')
    return content
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await axios.get<OllamaTagsResponse>(`${this.baseUrl}/api/tags`, {
      timeout: 10000
    })

    return response.data.models.map((m) => ({
      id: m.name,
      name: m.name,
      providerId: this.id,
      supportsStreaming: true,
      supportsVision:
        m.name.includes('llava') ||
        m.name.includes('vision') ||
        m.name.includes('bakllava') ||
        m.name.includes('moondream'),
      description: m.details
        ? `${m.details.family ?? ''} ${m.details.parameter_size ?? ''} ${m.details.quantization_level ?? ''}`.trim()
        : undefined
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
