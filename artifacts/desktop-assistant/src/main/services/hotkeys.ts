import { globalShortcut, BrowserWindow } from 'electron'
import { Settings } from '../../shared/types'
import { toggleFloatingWindow } from '../windows/floating-window'

interface WindowRefs {
  mainWindow: BrowserWindow | null
  floatingWindow: BrowserWindow | null
}

/**
 * Registers global shortcuts based on the provided settings.
 * Unregisters all previous shortcuts before re-registering.
 */
export function registerShortcuts(settings: Settings, windows: WindowRefs): void {
  // Unregister all existing shortcuts first
  globalShortcut.unregisterAll()

  const { shortcuts } = settings

  // Toggle main window visibility
  if (shortcuts.toggleWindow) {
    safeRegister(shortcuts.toggleWindow, () => {
      const { mainWindow } = windows
      if (!mainWindow) return
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  }

  // Trigger screen capture
  if (shortcuts.captureScreen) {
    safeRegister(shortcuts.captureScreen, () => {
      const { mainWindow } = windows
      if (!mainWindow) return
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('app:captureScreen')
    })
  }

  // Trigger region capture
  if (shortcuts.captureRegion) {
    safeRegister(shortcuts.captureRegion, () => {
      const { mainWindow } = windows
      if (!mainWindow) return
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('app:captureRegion')
    })
  }

  // Toggle floating window
  if (shortcuts.captureWindow) {
    safeRegister(shortcuts.captureWindow, () => {
      toggleFloatingWindow()
    })
  }

  // New conversation
  if (shortcuts.newConversation) {
    safeRegister(shortcuts.newConversation, () => {
      const { mainWindow } = windows
      if (!mainWindow) return
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('app:newConversation')
    })
  }

  // Command palette
  if (shortcuts.commandPalette) {
    safeRegister(shortcuts.commandPalette, () => {
      const { mainWindow } = windows
      if (!mainWindow) return
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('app:openCommandPalette')
    })
  }
}

/**
 * Unregisters all global shortcuts.
 */
export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll()
}

/**
 * Safely registers a global shortcut, ignoring errors for invalid/taken shortcuts.
 */
function safeRegister(accelerator: string, callback: () => void): void {
  try {
    if (!accelerator || accelerator.trim() === '') return
    const success = globalShortcut.register(accelerator, callback)
    if (!success) {
      console.warn(`[hotkeys] Failed to register shortcut: ${accelerator}`)
    }
  } catch (err) {
    console.error(`[hotkeys] Error registering shortcut "${accelerator}":`, err)
  }
}
