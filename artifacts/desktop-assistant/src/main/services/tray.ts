import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import { getMainWindow } from '../windows/main-window'
import { getFloatingWindow } from '../windows/floating-window'

let tray: Tray | null = null

/**
 * Builds the tray context menu.
 */
function buildContextMenu(): Electron.Menu {
  const mainWindow = getMainWindow()

  return Menu.buildFromTemplate([
    {
      label: mainWindow?.isVisible() ? 'Hide Assistant' : 'Show Assistant',
      click: () => {
        const win = getMainWindow()
        if (!win) return
        if (win.isVisible()) {
          win.hide()
        } else {
          win.show()
          win.focus()
        }
        // Rebuild menu to reflect updated state
        tray?.setContextMenu(buildContextMenu())
      }
    },
    {
      label: 'New Conversation',
      click: () => {
        const win = getMainWindow()
        if (!win) return
        win.show()
        win.focus()
        win.webContents.send('app:newConversation')
      }
    },
    {
      label: 'Capture Screen',
      click: () => {
        const win = getMainWindow()
        if (!win) return
        win.webContents.send('app:captureScreen')
      }
    },
    { type: 'separator' },
    {
      label: 'Floating Window',
      click: () => {
        const floatingWin = getFloatingWindow()
        if (!floatingWin) return
        if (floatingWin.isVisible()) {
          floatingWin.hide()
        } else {
          floatingWin.show()
          floatingWin.focus()
        }
      }
    },
    {
      label: 'Settings',
      click: () => {
        const win = getMainWindow()
        if (!win) return
        win.show()
        win.focus()
        win.webContents.send('app:openSettings')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      role: 'quit'
    }
  ])
}

/**
 * Creates the system tray icon and context menu.
 */
export function createTray(): Tray {
  // Try to load a tray icon from resources, fall back to a blank nativeImage
  let icon: Electron.NativeImage
  try {
    const iconPath = join(
      __dirname,
      '../../resources',
      process.platform === 'darwin' ? 'trayIconTemplate.png' : 'trayIcon.png'
    )
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty()
    }
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('AI Assistant')

  const contextMenu = buildContextMenu()
  tray.setContextMenu(contextMenu)

  // Click on tray icon toggles main window
  tray.on('click', () => {
    const win = getMainWindow()
    if (!win) return
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
    // Rebuild menu to reflect updated state
    tray?.setContextMenu(buildContextMenu())
  })

  // macOS: double-click shows window
  tray.on('double-click', () => {
    const win = getMainWindow()
    if (!win) return
    win.show()
    win.focus()
  })

  return tray
}

/**
 * Destroys the system tray icon.
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

/**
 * Returns the current tray instance, or null if not created.
 */
export function getTray(): Tray | null {
  return tray
}
