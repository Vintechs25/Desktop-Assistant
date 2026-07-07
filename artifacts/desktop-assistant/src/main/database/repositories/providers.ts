import { randomUUID } from 'crypto'
import { ProviderConfig } from '../../../shared/types'
import databaseService from '../index'

function rowToProviderConfig(row: Record<string, unknown>): ProviderConfig {
  return {
    id: row.id as string,
    type: row.type as ProviderConfig['type'],
    name: row.name as string,
    apiKey: (row.api_key as string) ?? undefined,
    baseUrl: (row.base_url as string) ?? undefined,
    defaultModel: (row.default_model as string) ?? undefined,
    enabled: row.enabled === 1,
    proxyUrl: (row.proxy_url as string) ?? undefined,
    customHeaders: row.custom_headers
      ? JSON.parse(row.custom_headers as string)
      : undefined,
    availableModels: row.available_models
      ? JSON.parse(row.available_models as string)
      : undefined,
    lastModelRefresh: (row.last_model_refresh as number) ?? undefined,
    capabilities: row.capabilities ? JSON.parse(row.capabilities as string) : undefined,
    health: row.health ? JSON.parse(row.health as string) : undefined,
    fallbackModel: (row.fallback_model as string) ?? undefined,
    temperature: (row.temperature as number) ?? undefined,
    maxTokens: (row.max_tokens as number) ?? undefined,
    topP: (row.top_p as number) ?? undefined,
    presencePenalty: (row.presence_penalty as number) ?? undefined,
    frequencyPenalty: (row.frequency_penalty as number) ?? undefined,
    systemPrompt: (row.system_prompt as string) ?? undefined
  }
}

export const providersRepository = {
  getAll(): ProviderConfig[] {
    const db = databaseService.getDb()
    const rows = db.prepare(`
      SELECT * FROM providers ORDER BY name ASC
    `).all() as Record<string, unknown>[]
    return rows.map(rowToProviderConfig)
  },

  getEnabled(): ProviderConfig[] {
    const db = databaseService.getDb()
    const rows = db.prepare(`
      SELECT * FROM providers WHERE enabled = 1 ORDER BY name ASC
    `).all() as Record<string, unknown>[]
    return rows.map(rowToProviderConfig)
  },

  getById(id: string): ProviderConfig | null {
    const db = databaseService.getDb()
    const row = db.prepare(`SELECT * FROM providers WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined
    return row ? rowToProviderConfig(row) : null
  },

  save(data: Partial<ProviderConfig>): ProviderConfig {
    const db = databaseService.getDb()
    const now = Date.now()

    if (data.id) {
      const existing = this.getById(data.id)
      if (existing) {
        this.update(data.id, data)
        return this.getById(data.id)!
      }
    }

    // Insert new
    const id = data.id ?? randomUUID()

    if (!data.type) throw new Error('type is required')
    if (!data.name) throw new Error('name is required')

    db.prepare(`
      INSERT INTO providers
        (id, type, name, api_key, base_url, default_model, enabled, proxy_url,
         custom_headers, available_models, last_model_refresh, capabilities, health,
         fallback_model, temperature, max_tokens, top_p, presence_penalty,
         frequency_penalty, system_prompt, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.type,
      data.name,
      data.apiKey ?? null,
      data.baseUrl ?? null,
      data.defaultModel ?? null,
      data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1,
      data.proxyUrl ?? null,
      data.customHeaders != null ? JSON.stringify(data.customHeaders) : null,
      data.availableModels != null ? JSON.stringify(data.availableModels) : null,
      data.lastModelRefresh ?? null,
      data.capabilities != null ? JSON.stringify(data.capabilities) : null,
      data.health != null ? JSON.stringify(data.health) : null,
      data.fallbackModel ?? null,
      data.temperature ?? null,
      data.maxTokens ?? null,
      data.topP ?? null,
      data.presencePenalty ?? null,
      data.frequencyPenalty ?? null,
      data.systemPrompt ?? null,
      now,
      now
    )

    return this.getById(id)!
  },

  update(id: string, data: Partial<ProviderConfig>): void {
    const db = databaseService.getDb()
    const fields: string[] = []
    const values: unknown[] = []

    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type) }
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.apiKey !== undefined) { fields.push('api_key = ?'); values.push(data.apiKey ?? null) }
    if (data.baseUrl !== undefined) {
      fields.push('base_url = ?')
      values.push(data.baseUrl ?? null)
    }
    if (data.defaultModel !== undefined) {
      fields.push('default_model = ?')
      values.push(data.defaultModel ?? null)
    }
    if (data.enabled !== undefined) {
      fields.push('enabled = ?')
      values.push(data.enabled ? 1 : 0)
    }
    if (data.proxyUrl !== undefined) {
      fields.push('proxy_url = ?')
      values.push(data.proxyUrl ?? null)
    }
    if (data.customHeaders !== undefined) {
      fields.push('custom_headers = ?')
      values.push(data.customHeaders != null ? JSON.stringify(data.customHeaders) : null)
    }
    if (data.availableModels !== undefined) {
      fields.push('available_models = ?')
      values.push(data.availableModels != null ? JSON.stringify(data.availableModels) : null)
    }
    if (data.lastModelRefresh !== undefined) {
      fields.push('last_model_refresh = ?')
      values.push(data.lastModelRefresh ?? null)
    }
    if (data.capabilities !== undefined) {
      fields.push('capabilities = ?')
      values.push(data.capabilities != null ? JSON.stringify(data.capabilities) : null)
    }
    if (data.health !== undefined) {
      fields.push('health = ?')
      values.push(data.health != null ? JSON.stringify(data.health) : null)
    }
    if (data.fallbackModel !== undefined) {
      fields.push('fallback_model = ?')
      values.push(data.fallbackModel ?? null)
    }
    if (data.temperature !== undefined) {
      fields.push('temperature = ?')
      values.push(data.temperature ?? null)
    }
    if (data.maxTokens !== undefined) {
      fields.push('max_tokens = ?')
      values.push(data.maxTokens ?? null)
    }
    if (data.topP !== undefined) {
      fields.push('top_p = ?')
      values.push(data.topP ?? null)
    }
    if (data.presencePenalty !== undefined) {
      fields.push('presence_penalty = ?')
      values.push(data.presencePenalty ?? null)
    }
    if (data.frequencyPenalty !== undefined) {
      fields.push('frequency_penalty = ?')
      values.push(data.frequencyPenalty ?? null)
    }
    if (data.systemPrompt !== undefined) {
      fields.push('system_prompt = ?')
      values.push(data.systemPrompt ?? null)
    }

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    if (fields.length === 0) return
    db.prepare(`UPDATE providers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  delete(id: string): void {
    const db = databaseService.getDb()
    db.prepare(`DELETE FROM providers WHERE id = ?`).run(id)
  }
}

export default providersRepository
