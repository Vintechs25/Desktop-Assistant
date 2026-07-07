import { contextBridge, ipcRenderer } from 'electron'

const overrideNavigatorProperty = (name: string, value: unknown) => {
  try {
    Object.defineProperty(window.navigator, name, {
      get: () => value,
      configurable: true
    })
  } catch {
    // Some properties may be non-configurable in special environments.
  }
}

const patchCanvasToDataURL = () => {
  const original = HTMLCanvasElement.prototype.toDataURL
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    configurable: true,
    writable: true,
    value: function (...args: unknown[]) {
      try {
        const canvas = this as HTMLCanvasElement
        const context = canvas.getContext('2d')
        if (context) {
          context.save()
          context.globalAlpha = 0.999999
          context.restore()
        }
      } catch {
        // Ignore patch failures and return original data.
      }
      return original.apply(this, args)
    }
  })
}

overrideNavigatorProperty('hardwareConcurrency', 8)
overrideNavigatorProperty('deviceMemory', 8)
overrideNavigatorProperty('webdriver', false)
patchCanvasToDataURL()

/**
 * Registers a one-time listener for renderer-bound messages from the main process.
 * Returns an unsubscribe function.
 */
function onMessage(channel: string, callback: (data: unknown) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, data: unknown): void => {
    callback(data)
  }
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

/**
 * The API object exposed to the renderer via contextBridge.
 * Each key corresponds to an IPC channel defined in IPCChannels.
 */
const api = {
  // ─── Window ──────────────────────────────────────────────────

  'window:minimize': () => ipcRenderer.invoke('window:minimize'),

  'window:maximize': () => ipcRenderer.invoke('window:maximize'),

  'window:close': () => ipcRenderer.invoke('window:close'),

  'window:setOpacity': (opacity: number) =>
    ipcRenderer.invoke('window:setOpacity', opacity),

  'window:setMode': (mode: string) =>
    ipcRenderer.invoke('window:setMode', mode),

  'window:toggleFloat': () => ipcRenderer.invoke('window:toggleFloat'),

  'window:setContentProtection': (enabled: boolean) =>
    ipcRenderer.invoke('window:setContentProtection', enabled),

  // ─── Capture & OCR ───────────────────────────────────────────

  'capture:screen': () => ipcRenderer.invoke('capture:screen'),

  'capture:region': (region?: unknown) =>
    ipcRenderer.invoke('capture:region', region),

  'capture:selectRegion': () => ipcRenderer.invoke('capture:selectRegion'),

  'ocr:extract': (imageData: string, language?: string) =>
    ipcRenderer.invoke('ocr:extract', imageData, language),

  'ocr:extractFromScreen': () => ipcRenderer.invoke('ocr:extractFromScreen'),

  'ocr:extractFromRegion': () => ipcRenderer.invoke('ocr:extractFromRegion'),

  // ─── Database: Conversations ──────────────────────────────────

  'db:getConversations': () => ipcRenderer.invoke('db:getConversations'),

  'db:getConversation': (id: string) =>
    ipcRenderer.invoke('db:getConversation', id),

  'db:createConversation': (data: unknown) =>
    ipcRenderer.invoke('db:createConversation', data),

  'db:updateConversation': (id: string, data: unknown) =>
    ipcRenderer.invoke('db:updateConversation', id, data),

  'db:deleteConversation': (id: string) =>
    ipcRenderer.invoke('db:deleteConversation', id),

  'db:searchConversations': (query: string) =>
    ipcRenderer.invoke('db:searchConversations', query),

  'db:exportConversation': (id: string, format: string) =>
    ipcRenderer.invoke('db:exportConversation', id, format),

  // ─── Database: Messages ───────────────────────────────────────

  'db:getMessages': (conversationId: string) =>
    ipcRenderer.invoke('db:getMessages', conversationId),

  'db:createMessage': (data: unknown) =>
    ipcRenderer.invoke('db:createMessage', data),

  'db:updateMessage': (id: string, data: unknown) =>
    ipcRenderer.invoke('db:updateMessage', id, data),

  'db:deleteMessage': (id: string) =>
    ipcRenderer.invoke('db:deleteMessage', id),

  // ─── Database: Settings ───────────────────────────────────────

  'db:getSettings': () => ipcRenderer.invoke('db:getSettings'),

  'db:updateSettings': (data: unknown) =>
    ipcRenderer.invoke('db:updateSettings', data),

  // ─── Database: Prompts ────────────────────────────────────────

  'db:getPrompts': () => ipcRenderer.invoke('db:getPrompts'),

  'db:savePrompt': (data: unknown) =>
    ipcRenderer.invoke('db:savePrompt', data),

  'db:deletePrompt': (id: string) =>
    ipcRenderer.invoke('db:deletePrompt', id),

  // ─── Database: OCR History ────────────────────────────────────

  'db:getOCRHistory': () => ipcRenderer.invoke('db:getOCRHistory'),

  'db:saveOCRResult': (data: unknown) =>
    ipcRenderer.invoke('db:saveOCRResult', data),

  'db:clearOCRHistory': () => ipcRenderer.invoke('db:clearOCRHistory'),

  // ─── Database: Folders ────────────────────────────────────────

  'db:getFolders': () => ipcRenderer.invoke('db:getFolders'),

  'db:createFolder': (data: unknown) =>
    ipcRenderer.invoke('db:createFolder', data),

  'db:updateFolder': (id: string, data: unknown) =>
    ipcRenderer.invoke('db:updateFolder', id, data),

  'db:deleteFolder': (id: string) =>
    ipcRenderer.invoke('db:deleteFolder', id),

  // ─── System ───────────────────────────────────────────────────

  'system:openExternal': (url: string) =>
    ipcRenderer.invoke('system:openExternal', url),

  'system:getPath': (name: string) =>
    ipcRenderer.invoke('system:getPath', name),

  'system:showSaveDialog': (options: unknown) =>
    ipcRenderer.invoke('system:showSaveDialog', options),

  'system:showOpenDialog': (options: unknown) =>
    ipcRenderer.invoke('system:showOpenDialog', options),

  'system:saveFile': (attachment: unknown) =>
    ipcRenderer.invoke('system:saveFile', attachment),

  'system:readFile': (path: string) =>
    ipcRenderer.invoke('system:readFile', path),

  'system:writeFile': (path: string, content: string) =>
    ipcRenderer.invoke('system:writeFile', path, content),

  'system:copyToClipboard': (text: string) =>
    ipcRenderer.invoke('system:copyToClipboard', text),

  'system:readClipboard': () =>
    ipcRenderer.invoke('system:readClipboard'),

  'system:getVersion': () =>
    ipcRenderer.invoke('system:getVersion'),

  'system:checkUpdate': () =>
    ipcRenderer.invoke('system:checkUpdate'),

  // ─── Event Listener ───────────────────────────────────────────

  /**
   * Subscribe to messages sent from the main process to the renderer.
   * Returns an unsubscribe function.
   */
  onMessage
}

contextBridge.exposeInMainWorld('api', api)
