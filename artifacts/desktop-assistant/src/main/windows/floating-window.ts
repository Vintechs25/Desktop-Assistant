import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let floatingWindow: BrowserWindow | null = null

/**
 * Creates and returns the floating always-on-top assistant window.
 */
export function createFloatingWindow(): BrowserWindow {
  const preload = join(__dirname, '../preload/index.js')

  floatingWindow = new BrowserWindow({
    width: 380,
    height: 600,
    show: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    // Remove shadows unconditionally to avoid DWM artifacts on Windows
    hasShadow: false,
    // Start with a solid fallback background so the window paints correctly
    backgroundColor: '#1e293b',
    opacity: 0.96,
    resizable: true,
    movable: true,
    skipTaskbar: true,
    fullscreenable: false,
    acceptFirstMouse: true,
    vibrancy: process.platform === 'darwin' ? 'ultra-dark' : undefined,
    thickFrame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Prevent the floating window from being captured in screenshots or screen sharing.
  try {
    floatingWindow.setContentProtection(true)
  } catch {}

  floatingWindow.once('ready-to-show', () => {
    // Switch to transparent after first paint so DWM composes correctly
    try {
      floatingWindow?.setBackgroundColor('#00000000')
    } catch {}
    // Don't show automatically — toggled by user
  })

  floatingWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    floatingWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#floating`)
  } else {
    floatingWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'floating'
    })
  }

  floatingWindow.on('closed', () => {
    floatingWindow = null
  })

  return floatingWindow
}

/**
 * Returns the existing floating window instance, or null if not created.
 */
export function getFloatingWindow(): BrowserWindow | null {
  return floatingWindow
}

/**
 * Toggles the floating window visibility.
 */
export function toggleFloatingWindow(): void {
  if (!floatingWindow) return

  if (floatingWindow.isVisible()) {
    floatingWindow.hide()
  } else {
    floatingWindow.show()
    floatingWindow.focus()
  }
}
