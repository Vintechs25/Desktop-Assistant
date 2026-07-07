import { randomUUID } from 'crypto'
import { PromptTemplate, PromptCategory } from '../../../shared/types'
import databaseService from '../index'

function rowToPromptTemplate(row: Record<string, unknown>): PromptTemplate {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    content: row.content as string,
    category: row.category as PromptCategory,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    isFavorite: row.is_favorite === 1,
    usageCount: row.usage_count as number,
    isBuiltin: row.is_builtin === 1,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number
  }
}

export const promptsRepository = {
  getAll(): PromptTemplate[] {
    const db = databaseService.getDb()
    const rows = db.prepare(`
      SELECT * FROM prompt_templates ORDER BY is_builtin DESC, usage_count DESC, title ASC
    `).all() as Record<string, unknown>[]
    return rows.map(rowToPromptTemplate)
  },

  getByCategory(category: PromptCategory): PromptTemplate[] {
    const db = databaseService.getDb()
    const rows = db.prepare(`
      SELECT * FROM prompt_templates WHERE category = ?
      ORDER BY is_builtin DESC, usage_count DESC, title ASC
    `).all(category) as Record<string, unknown>[]
    return rows.map(rowToPromptTemplate)
  },

  getFavorites(): PromptTemplate[] {
    const db = databaseService.getDb()
    const rows = db.prepare(`
      SELECT * FROM prompt_templates WHERE is_favorite = 1
      ORDER BY usage_count DESC, title ASC
    `).all() as Record<string, unknown>[]
    return rows.map(rowToPromptTemplate)
  },

  getById(id: string): PromptTemplate | null {
    const db = databaseService.getDb()
    const row = db.prepare(`SELECT * FROM prompt_templates WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined
    return row ? rowToPromptTemplate(row) : null
  },

  save(data: Partial<PromptTemplate>): PromptTemplate {
    const db = databaseService.getDb()
    const now = Date.now()

    if (data.id) {
      // Update existing
      const existing = this.getById(data.id)
      if (existing) {
        const fields: string[] = []
        const values: unknown[] = []

        if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
        if (data.description !== undefined) {
          fields.push('description = ?')
          values.push(data.description ?? null)
        }
        if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content) }
        if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category) }
        if (data.tags !== undefined) {
          fields.push('tags = ?')
          values.push(JSON.stringify(data.tags))
        }
        if (data.isFavorite !== undefined) {
          fields.push('is_favorite = ?')
          values.push(data.isFavorite ? 1 : 0)
        }
        if (data.usageCount !== undefined) {
          fields.push('usage_count = ?')
          values.push(data.usageCount)
        }

        fields.push('updated_at = ?')
        values.push(now)
        values.push(data.id)

        if (fields.length > 0) {
          db.prepare(`UPDATE prompt_templates SET ${fields.join(', ')} WHERE id = ?`).run(
            ...values
          )
        }

        return this.getById(data.id)!
      }
    }

    // Insert new
    const id = data.id ?? randomUUID()

    if (!data.title) throw new Error('title is required')
    if (!data.content) throw new Error('content is required')
    if (!data.category) throw new Error('category is required')

    db.prepare(`
      INSERT INTO prompt_templates
        (id, title, description, content, category, tags, is_favorite, usage_count,
         is_builtin, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.title,
      data.description ?? null,
      data.content,
      data.category,
      JSON.stringify(data.tags ?? []),
      data.isFavorite ? 1 : 0,
      data.usageCount ?? 0,
      data.isBuiltin ? 1 : 0,
      data.createdAt ?? now,
      data.updatedAt ?? now
    )

    return this.getById(id)!
  },

  delete(id: string): void {
    const db = databaseService.getDb()
    db.prepare(`DELETE FROM prompt_templates WHERE id = ?`).run(id)
  },

  incrementUsage(id: string): void {
    const db = databaseService.getDb()
    db.prepare(`
      UPDATE prompt_templates SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?
    `).run(Date.now(), id)
  },

  toggleFavorite(id: string): void {
    const db = databaseService.getDb()
    db.prepare(`
      UPDATE prompt_templates
      SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
          updated_at = ?
      WHERE id = ?
    `).run(Date.now(), id)
  }
}

export default promptsRepository
