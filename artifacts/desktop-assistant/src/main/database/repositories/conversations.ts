import { randomUUID } from 'crypto'
import { Conversation, Message } from '../../../shared/types'
import databaseService from '../index'

function rowToConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    title: row.title as string,
    folderId: (row.folder_id as string) ?? null,
    summary: (row.summary as string) ?? null,
    model: (row.model as string) ?? null,
    providerId: (row.provider_id as string) ?? null,
    pinned: row.pinned === 1,
    archived: row.archived === 1,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    messageCount: (row.message_count as number) ?? undefined,
    lastMessage: (row.last_message as string) ?? null
  }
}

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as 'user' | 'assistant' | 'system',
    content: row.content as string,
    images: row.images ? JSON.parse(row.images as string) : undefined,
    attachments: row.attachments ? JSON.parse(row.attachments as string) : undefined,
    tokens: (row.tokens as number) ?? undefined,
    model: (row.model as string) ?? null,
    providerId: (row.provider_id as string) ?? null,
    isError: row.is_error === 1,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    createdAt: row.created_at as number
  }
}

export const conversationsRepository = {
  getAll(includeArchived = false): Conversation[] {
    const db = databaseService.getDb()
    const query = `
      SELECT
        c.*,
        COUNT(m.id) AS message_count,
        (
          SELECT m2.content
          FROM messages m2
          WHERE m2.conversation_id = c.id
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) AS last_message
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      ${includeArchived ? '' : 'WHERE c.archived = 0'}
      GROUP BY c.id
      ORDER BY c.pinned DESC, c.updated_at DESC
    `
    const rows = db.prepare(query).all() as Record<string, unknown>[]
    return rows.map(rowToConversation)
  },

  getById(id: string): Conversation | null {
    const db = databaseService.getDb()
    const row = db.prepare(`
      SELECT
        c.*,
        COUNT(m.id) AS message_count,
        (
          SELECT m2.content
          FROM messages m2
          WHERE m2.conversation_id = c.id
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) AS last_message
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id) as Record<string, unknown> | undefined
    return row ? rowToConversation(row) : null
  },

  create(data: Partial<Conversation>): Conversation {
    const db = databaseService.getDb()
    const now = Date.now()
    const id = data.id ?? randomUUID()
    db.prepare(`
      INSERT INTO conversations
        (id, title, folder_id, summary, model, provider_id, pinned, archived, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.title ?? 'New Conversation',
      data.folderId ?? null,
      data.summary ?? null,
      data.model ?? null,
      data.providerId ?? null,
      data.pinned ? 1 : 0,
      data.archived ? 1 : 0,
      data.createdAt ?? now,
      data.updatedAt ?? now
    )
    return this.getById(id)!
  },

  update(id: string, data: Partial<Conversation>): void {
    const db = databaseService.getDb()
    const fields: string[] = []
    const values: unknown[] = []

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.folderId !== undefined) { fields.push('folder_id = ?'); values.push(data.folderId) }
    if (data.summary !== undefined) { fields.push('summary = ?'); values.push(data.summary) }
    if (data.model !== undefined) { fields.push('model = ?'); values.push(data.model) }
    if (data.providerId !== undefined) { fields.push('provider_id = ?'); values.push(data.providerId) }
    if (data.pinned !== undefined) { fields.push('pinned = ?'); values.push(data.pinned ? 1 : 0) }
    if (data.archived !== undefined) { fields.push('archived = ?'); values.push(data.archived ? 1 : 0) }

    fields.push('updated_at = ?')
    values.push(data.updatedAt ?? Date.now())
    values.push(id)

    if (fields.length === 0) return
    db.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  delete(id: string): void {
    const db = databaseService.getDb()
    db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id)
  },

  search(query: string): Conversation[] {
    const db = databaseService.getDb()
    const like = `%${query}%`
    const rows = db.prepare(`
      SELECT
        c.*,
        COUNT(m.id) AS message_count,
        (
          SELECT m2.content
          FROM messages m2
          WHERE m2.conversation_id = c.id
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) AS last_message
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.title LIKE ? OR c.summary LIKE ? OR EXISTS (
        SELECT 1 FROM messages ms WHERE ms.conversation_id = c.id AND ms.content LIKE ?
      )
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `).all(like, like, like) as Record<string, unknown>[]
    return rows.map(rowToConversation)
  },

  export(id: string, format: 'json' | 'md' | 'txt'): string {
    const db = databaseService.getDb()
    const conversation = this.getById(id)
    if (!conversation) throw new Error(`Conversation ${id} not found`)

    const messageRows = db.prepare(`
      SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
    `).all(id) as Record<string, unknown>[]
    const messages = messageRows.map(rowToMessage)

    if (format === 'json') {
      return JSON.stringify({ conversation, messages }, null, 2)
    }

    if (format === 'md') {
      const lines: string[] = []
      lines.push(`# ${conversation.title}`)
      lines.push('')
      if (conversation.summary) {
        lines.push(`> ${conversation.summary}`)
        lines.push('')
      }
      lines.push(`**Created:** ${new Date(conversation.createdAt).toLocaleString()}`)
      lines.push(`**Updated:** ${new Date(conversation.updatedAt).toLocaleString()}`)
      if (conversation.model) lines.push(`**Model:** ${conversation.model}`)
      lines.push('')
      lines.push('---')
      lines.push('')

      for (const msg of messages) {
        const roleLabel = msg.role === 'user' ? '### 👤 User' :
          msg.role === 'assistant' ? '### 🤖 Assistant' : '### ⚙️ System'
        lines.push(roleLabel)
        lines.push('')
        lines.push(msg.content)
        lines.push('')
        lines.push(`*${new Date(msg.createdAt).toLocaleString()}*`)
        lines.push('')
        lines.push('---')
        lines.push('')
      }

      return lines.join('\n')
    }

    // txt format
    const lines: string[] = []
    lines.push(conversation.title)
    lines.push('='.repeat(conversation.title.length))
    lines.push('')
    if (conversation.summary) {
      lines.push(`Summary: ${conversation.summary}`)
      lines.push('')
    }
    lines.push(`Created: ${new Date(conversation.createdAt).toLocaleString()}`)
    lines.push(`Updated: ${new Date(conversation.updatedAt).toLocaleString()}`)
    if (conversation.model) lines.push(`Model: ${conversation.model}`)
    lines.push('')
    lines.push('-'.repeat(40))
    lines.push('')

    for (const msg of messages) {
      const roleLabel = msg.role === 'user' ? 'User' :
        msg.role === 'assistant' ? 'Assistant' : 'System'
      lines.push(`[${roleLabel}] ${new Date(msg.createdAt).toLocaleString()}`)
      lines.push(msg.content)
      lines.push('')
      lines.push('-'.repeat(40))
      lines.push('')
    }

    return lines.join('\n')
  }
}

export default conversationsRepository
