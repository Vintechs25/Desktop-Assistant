import { ipcMain, shell, app, dialog, clipboard } from 'electron'
import { promises as fs } from 'fs'

/**
 * Registers IPC handlers for system-level operations.
 */
export function registerSystemHandlers(): void {
  // Open a URL in the default browser
  ipcMain.handle('system:openExternal', async (_event, url: string) => {
    try {
      await shell.openExternal(url)
    } catch (err) {
      console.error('[system:openExternal]', err)
      throw err
    }
  })

  // Get an Electron app path (userData, downloads, etc.)
  ipcMain.handle('system:getPath', (_event, name: string) => {
    try {
      return app.getPath(name as Parameters<typeof app.getPath>[0])
    } catch (err) {
      console.error('[system:getPath]', err)
      throw err
    }
  })

  // Show a native save dialog
  ipcMain.handle('system:showSaveDialog', async (_event, options: Electron.SaveDialogOptions) => {
    try {
      const result = await dialog.showSaveDialog(options)
      return result.canceled ? null : (result.filePath ?? null)
    } catch (err) {
      console.error('[system:showSaveDialog]', err)
      throw err
    }
  })

  // Show a native open dialog
  ipcMain.handle('system:showOpenDialog', async (_event, options: Electron.OpenDialogOptions) => {
    try {
      const result = await dialog.showOpenDialog(options)
      return result.canceled || result.filePaths.length === 0 ? null : result.filePaths
    } catch (err) {
      console.error('[system:showOpenDialog]', err)
      throw err
    }
  })

  // Save an attachment to disk
  ipcMain.handle('system:saveFile', async (_event, attachment: { name: string; data?: string; type?: string }) => {
    try {
      const outputPath = await dialog.showSaveDialog({
        title: 'Save attachment',
        defaultPath: attachment.name,
        filters: [{ name: 'All files', extensions: ['*'] }],
      })
      if (!outputPath || !outputPath.filePath) return null

      const data = attachment.data ?? ''
      let buffer: Buffer
      if (data.startsWith('data:')) {
        const [, base64] = data.split(',')
        buffer = Buffer.from(base64, 'base64')
      } else {
        buffer = Buffer.from(data, attachment.type?.includes('text') ? 'utf-8' : 'base64')
      }

      await fs.writeFile(outputPath.filePath, buffer)
      return outputPath.filePath
    } catch (err) {
      console.error('[system:saveFile]', err)
      throw err
    }
  })

  // Read a file and return its contents as a string
  ipcMain.handle('system:readFile', async (_event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return content
    } catch (err) {
      console.error('[system:readFile]', err)
      throw err
    }
  })

  // Write a string to a file
  ipcMain.handle('system:writeFile', async (_event, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8')
    } catch (err) {
      console.error('[system:writeFile]', err)
      throw err
    }
  })

  // Copy text to the clipboard
  ipcMain.handle('system:copyToClipboard', (_event, text: string) => {
    try {
      clipboard.writeText(text)
    } catch (err) {
      console.error('[system:copyToClipboard]', err)
      throw err
    }
  })

  // Read text from the clipboard
  ipcMain.handle('system:readClipboard', () => {
    try {
      return clipboard.readText()
    } catch (err) {
      console.error('[system:readClipboard]', err)
      throw err
    }
  })

  // Get the application version
  ipcMain.handle('system:getVersion', () => {
    return app.getVersion()
  })

  // Check for updates (placeholder — returns no update available)
  ipcMain.handle('system:checkUpdate', async () => {
    return { available: false }
  })
}
