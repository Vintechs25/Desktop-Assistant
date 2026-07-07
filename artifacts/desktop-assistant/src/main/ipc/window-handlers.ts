import { ipcMain, BrowserWindow } from 'electron'
import { WindowMode } from '../../shared/types'

/**
 * Registers IPC handlers for window management operations.
 */
export function registerWindowHandlers(
  mainWindow: BrowserWindow,
  floatingWindow: BrowserWindow
): void {
  // Minimize the main window
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize()
  })

  // Maximize or restore the main window
  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  // Close the main window
  ipcMain.handle('window:close', () => {
    mainWindow.close()
  })

  // Set window opacity (works on transparent windows)
  ipcMain.handle('window:setOpacity', (_event, opacity: number) => {
    const clamped = Math.max(0.1, Math.min(1.0, opacity))
    mainWindow.setOpacity(clamped)
  })

  // Set the window display mode
  ipcMain.handle('window:setMode', (_event, mode: WindowMode) => {
    switch (mode) {
      case 'floating':
        mainWindow.setAlwaysOnTop(true)
        mainWindow.setResizable(true)
        mainWindow.setSize(380, 600)
        break
      case 'sidebar':
        mainWindow.setAlwaysOnTop(false)
        mainWindow.setResizable(true)
        break
      case 'normal':
      default:
        mainWindow.setAlwaysOnTop(false)
        mainWindow.setResizable(true)
        mainWindow.setSize(1200, 800)
        break
    }
    // Notify renderer of mode change
    mainWindow.webContents.send('window:modeChanged', mode)
  })

  // Toggle floating window visibility
  ipcMain.handle('window:toggleFloat', () => {
    if (floatingWindow.isVisible()) {
      floatingWindow.hide()
    } else {
      floatingWindow.show()
      floatingWindow.focus()
    }
  })

  // Content protection toggle (enable/disable screenshots & screen sharing for windows)
  ipcMain.handle('window:setContentProtection', (_event, enabled: boolean) => {
    try {
      mainWindow.setContentProtection(Boolean(enabled))
    } catch {}
    try {
      floatingWindow.setContentProtection(Boolean(enabled))
    } catch {}
  })
}

