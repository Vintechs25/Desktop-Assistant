import { create } from 'zustand'
import type { Conversation, Message, ConversationFolder, Attachment, ProviderConfig } from '@shared/types'
import { aiService } from '../services/ai-service'
import { providerManager } from '../providers'
import { useUIStore } from './ui-store'

interface ConversationStore {
  conversations: Conversation[]
  currentConversationId: string | null
  messages: Message[]
  isLoadingMessages: boolean
  isStreaming: boolean
  streamingContent: string
  folders: ConversationFolder[]
  searchQuery: string
  searchResults: Conversation[]

  loadConversations: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  createConversation: (title?: string) => Promise<Conversation>
  deleteConversation: (id: string) => Promise<void>
  updateConversation: (id: string, data: Partial<Conversation>) => Promise<void>
  sendMessage: (content: string, images?: string[], attachments?: Attachment[]) => Promise<void>
  searchConversations: (query: string) => Promise<void>
  loadFolders: () => Promise<void>
  createFolder: (name: string, color?: string) => Promise<void>
  clearSearch: () => void
  abortStreaming: () => void
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoadingMessages: false,
  isStreaming: false,
  streamingContent: '',
  folders: [],
  searchQuery: '',
  searchResults: [],

  loadConversations: async () => {
    try {
      const conversations = await window.api['db:getConversations']()
      set({
        conversations: conversations.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1
          if (!a.pinned && b.pinned) return 1
          return b.updatedAt - a.updatedAt
        }),
      })
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
  },

  selectConversation: async (id: string) => {
    if (get().currentConversationId === id) return
    set({ currentConversationId: id, messages: [], isLoadingMessages: true })
    try {
      const [messages, conversation] = await Promise.all([
        window.api['db:getMessages'](id),
        window.api['db:getConversation'](id),
      ])

      set({ messages: messages.sort((a, b) => a.createdAt - b.createdAt) })
      if (conversation) {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, ...conversation } : c
          ),
        }))
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      set({ isLoadingMessages: false })
    }
  },

  createConversation: async (title?: string) => {
    const settings = await window.api['db:getSettings']()
    const storedProviders = (settings as any).providerConfigs as ProviderConfig[] | undefined
    const providerId = settings.defaultProviderId || (storedProviders?.[0]?.id ?? null)
    const model = storedProviders?.find((p) => p.id === providerId)?.defaultModel ?? settings.defaultModel ?? null

    const conversation = await window.api['db:createConversation']({
      title: title || 'New Conversation',
      providerId,
      model,
      pinned: false,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    set((s) => ({
      conversations: [conversation, ...s.conversations],
      currentConversationId: conversation.id,
      messages: [],
    }))
    return conversation
  },

  deleteConversation: async (id: string) => {
    await window.api['db:deleteConversation'](id)
    const { currentConversationId, conversations } = get()
    const remaining = conversations.filter((c) => c.id !== id)
    set({ conversations: remaining })
    if (currentConversationId === id) {
      if (remaining.length > 0) {
        await get().selectConversation(remaining[0].id)
      } else {
        set({ currentConversationId: null, messages: [] })
      }
    }
  },

  updateConversation: async (id: string, data: Partial<Conversation>) => {
    await window.api['db:updateConversation'](id, data)
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }))
  },

  sendMessage: async (content: string, images?: string[], attachments?: Attachment[]) => {
    const { currentConversationId, messages } = get()
    if (!currentConversationId) return

    // Create user message in DB
    const userMessage = await window.api['db:createMessage']({
      conversationId: currentConversationId,
      role: 'user',
      content,
      images: images ?? [],
      attachments: attachments ?? [],
      createdAt: Date.now(),
    })

    set((s) => ({ messages: [...s.messages, userMessage] }))

    // Update conversation metadata
    await window.api['db:updateConversation'](currentConversationId, {
      updatedAt: Date.now(),
      lastMessage: content.slice(0, 100),
    })
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === currentConversationId
          ? { ...c, updatedAt: Date.now(), lastMessage: content.slice(0, 100) }
          : c
      ),
    }))

    // Load settings to get provider/model
    const settings = await window.api['db:getSettings']()
    let conv = get().conversations.find((c) => c.id === currentConversationId)
    if (!conv) {
      conv = await window.api['db:getConversation'](currentConversationId)
    }
    const storedProviders = (settings as any).providerConfigs as ProviderConfig[] | undefined
    const providerId =
      conv?.providerId ||
      settings.defaultProviderId ||
      storedProviders?.[0]?.id ||
      ''
    const providerConfig = storedProviders?.find((p) => p.id === providerId)
    const model = conv?.model ?? providerConfig?.defaultModel ?? settings.defaultModel

    // Sync ProviderManager so chat routing never touches provider implementations.
    if (storedProviders) {
      await providerManager.loadProviders(storedProviders)
    }

    if (!providerId) {
      const errorMsg = await window.api['db:createMessage']({
        conversationId: currentConversationId,
        role: 'assistant',
        content: 'No AI provider configured. Please go to Settings > Providers to add and configure an AI provider.',
        createdAt: Date.now(),
        isError: true,
      })
      set((s) => ({ messages: [...s.messages, errorMsg] }))
      return
    }

    // Build chat history for context window
    const allMessages = [...messages, userMessage]
    const maxContext = settings.maxContextMessages ?? 20
    const chatHistory = allMessages
      .slice(-(maxContext * 2))
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    // Start streaming
    set({ isStreaming: true, streamingContent: '' })

    await aiService.sendMessage(
      chatHistory,
      {
        model,
        stream: settings.streamingEnabled !== false,
        temperature: 0.7,
      },
      // onChunk
      (chunk) => {
        set((s) => ({ streamingContent: s.streamingContent + chunk }))
      },
      // onComplete
      async (fullText) => {
        const convId = get().currentConversationId
        if (!convId) return

        const assistantMessage = await window.api['db:createMessage']({
          conversationId: convId,
          role: 'assistant',
          content: fullText,
          createdAt: Date.now(),
          model: model ?? null,
          providerId: providerId || null,
        })

        set((s) => ({
          messages: [...s.messages, assistantMessage],
          isStreaming: false,
          streamingContent: '',
        }))

        await window.api['db:updateConversation'](convId, {
          updatedAt: Date.now(),
          lastMessage: fullText.slice(0, 100),
        })
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convId
              ? { ...c, updatedAt: Date.now(), lastMessage: fullText.slice(0, 100) }
              : c
          ),
        }))

        // Auto-generate title for the first message
        if (messages.length === 0) {
          const conv = get().conversations.find((c) => c.id === convId)
          if (conv?.title === 'New Conversation') {
            try {
              const title = await aiService.generateTitle(
                content,
                { model, stream: false },
                providerId
              )
              await window.api['db:updateConversation'](convId, { title })
              set((s) => ({
                conversations: s.conversations.map((c) =>
                  c.id === convId ? { ...c, title } : c
                ),
              }))
            } catch {
              // Title generation failed — keep default title
            }
          }
        }
      },
      // onError
      async (errorMsg) => {
        const convId = get().currentConversationId
        if (!convId) return

        const errorMessage = await window.api['db:createMessage']({
          conversationId: convId,
          role: 'assistant',
          content: `Error: ${errorMsg}`,
          createdAt: Date.now(),
          isError: true,
        })
        set((s) => ({
          messages: [...s.messages, errorMessage],
          isStreaming: false,
          streamingContent: '',
        }))
      },
      providerId,
      (message) => {
        useUIStore.getState().addNotification({
          type: 'warning',
          title: 'Model fallback applied',
          message
        })
      }
    )
  },

  searchConversations: async (query: string) => {
    set({ searchQuery: query })
    if (!query.trim()) {
      set({ searchResults: [] })
      return
    }
    try {
      const results = await window.api['db:searchConversations'](query)
      set({ searchResults: results })
    } catch (err) {
      console.error('Search failed:', err)
    }
  },

  loadFolders: async () => {
    try {
      const folders = await window.api['db:getFolders']()
      set({ folders: folders.sort((a, b) => a.order - b.order) })
    } catch (err) {
      console.error('Failed to load folders:', err)
    }
  },

  createFolder: async (name: string, color?: string) => {
    const folder = await window.api['db:createFolder']({
      name,
      color: color ?? '#6366f1',
      createdAt: Date.now(),
      order: get().folders.length,
    })
    set((s) => ({ folders: [...s.folders, folder] }))
  },

  clearSearch: () => set({ searchQuery: '', searchResults: [] }),

  abortStreaming: () => {
    aiService.abort()
    set({ isStreaming: false, streamingContent: '' })
  },
}))
