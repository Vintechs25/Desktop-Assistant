import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Sparkles, ChevronDown } from 'lucide-react'
import { useConversationStore } from '../stores/conversation-store'
import { useProviderStore } from '../stores/provider-store'
import { useSettingsStore } from '../stores/settings-store'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { cn } from '../utils/cn'

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
        <Sparkles size={28} className="text-indigo-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Start a Conversation</h2>
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          Select an existing conversation from the sidebar or create a new one to begin chatting with your AI assistant.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
        {[
          'Explain a concept',
          'Write some code',
          'Summarize text',
          'Brainstorm ideas',
        ].map((suggestion) => (
          <div
            key={suggestion}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-gray-400 text-center"
          >
            {suggestion}
          </div>
        ))}
      </div>
    </div>
  )
}

function NoConversationState() {
  const createConversation = useConversationStore((s) => s.createConversation)
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <MessageSquare size={28} className="text-gray-500" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">No Conversation Selected</h2>
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          Create a new conversation to start chatting.
        </p>
      </div>
      <button
        onClick={() => createConversation()}
        className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors"
      >
        New Conversation
      </button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={cn('flex gap-3', i % 2 === 0 ? 'flex-row' : 'flex-row-reverse')}
        >
          <div className="skeleton w-8 h-8 rounded-xl shrink-0" />
          <div className="flex flex-col gap-1.5" style={{ maxWidth: '60%' }}>
            <div className="skeleton h-4 rounded-lg" style={{ width: `${60 + Math.random() * 40}%` }} />
            <div className="skeleton h-4 rounded-lg" style={{ width: `${40 + Math.random() * 50}%` }} />
            {i % 3 === 0 && (
              <div className="skeleton h-4 rounded-lg" style={{ width: `${30 + Math.random() * 40}%` }} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChatArea() {
  const messages = useConversationStore((s) => s.messages)
  const isLoadingMessages = useConversationStore((s) => s.isLoadingMessages)
  const isStreaming = useConversationStore((s) => s.isStreaming)
  const streamingContent = useConversationStore((s) => s.streamingContent)
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const conversations = useConversationStore((s) => s.conversations)
  const settings = useSettingsStore((s) => s.settings)
  const providers = useProviderStore((s) => s.providers)
  const loadProviders = useProviderStore((s) => s.loadProviders)
  const updateConversation = useConversationStore((s) => s.updateConversation)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  const currentConversation = conversations.find((c) => c.id === currentConversationId)

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingContent, autoScroll])

  // Detect manual scroll
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(distFromBottom > 150)
    setAutoScroll(distFromBottom < 60)
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setAutoScroll(true)
  }

  const hasMessages = messages.length > 0 || isStreaming
  const currentProviderId = currentConversation?.providerId || settings.defaultProviderId
  const selectedProvider = providers.find((p) => p.id === currentProviderId)

  const handleProviderChange = useCallback(async (providerId: string) => {
    if (!currentConversation) return
    const provider = providers.find((p) => p.id === providerId)
    await updateConversation(currentConversation.id, {
      providerId,
      model: provider?.defaultModel ?? null,
    })
  }, [currentConversation, providers, updateConversation])

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      {currentConversation && (
        <div className="flex flex-col gap-2 px-5 py-3 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare size={15} className="text-gray-500 shrink-0" />
            <h1 className="text-sm font-semibold text-gray-200 truncate">
              {currentConversation.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/8 px-3 py-2">
              <span className="text-xs text-gray-400">Provider</span>
              <select
                value={currentProviderId}
                onChange={(event) => handleProviderChange(event.target.value)}
                className="rounded-lg bg-slate-950 border border-white/10 px-2 py-1 text-xs text-gray-100 outline-none"
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {isLoadingMessages ? (
          <LoadingSkeleton />
        ) : !currentConversationId ? (
          <NoConversationState />
        ) : !hasMessages ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col py-2">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <MessageBubble message={msg} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming message */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MessageBubble
                  message={{
                    id: 'streaming',
                    conversationId: currentConversationId ?? '',
                    role: 'assistant',
                    content: streamingContent,
                    createdAt: Date.now(),
                  }}
                  isStreaming={true}
                  streamingContent={streamingContent}
                />
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:bg-indigo-400 transition-colors z-10"
            aria-label="Scroll to bottom"
          >
            <ChevronDown size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input */}
      <ChatInput />
    </div>
  )
}
