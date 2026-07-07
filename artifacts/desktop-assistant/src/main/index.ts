import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { optimizer } from '@electron-toolkit/utils'
import { createMainWindow, getMainWindow } from './windows/main-window'
import { createFloatingWindow, getFloatingWindow } from './windows/floating-window'
import { registerAllHandlers } from './ipc/handlers'
import databaseService from './database/index'
import { createTray, destroyTray } from './services/tray'
import { registerShortcuts, unregisterAllShortcuts } from './services/hotkeys'
import { SettingsRepository } from './database/repositories'
import { OCRService } from './services/ocr'

// ─── Single Instance Lock ─────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // If someone opens a second instance, focus the main window
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // ─── App Ready ─────────────────────────────────────────────────────────────

  // Keep hardware acceleration enabled on Windows — disabling it breaks DWM
  // composition required for alpha transparency.

  app.whenReady().then(async () => {
    // Initialize the SQLite database and run migrations
    try {
      databaseService.initialize()
    } catch (err) {
      console.error('[main] Failed to initialize database:', err)
    }

    // Create main and floating windows
    const mainWindow = createMainWindow()
    const floatingWindow = createFloatingWindow()

    // Register all IPC handlers
    registerAllHandlers(mainWindow, floatingWindow)

    // Set up the system tray
    try {
      createTray()
    } catch (err) {
      console.error('[main] Failed to create tray:', err)
    }

    // Register global shortcuts from persisted settings
    try {
      const settings = SettingsRepository.get()
      registerShortcuts(settings, {
        mainWindow: getMainWindow(),
        floatingWindow: getFloatingWindow()
      })
    } catch (err) {
      console.error('[main] Failed to register shortcuts:', err)
    }

    // Listen for settings updates so shortcuts can be re-registered
    ipcMain.on('settings:updated', () => {
      try {
        const settings = SettingsRepository.get()
        registerShortcuts(settings, {
          mainWindow: getMainWindow(),
          floatingWindow: getFloatingWindow()
        })
      } catch (err) {
        console.error('[main] Failed to re-register shortcuts after settings update:', err)
      }
    })

    // Electron optimizer — opens devtools on F12, etc.
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    app.on('activate', () => {
      // macOS: re-create a window if none are open
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      } else {
        const win = getMainWindow()
        if (win) {
          win.show()
          win.focus()
        }
      }
    })
  })

  // ─── App Events ────────────────────────────────────────────────────────────

  app.on('window-all-closed', () => {
    // On macOS it's conventional to keep running until Cmd+Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', async () => {
    // Unregister shortcuts and clean up resources
    unregisterAllShortcuts()
    destroyTray()

    try {
      await OCRService.dispose()
    } catch (err) {
      console.error('[main] Error disposing OCR service:', err)
    }

    try {
      databaseService.close()
    } catch (err) {
      console.error('[main] Error closing database:', err)
    }
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}
