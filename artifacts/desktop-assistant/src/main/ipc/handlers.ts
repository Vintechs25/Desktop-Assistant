import { BrowserWindow } from 'electron'
import { registerWindowHandlers } from './window-handlers'
import { registerCaptureHandlers } from './capture-handlers'
import { registerDatabaseHandlers } from './database-handlers'
import { registerSystemHandlers } from './system-handlers'

/**
 * Registers all IPC handlers for the application.
 * Call this once after both windows have been created.
 *
 * @param mainWindow - The main application window
 * @param floatingWindow - The floating assistant window
 */
export function registerAllHandlers(
  mainWindow: BrowserWindow,
  floatingWindow: BrowserWindow
): void {
  registerWindowHandlers(mainWindow, floatingWindow)
  registerCaptureHandlers(mainWindow)
  registerDatabaseHandlers()
  registerSystemHandlers()
}
