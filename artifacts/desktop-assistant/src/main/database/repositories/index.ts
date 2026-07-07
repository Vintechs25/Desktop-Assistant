import { conversationsRepository } from './conversations'
import { messagesRepository } from './messages'
import { settingsRepository } from './settings'
import { promptsRepository } from './prompts'
import { ocrHistoryRepository } from './ocr-history'
import { foldersRepository } from './folders'
import { providersRepository } from './providers'

/**
 * Unified repository facade used by IPC database handlers.
 * Method names are normalized to match the IPC handler expectations.
 */
export const ConversationRepository = {
  getAll: () => conversationsRepository.getAll(),
  getById: (id: string) => conversationsRepository.getById(id),
  create: (data: Parameters<typeof conversationsRepository.create>[0]) =>
    conversationsRepository.create(data),
  update: (id: string, data: Parameters<typeof conversationsRepository.update>[1]) =>
    conversationsRepository.update(id, data),
  delete: (id: string) => conversationsRepository.delete(id),
  search: (query: string) => conversationsRepository.search(query),
  exportConversation: (id: string, format: 'json' | 'md' | 'txt') =>
    conversationsRepository.export(id, format)
}

export const MessageRepository = {
  getByConversation: (conversationId: string) =>
    messagesRepository.getByConversationId(conversationId),
  getById: (id: string) => messagesRepository.getById(id),
  create: (data: Parameters<typeof messagesRepository.create>[0]) =>
    messagesRepository.create(data),
  update: (id: string, data: Parameters<typeof messagesRepository.update>[1]) =>
    messagesRepository.update(id, data),
  delete: (id: string) => messagesRepository.delete(id)
}

export const SettingsRepository = {
  get: () => settingsRepository.getAll(),
  update: (data: Parameters<typeof settingsRepository.update>[0]) =>
    settingsRepository.update(data)
}

export const PromptRepository = {
  getAll: () => promptsRepository.getAll(),
  getById: (id: string) => promptsRepository.getById(id),
  save: (data: Parameters<typeof promptsRepository.save>[0]) => promptsRepository.save(data),
  delete: (id: string) => promptsRepository.delete(id)
}

export const OCRRepository = {
  getAll: () => ocrHistoryRepository.getAll(),
  save: (data: Parameters<typeof ocrHistoryRepository.save>[0]) =>
    ocrHistoryRepository.save(data),
  clear: () => ocrHistoryRepository.clear()
}

export const FolderRepository = {
  getAll: () => foldersRepository.getAll(),
  create: (data: Parameters<typeof foldersRepository.create>[0]) =>
    foldersRepository.create(data),
  update: (id: string, data: Parameters<typeof foldersRepository.update>[1]) =>
    foldersRepository.update(id, data),
  delete: (id: string) => foldersRepository.delete(id)
}

export const ProviderRepository = {
  getAll: () => providersRepository.getAll(),
  getEnabled: () => providersRepository.getEnabled(),
  getById: (id: string) => providersRepository.getById(id),
  save: (data: Parameters<typeof providersRepository.save>[0]) => providersRepository.save(data),
  update: (id: string, data: Parameters<typeof providersRepository.update>[1]) =>
    providersRepository.update(id, data),
  delete: (id: string) => providersRepository.delete(id)
}
