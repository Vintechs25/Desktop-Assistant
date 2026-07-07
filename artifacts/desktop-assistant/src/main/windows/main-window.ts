import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

/**
 * Creates and returns the main application BrowserWindow.
 */
export function createMainWindow(): BrowserWindow {
  const preload = join(__dirname, '../preload/index.js')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: true,
    // Remove shadows unconditionally to avoid DWM composition artifacts on Windows
    hasShadow: false,
    alwaysOnTop: true,
    // Start with a solid fallback background to ensure the window paints
    backgroundColor: '#1e293b',
    acceptFirstMouse: true,
    movable: true,
    skipTaskbar: false,
    thickFrame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Prevent the window contents from being captured in screenshots or screen sharing.
  try {
    mainWindow.setContentProtection(true)
  } catch {}

  mainWindow.once('ready-to-show', () => {
    // Magic sequence for Windows: switch to transparent and then show+focus
    try {
      mainWindow?.setBackgroundColor('#00000000')
    } catch {}
    mainWindow!.show()
    try {
      mainWindow!.focus()
    } catch {}
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

/**
 * Returns the existing main window instance, or null if not created.
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
