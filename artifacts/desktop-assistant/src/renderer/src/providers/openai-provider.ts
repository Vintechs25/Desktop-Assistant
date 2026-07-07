import type { ProviderConfig, ProviderType } from '@shared/types'
import { OpenAICompatibleProvider } from './openai-compatible-provider'

export class OpenAIProvider extends OpenAICompatibleProvider {
  readonly type: ProviderType = 'openai'

  constructor(config: ProviderConfig) {
    super({ ...config, type: 'openai' })
  }
}
