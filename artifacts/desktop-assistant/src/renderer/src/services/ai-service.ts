import type { ChatMessage, ChatConfig, ModelInfo, ProviderConfig } from '@shared/types'
import { providerManager } from '../providers'

class AIService {
  private abortController: AbortController | null = null

  /**
   * Send a message using the active provider, streaming tokens back via onChunk.
   * Calls onComplete with the full assembled text when finished.
   * Calls onError with a descriptive message on failure.
   */
  async sendMessage(
    messages: ChatMessage[],
    config: ChatConfig,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: string) => void,
    providerId: string,
    onFallback?: (message: string) => void
  ): Promise<void> {
    // Cancel any previous in-flight request
    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()
    const { signal } = this.abortController

    let fullText = ''

    try {
      if (config.stream !== false) {
        for await (const chunk of providerManager.streamChat({
          providerId,
          messages,
          config,
          signal,
          onFallback: ({ fromModel, toModel, reason }) => {
            onFallback?.(`${reason} Switched from ${fromModel ?? 'the selected model'} to ${toModel}.`)
          }
        })) {
            fullText += chunk
            onChunk(chunk)
        }
      } else {
        const result = await providerManager.chat({
          providerId,
          messages,
          config,
          onFallback: ({ fromModel, toModel, reason }) => {
            onFallback?.(`${reason} Switched from ${fromModel ?? 'the selected model'} to ${toModel}.`)
          }
        })
        fullText = result
        onChunk(result)
      }

      onComplete(fullText)
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // User cancelled — still complete with whatever was received
          onComplete(fullText)
        } else {
          onError(err.message)
        }
      } else {
        onError(String(err))
      }
    } finally {
      this.abortController = null
    }
  }

  /**
   * Abort the currently active streaming request.
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * List models available from a registered provider.
   */
  async listModels(providerId: string): Promise<ModelInfo[]> {
    return providerManager.listModels(providerId)
  }

  /**
   * Test connectivity for a given provider config without permanently registering it.
   * Temporarily registers the provider under a unique test ID, tests it, then removes it.
   */
  async testProvider(config: ProviderConfig): Promise<boolean> {
    const testId = `__test__${config.id}__${Date.now()}`
    const testConfig: ProviderConfig = { ...config, id: testId }

    providerManager.register(testConfig)
    try {
      return await providerManager.testConnection(testId)
    } finally {
      providerManager.unregister(testId)
    }
  }

  /**
   * Generate a short title for a conversation based on the first user message.
   * Falls back to a truncated version of the message if the AI call fails.
   */
  async generateTitle(
    firstMessage: string,
    config: ChatConfig,
    providerId: string
  ): Promise<string> {
    if (!providerManager.has(providerId)) {
      return this.truncateTitle(firstMessage)
    }

    const titleConfig: ChatConfig = {
      ...config,
      maxTokens: 60,
      stream: false,
      systemPrompt:
        'Generate a concise, descriptive title (5 words or fewer) for this conversation based on the user message. Respond with only the title, no punctuation or quotes.'
    }

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: `User message: "${firstMessage.slice(0, 500)}"`
      }
    ]

    try {
      const title = await providerManager.chat({ providerId, messages, config: titleConfig })
      return title.trim().replace(/^["']|["']$/g, '').slice(0, 80) || this.truncateTitle(firstMessage)
    } catch {
      return this.truncateTitle(firstMessage)
    }
  }

  private truncateTitle(text: string): string {
    const cleaned = text.trim().replace(/\s+/g, ' ')
    return cleaned.length > 50 ? `${cleaned.slice(0, 50)}…` : cleaned
  }
}

export const aiService = new AIService()
export { AIService }
