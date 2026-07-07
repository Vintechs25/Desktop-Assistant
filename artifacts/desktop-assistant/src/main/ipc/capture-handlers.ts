import { ipcMain, desktopCapturer, nativeImage, BrowserWindow, screen } from 'electron'
import { ScreenRegion } from '../../shared/types'
import { OCRService } from '../services/ocr'
import { createRegionSelectorWindow } from '../services/region-selector'

/**
 * Captures the full primary screen and returns a base64 PNG string.
 */
async function captureFullScreen(): Promise<string> {
  const { width, height } = screen.getPrimaryDisplay().size
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height }
  })

  if (!sources || sources.length === 0) {
    throw new Error('No screen sources available')
  }

  const png = sources[0].thumbnail.toPNG()
  return `data:image/png;base64,${png.toString('base64')}`
}

/**
 * Captures the full screen and crops to the given region.
 */
async function captureScreenRegion(region: ScreenRegion): Promise<string> {
  const { width, height } = screen.getPrimaryDisplay().size
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height }
  })

  if (!sources || sources.length === 0) {
    throw new Error('No screen sources available')
  }

  const fullImage = sources[0].thumbnail

  // Crop the image to the specified region
  const cropped = fullImage.crop({
    x: Math.max(0, region.x),
    y: Math.max(0, region.y),
    width: Math.min(region.width, width - region.x),
    height: Math.min(region.height, height - region.y)
  })

  const png = cropped.toPNG()
  return `data:image/png;base64,${png.toString('base64')}`
}

/**
 * Registers IPC handlers for screen capture and OCR operations.
 */
export function registerCaptureHandlers(_mainWindow: BrowserWindow): void {
  // Capture full screen → returns base64 PNG
  ipcMain.handle('capture:screen', async () => {
    try {
      return await captureFullScreen()
    } catch (err) {
      console.error('[capture:screen]', err)
      throw err
    }
  })

  // Capture a specific region → returns base64 PNG
  ipcMain.handle('capture:region', async (_event, region?: ScreenRegion) => {
    try {
      if (region) {
        return await captureScreenRegion(region)
      }
      return await captureFullScreen()
    } catch (err) {
      console.error('[capture:region]', err)
      throw err
    }
  })

  // Show region selection overlay → returns ScreenRegion
  ipcMain.handle('capture:selectRegion', async () => {
    try {
      const region = await createRegionSelectorWindow()
      return region
    } catch (err) {
      console.error('[capture:selectRegion]', err)
      throw err
    }
  })

  // Run OCR on provided base64 image data
  ipcMain.handle('ocr:extract', async (_event, imageData: string, language?: string) => {
    try {
      return await OCRService.extract(imageData, language ?? 'eng')
    } catch (err) {
      console.error('[ocr:extract]', err)
      throw err
    }
  })

  // Capture full screen then run OCR
  ipcMain.handle('ocr:extractFromScreen', async () => {
    try {
      const imageData = await captureFullScreen()
      const result = await OCRService.extractWithSource(imageData, 'eng', 'screen')
      return result
    } catch (err) {
      console.error('[ocr:extractFromScreen]', err)
      throw err
    }
  })

  // Select a region then run OCR on it
  ipcMain.handle('ocr:extractFromRegion', async () => {
    try {
      const region = await createRegionSelectorWindow()
      const imageData = await captureScreenRegion(region)
      const result = await OCRService.extractWithSource(imageData, 'eng', 'region')
      return result
    } catch (err) {
      console.error('[ocr:extractFromRegion]', err)
      throw err
    }
  })
}
