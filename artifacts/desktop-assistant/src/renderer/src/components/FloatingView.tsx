import { useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot } from 'lucide-react'
import { useConversationStore } from '../stores/conversation-store'
import { useProviderStore } from '../stores/provider-store'
import { useSettingsStore } from '../stores/settings-store'
import { ChatInput } from './ChatInput'

export function FloatingView() {
  const messages = useConversationStore((s) => s.messages)
  const isStreaming = useConversationStore((s) => s.isStreaming)
  const streamingContent = useConversationStore((s) => s.streamingContent)
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const conversations = useConversationStore((s) => s.conversations)
  const loadConversations = useConversationStore((s) => s.loadConversations)
  const createConversation = useConversationStore((s) => s.createConversation)
  const selectConversation = useConversationStore((s) => s.selectConversation)
  const settings = useSettingsStore((s) => s.settings)
  const providers = useProviderStore((s) => s.providers)
  const loadProviders = useProviderStore((s) => s.loadProviders)
  const updateConversation = useConversationStore((s) => s.updateConversation)

  const currentConversation = conversations.find((c) => c.id === currentConversationId)
  const currentProviderId = currentConversation?.providerId || settings.defaultProviderId
  const selectedProvider = providers.find((p) => p.id === currentProviderId)

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (conversations.length > 0 && !currentConversationId) {
      selectConversation(conversations[0].id)
    }
  }, [conversations, currentConversationId, selectConversation])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  const handleProviderChange = useCallback(
    async (providerId: string) => {
      if (!currentConversation) return
      const provider = providers.find((p) => p.id === providerId)
      await updateConversation(currentConversation.id, {
        providerId,
        model: provider?.defaultModel ?? null,
      })
    },
    [currentConversation, providers, updateConversation]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden text-slate-100 rounded-[32px] border border-white/10 bg-slate-950/60 shadow-[0_28px_120px_rgba(15,23,42,0.65)] backdrop-blur-3xl">
      <div className="flex flex-col gap-2 px-3 py-3 border-b border-white/10 bg-slate-950/80 backdrop-blur-3xl drag-region shrink-0 rounded-t-[32px]">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-14 rounded-full bg-white/15 shadow-sm shadow-white/5" />
          <span className="text-[10px] uppercase tracking-[0.32em] text-slate-400">stealth mode</span>
          <div className="ml-auto flex items-center gap-1 no-drag">
            <button
              onClick={() => window.api['window:close']()}
              className="w-2.5 h-2.5 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
              aria-label="Close"
            />
            <button
              onClick={() => window.api['window:minimize']()}
              className="w-2.5 h-2.5 rounded-full bg-amber-500 hover:bg-amber-400 transition-colors"
              aria-label="Minimize"
            />
            <button
              onClick={() => window.api['window:maximize']()}
              className="w-2.5 h-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors"
              aria-label="Maximize"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900/70 px-3 py-2 text-xs text-slate-200 ring-1 ring-white/10">
              {selectedProvider?.name ?? 'No provider configured'}
            </div>
            <div className="ml-auto flex items-center gap-1 rounded-2xl bg-slate-900/70 px-3 py-2 text-xs text-slate-200 ring-1 ring-white/10">
              <span>{conversations.length} conv</span>
              <span>{messages.length} msgs</span>
            </div>
          </div>

          {currentConversation && providers.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 uppercase tracking-[0.2em]">
                Provider
              </label>
              <select
                value={currentProviderId ?? ''}
                onChange={(event) => handleProviderChange(event.target.value)}
                className="rounded-2xl bg-slate-900/80 border border-white/10 px-2 py-1 text-sm text-slate-100 outline-none shadow-sm shadow-black/20"
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2 space-y-2">
        {!currentConversationId ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
            <Bot size={24} className="text-gray-600" />
            <p className="text-xs text-gray-600">
              No conversation. Create one to start chatting.
            </p>
            <button
              onClick={() => createConversation()}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-400 transition-colors"
            >
              New Conversation
            </button>
          </div>
        ) : (
          <div className="flex flex-col py-1">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <MessageBubble message={msg} compact />
                </motion.div>
              ))}
            </AnimatePresence>

            {isStreaming && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  conversationId: currentConversationId ?? '',
                  role: 'assistant',
                  content: streamingContent,
                  createdAt: Date.now(),
                }}
                isStreaming
                streamingContent={streamingContent}
                compact
              />
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput compact />
    </div>
  )
}
