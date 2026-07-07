import type { ProviderConfig, ProviderType } from '@shared/types'
import { OpenAICompatibleProvider } from './openai-compatible-provider'

export class XAIProvider extends OpenAICompatibleProvider {
  readonly type: ProviderType = 'xai'

  constructor(config: ProviderConfig) {
    super({ ...config, type: 'xai' })
  }
}
