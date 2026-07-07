import { OCRResult } from '../../../shared/types'
import databaseService from '../index'

function rowToOCRResult(row: Record<string, unknown>): OCRResult {
  return {
    id: row.id as string,
    text: row.text as string,
    confidence: row.confidence != null ? (row.confidence as number) : 0,
    imageData: (row.image_data as string) ?? undefined,
    source: row.source as OCRResult['source'],
    language: (row.language as string) ?? undefined,
    createdAt: row.created_at as number
  }
}

export const ocrHistoryRepository = {
  getAll(limit = 50): OCRResult[] {
    const db = databaseService.getDb()
    const rows = db.prepare(`
      SELECT * FROM ocr_history ORDER BY created_at DESC LIMIT ?
    `).all(limit) as Record<string, unknown>[]
    return rows.map(rowToOCRResult)
  },

  save(result: OCRResult): void {
    const db = databaseService.getDb()
    db.prepare(`
      INSERT OR REPLACE INTO ocr_history
        (id, text, confidence, image_data, source, language, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `).run(
      result.id,
      result.text,
      result.confidence ?? null,
      result.imageData ?? null,
      result.source,
      result.language ?? null,
      result.createdAt
    )
  },

  delete(id: string): void {
    const db = databaseService.getDb()
    db.prepare(`DELETE FROM ocr_history WHERE id = ?`).run(id)
  },

  clear(): void {
    const db = databaseService.getDb()
    db.prepare(`DELETE FROM ocr_history`).run()
  }
}

export default ocrHistoryRepository
