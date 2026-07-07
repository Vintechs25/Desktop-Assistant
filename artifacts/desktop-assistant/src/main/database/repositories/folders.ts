import { randomUUID } from 'crypto'
import { ConversationFolder } from '../../../shared/types'
import databaseService from '../index'

function rowToFolder(row: Record<string, unknown>): ConversationFolder {
  return {
    id: row.id as string,
    name: row.name as string,
    color: (row.color as string) ?? undefined,
    order: row.order_index as number,
    createdAt: row.created_at as number
  }
}

export const foldersRepository = {
  getAll(): ConversationFolder[] {
    const db = databaseService.getDb()
    const rows = db.prepare(`
      SELECT * FROM conversation_folders ORDER BY order_index ASC, name ASC
    `).all() as Record<string, unknown>[]
    return rows.map(rowToFolder)
  },

  create(data: Partial<ConversationFolder>): ConversationFolder {
    const db = databaseService.getDb()
    const now = Date.now()
    const id = data.id ?? randomUUID()

    if (!data.name) throw new Error('name is required')

    // Determine the next order_index if not provided
    let orderIndex = data.order
    if (orderIndex == null) {
      const result = db.prepare(
        `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM conversation_folders`
      ).get() as { next_order: number }
      orderIndex = result.next_order
    }

    db.prepare(`
      INSERT INTO conversation_folders (id, name, color, order_index, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.name, data.color ?? null, orderIndex, data.createdAt ?? now)

    const row = db.prepare(`SELECT * FROM conversation_folders WHERE id = ?`).get(id) as
      Record<string, unknown>
    return rowToFolder(row)
  },

  update(id: string, data: Partial<ConversationFolder>): void {
    const db = databaseService.getDb()
    const fields: string[] = []
    const values: unknown[] = []

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color ?? null) }
    if (data.order !== undefined) { fields.push('order_index = ?'); values.push(data.order) }

    if (fields.length === 0) return
    values.push(id)
    db.prepare(`UPDATE conversation_folders SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  delete(id: string): void {
    const db = databaseService.getDb()
    // Conversations referencing this folder will have folder_id set to NULL via ON DELETE SET NULL
    db.prepare(`DELETE FROM conversation_folders WHERE id = ?`).run(id)
  }
}

export default foldersRepository
