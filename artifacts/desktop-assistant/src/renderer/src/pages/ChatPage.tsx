import React, { useEffect } from 'react'
import { useConversationStore } from '../stores/conversation-store'
import { useSettingsStore } from '../stores/settings-store'
import { ChatArea } from '../components/ChatArea'

export function ChatPage() {
  const conversations = useConversationStore((s) => s.conversations)
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const loadConversations = useConversationStore((s) => s.loadConversations)
  const selectConversation = useConversationStore((s) => s.selectConversation)
  const createConversation = useConversationStore((s) => s.createConversation)
  const loadSettings = useSettingsStore((s) => s.loadSettings)

  useEffect(() => {
    const init = async () => {
      await loadSettings()
      await loadConversations()
    }
    init()
  }, [loadSettings, loadConversations])

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (conversations.length > 0 && !currentConversationId) {
      selectConversation(conversations[0].id)
    }
  }, [conversations, currentConversationId, selectConversation])

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      <ChatArea />
    </div>
  )
}
