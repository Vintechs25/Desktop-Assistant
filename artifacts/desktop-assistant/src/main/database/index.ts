import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { runMigrations } from './migrations'

class DatabaseService {
  private db: Database.Database | null = null

  initialize(): void {
    const dbPath = path.join(app.getPath('userData'), 'assistant.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    runMigrations(this.db)
  }

  getDb(): Database.Database {
    if (!this.db) throw new Error('Database not initialized')
    return this.db
  }

  close(): void {
    this.db?.close()
  }
}

export const databaseService = new DatabaseService()
export default databaseService
