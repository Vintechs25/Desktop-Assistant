import { randomUUID } from 'crypto'
import { Message } from '../../../shared/types'
import databaseService from '../index'

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as 'user' | 'assistant' | 'system',
    content: row.content as string,
    images: row.images ? JSON.parse(row.images as string) : undefined,
    attachments: row.attachments ? JSON.parse(row.attachments as string) : undefined,
    tokens: row.tokens != null ? (row.tokens as number) : undefined,
    model: (row.model as string) ?? null,
    providerId: (row.provider_id as string) ?? null,
    isError: row.is_error === 1,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    createdAt: row.created_at as number
  }
}

export const messagesRepository = {
  getByConversationId(conversationId: string): Message[] {
    const db = databaseService.getDb()
    const rows = db.prepare(`
      SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
    `).all(conversationId) as Record<string, unknown>[]
    return rows.map(rowToMessage)
  },

  getById(id: string): Message | null {
    const db = databaseService.getDb()
    const row = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined
    return row ? rowToMessage(row) : null
  },

  create(data: Partial<Message>): Message {
    const db = databaseService.getDb()
    const now = Date.now()
    const id = data.id ?? randomUUID()

    if (!data.conversationId) throw new Error('conversationId is required')
    if (!data.role) throw new Error('role is required')
    if (data.content === undefined || data.content === null)
      throw new Error('content is required')

    db.prepare(`
      INSERT INTO messages
        (id, conversation_id, role, content, images, attachments, tokens, model,
         provider_id, is_error, metadata, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.conversationId,
      data.role,
      data.content,
      data.images != null ? JSON.stringify(data.images) : null,
      data.attachments != null ? JSON.stringify(data.attachments) : null,
      data.tokens ?? null,
      data.model ?? null,
      data.providerId ?? null,
      data.isError ? 1 : 0,
      data.metadata != null ? JSON.stringify(data.metadata) : null,
      data.createdAt ?? now
    )

    // Update parent conversation's updated_at
    db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(
      Date.now(),
      data.conversationId
    )

    return this.getById(id)!
  },

  update(id: string, data: Partial<Message>): void {
    const db = databaseService.getDb()
    const fields: string[] = []
    const values: unknown[] = []

    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content) }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role) }
    if (data.images !== undefined) {
      fields.push('images = ?')
      values.push(data.images != null ? JSON.stringify(data.images) : null)
    }
    if (data.attachments !== undefined) {
      fields.push('attachments = ?')
      values.push(data.attachments != null ? JSON.stringify(data.attachments) : null)
    }
    if (data.tokens !== undefined) { fields.push('tokens = ?'); values.push(data.tokens ?? null) }
    if (data.model !== undefined) { fields.push('model = ?'); values.push(data.model ?? null) }
    if (data.providerId !== undefined) {
      fields.push('provider_id = ?')
      values.push(data.providerId ?? null)
    }
    if (data.isError !== undefined) {
      fields.push('is_error = ?')
      values.push(data.isError ? 1 : 0)
    }
    if (data.metadata !== undefined) {
      fields.push('metadata = ?')
      values.push(data.metadata != null ? JSON.stringify(data.metadata) : null)
    }

    if (fields.length === 0) return
    values.push(id)
    db.prepare(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  delete(id: string): void {
    const db = databaseService.getDb()
    db.prepare(`DELETE FROM messages WHERE id = ?`).run(id)
  },

  deleteByConversationId(conversationId: string): void {
    const db = databaseService.getDb()
    db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(conversationId)
  }
}

export default messagesRepository
