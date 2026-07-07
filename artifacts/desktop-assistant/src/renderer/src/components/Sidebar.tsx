import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, MessageSquare, Clock, BookOpen, Scan, Settings,
  Search, Pin, Trash2, MoreHorizontal, ChevronDown, ChevronRight,
  Folder, X, Bot
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useConversationStore } from '../stores/conversation-store'
import { useSettingsStore } from '../stores/settings-store'
import { useUIStore } from '../stores/ui-store'
import { cn } from '../utils/cn'
import { formatDate } from '../utils/format'
import type { Conversation, ConversationFolder } from '@shared/types'

interface NavItemProps {
  icon: React.ReactNode
  label: string
  path: string
  active?: boolean
}

function NavItem({ icon, label, path, active }: NavItemProps) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(path)}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
        active
          ? 'bg-indigo-500/20 text-indigo-300'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/8'
      )}
      aria-label={label}
    >
      <span className={cn('w-4 h-4 shrink-0', active ? 'text-indigo-400' : 'text-gray-500')}>
        {icon}
      </span>
      {label}
    </button>
  )
}

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onPin: () => void
}

function ConversationItem({ conversation, isActive, onSelect, onDelete, onPin }: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all',
        isActive
          ? 'bg-indigo-500/15 text-gray-100 border border-indigo-500/20'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/6'
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-label={`Open conversation: ${conversation.title}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {conversation.pinned && (
        <Pin size={10} className="shrink-0 text-amber-400" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate leading-tight">{conversation.title}</div>
        <div className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
          <span>{formatDate(conversation.updatedAt)}</span>
          {conversation.messageCount != null && conversation.messageCount > 0 && (
            <>
              <span>·</span>
              <span>{conversation.messageCount} msgs</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity no-drag"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onPin}
          className="p-1 rounded-md hover:bg-white/10 text-gray-600 hover:text-amber-400 transition-colors"
          aria-label={conversation.pinned ? 'Unpin' : 'Pin conversation'}
          title={conversation.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={11} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded-md hover:bg-white/10 text-gray-600 hover:text-red-400 transition-colors"
          aria-label="Delete conversation"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

interface FolderGroupProps {
  folder: ConversationFolder
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onPin: (id: string) => void
}

function FolderGroup({ folder, conversations, activeId, onSelect, onDelete, onPin }: FolderGroupProps) {
  const [expanded, setExpanded] = useState(true)

  if (conversations.length === 0) return null

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600 hover:text-gray-400 transition-colors"
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: folder.color ?? '#6366f1' }}
        />
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto text-gray-700">{conversations.length}</span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden space-y-0.5"
          >
            {conversations.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                isActive={c.id === activeId}
                onSelect={() => onSelect(c.id)}
                onDelete={() => onDelete(c.id)}
                onPin={() => onPin(c.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const conversations = useConversationStore((s) => s.conversations)
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const folders = useConversationStore((s) => s.folders)
  const searchQuery = useConversationStore((s) => s.searchQuery)
  const searchResults = useConversationStore((s) => s.searchResults)
  const loadConversations = useConversationStore((s) => s.loadConversations)
  const loadFolders = useConversationStore((s) => s.loadFolders)
  const selectConversation = useConversationStore((s) => s.selectConversation)
  const createConversation = useConversationStore((s) => s.createConversation)
  const deleteConversation = useConversationStore((s) => s.deleteConversation)
  const updateConversation = useConversationStore((s) => s.updateConversation)
  const searchConversations = useConversationStore((s) => s.searchConversations)
  const clearSearch = useConversationStore((s) => s.clearSearch)
  const settings = useSettingsStore((s) => s.settings)

  useEffect(() => {
    loadConversations()
    loadFolders()
  }, [loadConversations, loadFolders])

  const handleSelect = (id: string) => {
    selectConversation(id)
    navigate('/')
    clearSearch()
  }

  const handleDelete = async (id: string) => {
    await deleteConversation(id)
  }

  const handlePin = async (id: string) => {
    const conv = conversations.find((c) => c.id === id)
    if (conv) {
      await updateConversation(id, { pinned: !conv.pinned })
    }
  }

  const displayConversations = searchQuery.trim() ? searchResults : conversations

  // Group by folder
  const unfolderedConvs = displayConversations.filter((c) => !c.folderId && !c.archived)
  const folderedGroups = folders.map((f) => ({
    folder: f,
    conversations: displayConversations.filter((c) => c.folderId === f.id),
  }))

  const isChat = location.pathname === '/'

  return (
    <div className="flex flex-col h-full w-full bg-gray-900/60 border-r border-white/8">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/8 shrink-0">
        <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Bot size={14} className="text-indigo-400" />
        </div>
        <span className="text-sm font-semibold text-gray-200">AI Assistant</span>
      </div>

      {/* Navigation */}
      <div className="px-3 py-3 space-y-0.5 border-b border-white/8 shrink-0">
        <NavItem icon={<MessageSquare size={15} />} label="Chat" path="/" active={isChat} />
        <NavItem icon={<Clock size={15} />} label="History" path="/history" active={location.pathname === '/history'} />
        <NavItem icon={<BookOpen size={15} />} label="Prompts" path="/prompts" active={location.pathname === '/prompts'} />
        <NavItem icon={<Scan size={15} />} label="OCR Capture" path="/ocr" active={location.pathname === '/ocr'} />
        <NavItem icon={<Settings size={15} />} label="Settings" path="/settings" active={location.pathname === '/settings'} />
      </div>

      {/* Conversations header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
          Conversations
        </span>
        <button
          onClick={() => { createConversation(); navigate('/') }}
          className="w-5 h-5 rounded-md bg-white/8 text-gray-500 hover:text-gray-300 hover:bg-white/12 transition-colors flex items-center justify-center"
          aria-label="New conversation"
          title="New conversation"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={searchQuery}
            onChange={(e) => searchConversations(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-7 pr-6 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-indigo-500/50 transition-colors"
            aria-label="Search conversations"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
              aria-label="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-3">
        {displayConversations.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-gray-600">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <>
            {/* Pinned */}
            {!searchQuery && unfolderedConvs.some((c) => c.pinned) && (
              <div className="mb-1">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                  Pinned
                </div>
                {unfolderedConvs
                  .filter((c) => c.pinned)
                  .map((c) => (
                    <ConversationItem
                      key={c.id}
                      conversation={c}
                      isActive={c.id === currentConversationId}
                      onSelect={() => handleSelect(c.id)}
                      onDelete={() => handleDelete(c.id)}
                      onPin={() => handlePin(c.id)}
                    />
                  ))}
              </div>
            )}

            {/* Folders */}
            {folderedGroups.map(({ folder, conversations: fConvs }) => (
              <FolderGroup
                key={folder.id}
                folder={folder}
                conversations={fConvs}
                activeId={currentConversationId}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onPin={handlePin}
              />
            ))}

            {/* Unfoldered, unpinned */}
            {unfolderedConvs
              .filter((c) => !c.pinned || searchQuery)
              .map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  isActive={c.id === currentConversationId}
                  onSelect={() => handleSelect(c.id)}
                  onDelete={() => handleDelete(c.id)}
                  onPin={() => handlePin(c.id)}
                />
              ))}
          </>
        )}
      </div>

      {/* Provider indicator */}
      <div className="px-3 py-2.5 border-t border-white/8 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-gray-600 truncate flex-1">
            {settings.defaultModel || 'No model configured'}
          </span>
        </div>
      </div>
    </div>
  )
}
