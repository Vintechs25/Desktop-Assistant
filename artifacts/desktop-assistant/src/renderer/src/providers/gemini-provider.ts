import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Content,
  type Part
} from '@google/generative-ai'
import type { ProviderConfig, ChatMessage, ChatConfig, ModelInfo, ProviderType } from '@shared/types'
import { BaseProvider } from './base'

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  }
]

export class GeminiProvider extends BaseProvider {
  readonly id: string
  readonly name: string
  readonly type: ProviderType = 'gemini'

  private genAI: GoogleGenerativeAI
  private apiKey: string

  constructor(config: ProviderConfig) {
    super(config)
    this.id = config.id
    this.name = config.name
    this.apiKey = config.apiKey ?? ''
    this.genAI = new GoogleGenerativeAI(this.apiKey)
  }

  private resolveModel(config: ChatConfig): string {
    return this.requireModel(config)
  }

  private createModel(config: ChatConfig) {
    return this.genAI.getGenerativeModel({
      model: this.resolveModel(config),
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens
      }
    })
  }

  private convertMessages(messages: ChatMessage[], systemPrompt?: string): Content[] {
    const contents: Content[] = []

    // Gemini handles system prompt as first user message if systemInstruction not supported
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      })
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }]
      })
    }

    for (const msg of messages) {
      if (msg.role === 'system') continue // already handled above

      const role = msg.role === 'assistant' ? 'model' : 'user'

      if (typeof msg.content === 'string') {
        contents.push({ role, parts: [{ text: msg.content }] })
      } else {
        const parts: Part[] = msg.content.map((part) => {
          if (part.type === 'text') {
            return { text: part.text ?? '' }
          } else {
            const url = part.image_url?.url ?? ''
            if (url.startsWith('data:')) {
              const [header, data] = url.split(',')
              const mimeType = header.replace('data:', '').replace(';base64', '')
              return { inlineData: { mimeType, data } }
            }
            return { text: `[Image: ${url}]` }
          }
        })
        contents.push({ role, parts })
      }
    }

    return contents
  }

  async chat(messages: ChatMessage[], config: ChatConfig): Promise<string> {
    const model = this.createModel(config)
    const contents = this.convertMessages(messages, config.systemPrompt)

    // Extract the last user message and use rest as history
    if (contents.length === 0) throw new Error('No messages to send')

    const lastContent = contents[contents.length - 1]
    const history = contents.slice(0, -1)

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastContent.parts)
    return result.response.text()
  }

  async *streamChat(
    messages: ChatMessage[],
    config: ChatConfig,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const model = this.createModel(config)
    const contents = this.convertMessages(messages, config.systemPrompt)

    if (contents.length === 0) throw new Error('No messages to send')

    const lastContent = contents[contents.length - 1]
    const history = contents.slice(0, -1)

    const chat = model.startChat({ history })
    const result = await chat.sendMessageStream(lastContent.parts)

    for await (const chunk of result.stream) {
      if (signal?.aborted) break
      const text = chunk.text()
      if (text) yield text
    }
  }

  async vision(image: string, prompt: string, config: ChatConfig): Promise<string> {
    const model = this.createModel(config)
    const parts: Part[] = []

    if (image.startsWith('data:')) {
      const [header, data] = image.split(',')
      const mimeType = header.replace('data:', '').replace(';base64', '')
      parts.push({ inlineData: { mimeType, data } })
    } else {
      parts.push({ text: `[Image URL: ${image}]` })
    }

    parts.push({ text: prompt })

    const result = await model.generateContent(parts)
    return result.response.text()
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.apiKey)}`
    )
    if (!response.ok) {
      const message = await response.text()
      throw new Error(`Gemini model discovery failed: ${response.status} ${message}`)
    }
    const data = await response.json() as {
      models?: Array<{
        name: string
        displayName?: string
        description?: string
        inputTokenLimit?: number
        outputTokenLimit?: number
        supportedGenerationMethods?: string[]
      }>
    }

    return (data.models ?? [])
      .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
      .map((model) => {
        const id = model.name.replace(/^models\//, '')
        return {
          id,
          name: model.displayName || id,
          providerId: this.id,
          contextLength: model.inputTokenLimit,
          maxOutputTokens: model.outputTokenLimit,
          supportsStreaming: true,
          supportsVision: true,
          description: model.description
        }
      })
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
