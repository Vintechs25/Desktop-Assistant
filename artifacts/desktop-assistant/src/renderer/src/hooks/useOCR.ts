import { useState, useCallback } from 'react'
import type { OCRResult } from '@shared/types'
import { useUIStore } from '../stores/ui-store'

interface UseOCRResult {
  captureScreen: () => Promise<OCRResult | null>
  captureRegion: () => Promise<OCRResult | null>
  isLoading: boolean
  result: OCRResult | null
  error: string | null
  clearResult: () => void
}

export function useOCR(): UseOCRResult {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<OCRResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const addNotification = useUIStore((s) => s.addNotification)

  const captureScreen = useCallback(async (): Promise<OCRResult | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const ocr = await window.api['ocr:extractFromScreen']()
      setResult(ocr)
      addNotification({ type: 'success', title: 'Screen captured', message: 'OCR extraction complete.' })
      return ocr
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to capture screen'
      setError(msg)
      addNotification({ type: 'error', title: 'Capture failed', message: msg })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [addNotification])

  const captureRegion = useCallback(async (): Promise<OCRResult | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const ocr = await window.api['ocr:extractFromRegion']()
      setResult(ocr)
      addNotification({ type: 'success', title: 'Region captured', message: 'OCR extraction complete.' })
      return ocr
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to capture region'
      setError(msg)
      addNotification({ type: 'error', title: 'Capture failed', message: msg })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [addNotification])

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { captureScreen, captureRegion, isLoading, result, error, clearResult }
}
