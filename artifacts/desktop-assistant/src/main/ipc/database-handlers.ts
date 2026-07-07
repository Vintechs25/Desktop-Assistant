import { ipcMain } from 'electron'
import {
  Conversation,
  Message,
  Settings,
  PromptTemplate,
  OCRResult,
  ConversationFolder
} from '../../shared/types'
import {
  ConversationRepository,
  MessageRepository,
  SettingsRepository,
  PromptRepository,
  OCRRepository,
  FolderRepository
} from '../database/repositories'

/**
 * Registers IPC handlers for all database (db:*) operations.
 */
export function registerDatabaseHandlers(): void {
  // ─── Conversations ────────────────────────────────────────────

  ipcMain.handle('db:getConversations', async () => {
    try {
      return await ConversationRepository.getAll()
    } catch (err) {
      console.error('[db:getConversations]', err)
      throw err
    }
  })

  ipcMain.handle('db:getConversation', async (_event, id: string) => {
    try {
      return await ConversationRepository.getById(id)
    } catch (err) {
      console.error('[db:getConversation]', err)
      throw err
    }
  })

  ipcMain.handle('db:createConversation', async (_event, data: Partial<Conversation>) => {
    try {
      return await ConversationRepository.create(data)
    } catch (err) {
      console.error('[db:createConversation]', err)
      throw err
    }
  })

  ipcMain.handle(
    'db:updateConversation',
    async (_event, id: string, data: Partial<Conversation>) => {
      try {
        return await ConversationRepository.update(id, data)
      } catch (err) {
        console.error('[db:updateConversation]', err)
        throw err
      }
    }
  )

  ipcMain.handle('db:deleteConversation', async (_event, id: string) => {
    try {
      return await ConversationRepository.delete(id)
    } catch (err) {
      console.error('[db:deleteConversation]', err)
      throw err
    }
  })

  ipcMain.handle('db:searchConversations', async (_event, query: string) => {
    try {
      return await ConversationRepository.search(query)
    } catch (err) {
      console.error('[db:searchConversations]', err)
      throw err
    }
  })

  ipcMain.handle(
    'db:exportConversation',
    async (_event, id: string, format: 'json' | 'md' | 'txt') => {
      try {
        return await ConversationRepository.exportConversation(id, format)
      } catch (err) {
        console.error('[db:exportConversation]', err)
        throw err
      }
    }
  )

  // ─── Messages ─────────────────────────────────────────────────

  ipcMain.handle('db:getMessages', async (_event, conversationId: string) => {
    try {
      return await MessageRepository.getByConversation(conversationId)
    } catch (err) {
      console.error('[db:getMessages]', err)
      throw err
    }
  })

  ipcMain.handle('db:createMessage', async (_event, data: Partial<Message>) => {
    try {
      return await MessageRepository.create(data)
    } catch (err) {
      console.error('[db:createMessage]', err)
      throw err
    }
  })

  ipcMain.handle('db:updateMessage', async (_event, id: string, data: Partial<Message>) => {
    try {
      return await MessageRepository.update(id, data)
    } catch (err) {
      console.error('[db:updateMessage]', err)
      throw err
    }
  })

  ipcMain.handle('db:deleteMessage', async (_event, id: string) => {
    try {
      return await MessageRepository.delete(id)
    } catch (err) {
      console.error('[db:deleteMessage]', err)
      throw err
    }
  })

  // ─── Settings ─────────────────────────────────────────────────

  ipcMain.handle('db:getSettings', async () => {
    try {
      return await SettingsRepository.get()
    } catch (err) {
      console.error('[db:getSettings]', err)
      throw err
    }
  })

  ipcMain.handle('db:updateSettings', async (_event, data: Partial<Settings>) => {
    try {
      return await SettingsRepository.update(data)
    } catch (err) {
      console.error('[db:updateSettings]', err)
      throw err
    }
  })

  // ─── Prompts ──────────────────────────────────────────────────

  ipcMain.handle('db:getPrompts', async () => {
    try {
      return await PromptRepository.getAll()
    } catch (err) {
      console.error('[db:getPrompts]', err)
      throw err
    }
  })

  ipcMain.handle('db:savePrompt', async (_event, data: Partial<PromptTemplate>) => {
    try {
      return await PromptRepository.save(data)
    } catch (err) {
      console.error('[db:savePrompt]', err)
      throw err
    }
  })

  ipcMain.handle('db:deletePrompt', async (_event, id: string) => {
    try {
      return await PromptRepository.delete(id)
    } catch (err) {
      console.error('[db:deletePrompt]', err)
      throw err
    }
  })

  // ─── OCR History ──────────────────────────────────────────────

  ipcMain.handle('db:getOCRHistory', async () => {
    try {
      return await OCRRepository.getAll()
    } catch (err) {
      console.error('[db:getOCRHistory]', err)
      throw err
    }
  })

  ipcMain.handle('db:saveOCRResult', async (_event, data: OCRResult) => {
    try {
      return await OCRRepository.save(data)
    } catch (err) {
      console.error('[db:saveOCRResult]', err)
      throw err
    }
  })

  ipcMain.handle('db:clearOCRHistory', async () => {
    try {
      return await OCRRepository.clear()
    } catch (err) {
      console.error('[db:clearOCRHistory]', err)
      throw err
    }
  })

  // ─── Folders ──────────────────────────────────────────────────

  ipcMain.handle('db:getFolders', async () => {
    try {
      return await FolderRepository.getAll()
    } catch (err) {
      console.error('[db:getFolders]', err)
      throw err
    }
  })

  ipcMain.handle('db:createFolder', async (_event, data: Partial<ConversationFolder>) => {
    try {
      return await FolderRepository.create(data)
    } catch (err) {
      console.error('[db:createFolder]', err)
      throw err
    }
  })

  ipcMain.handle(
    'db:updateFolder',
    async (_event, id: string, data: Partial<ConversationFolder>) => {
      try {
        return await FolderRepository.update(id, data)
      } catch (err) {
        console.error('[db:updateFolder]', err)
        throw err
      }
    }
  )

  ipcMain.handle('db:deleteFolder', async (_event, id: string) => {
    try {
      return await FolderRepository.delete(id)
    } catch (err) {
      console.error('[db:deleteFolder]', err)
      throw err
    }
  })
}
