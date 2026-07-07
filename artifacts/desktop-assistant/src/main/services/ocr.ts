import { createWorker, Worker } from 'tesseract.js'
import { randomUUID } from 'crypto'
import { OCRResult } from '../../shared/types'

let worker: Worker | null = null
let currentLanguage: string | null = null

/**
 * Lazily initializes the Tesseract worker for the given language.
 */
async function ensureWorker(language: string): Promise<Worker> {
  if (worker && currentLanguage === language) {
    return worker
  }

  if (worker) {
    await worker.terminate()
    worker = null
  }

  worker = await createWorker(language)
  currentLanguage = language
  return worker
}

/**
 * Extracts text from a base64-encoded image using Tesseract OCR.
 * @param imageData - Base64-encoded PNG/JPEG image string (with or without data URL prefix)
 * @param language - Tesseract language code (default: 'eng')
 */
export async function extract(imageData: string, language = 'eng'): Promise<OCRResult> {
  const w = await ensureWorker(language)

  // Strip data URL prefix if present
  const base64 = imageData.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')

  const {
    data: { text, confidence }
  } = await w.recognize(buffer)

  return {
    id: randomUUID(),
    text: text.trim(),
    confidence,
    imageData,
    source: 'screen',
    createdAt: Date.now(),
    language
  }
}

/**
 * Extracts text from a base64-encoded image with a specific source tag.
 * @param imageData - Base64-encoded image string
 * @param language - Tesseract language code
 * @param source - Source label for the OCR result
 */
export async function extractWithSource(
  imageData: string,
  language = 'eng',
  source: OCRResult['source'] = 'screen'
): Promise<OCRResult> {
  const result = await extract(imageData, language)
  return { ...result, source }
}

/**
 * Terminates the Tesseract worker and releases resources.
 */
export async function dispose(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
    currentLanguage = null
  }
}

export const OCRService = {
  extract,
  extractWithSource,
  dispose
}
