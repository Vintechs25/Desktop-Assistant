import type { ProviderConfig, ProviderType } from '@shared/types'
import { OpenAICompatibleProvider } from './openai-compatible-provider'

export class CustomProvider extends OpenAICompatibleProvider {
  readonly type: ProviderType = 'custom'

  constructor(config: ProviderConfig) {
    super({ ...config, type: 'custom' })
  }
}
