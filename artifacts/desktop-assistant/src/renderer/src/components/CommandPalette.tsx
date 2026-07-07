import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, Plus, MessageSquare, Settings, Clock, BookOpen,
  Scan, Monitor, Crop, X, ChevronRight, Zap, Command
} from 'lucide-react'
import { useUIStore } from '../stores/ui-store'
import { useConversationStore } from '../stores/conversation-store'
import { useNavigate } from 'react-router-dom'
import { cn } from '../utils/cn'
import { truncate } from '../utils/format'

interface CommandItem {
  id: string
  label: string
  description?: string
  category: string
  icon: React.ReactNode
  action: () => void
  keywords?: string[]
}

export function CommandPalette() {
  const isOpen = useUIStore((s) => s.commandPaletteOpen)
  const close = useUIStore((s) => s.closeCommandPalette)
  const conversations = useConversationStore((s) => s.conversations)
  const createConversation = useConversationStore((s) => s.createConversation)
  const selectConversation = useConversationStore((s) => s.selectConversation)
  const addNotification = useUIStore((s) => s.addNotification)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: CommandItem[] = [
    {
      id: 'new-chat',
      label: 'New Conversation',
      description: 'Start a fresh chat',
      category: 'Commands',
      icon: <Plus size={15} />,
      keywords: ['new', 'create', 'chat'],
      action: async () => {
        close()
        const conv = await createConversation()
        navigate('/')
      },
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      description: 'Manage providers and preferences',
      category: 'Commands',
      icon: <Settings size={15} />,
      keywords: ['settings', 'preferences', 'config'],
      action: () => { close(); navigate('/settings') },
    },
    {
      id: 'open-history',
      label: 'View History',
      description: 'Browse past conversations',
      category: 'Commands',
      icon: <Clock size={15} />,
      keywords: ['history', 'past', 'conversations'],
      action: () => { close(); navigate('/history') },
    },
    {
      id: 'open-prompts',
      label: 'Prompt Library',
      description: 'Browse and use prompt templates',
      category: 'Commands',
      icon: <BookOpen size={15} />,
      keywords: ['prompts', 'templates', 'library'],
      action: () => { close(); navigate('/prompts') },
    },
    {
      id: 'open-ocr',
      label: 'OCR Capture',
      description: 'Extract text from screen',
      category: 'Commands',
      icon: <Scan size={15} />,
      keywords: ['ocr', 'capture', 'extract', 'text'],
      action: () => { close(); navigate('/ocr') },
    },
    {
      id: 'capture-screen',
      label: 'Capture Full Screen',
      description: 'Take a screenshot and extract text',
      category: 'Commands',
      icon: <Monitor size={15} />,
      keywords: ['screenshot', 'screen', 'capture'],
      action: async () => {
        close()
        try {
          await window.api['ocr:extractFromScreen']()
          addNotification({ type: 'success', title: 'Screen captured' })
          navigate('/ocr')
        } catch {
          addNotification({ type: 'error', title: 'Capture failed' })
        }
      },
    },
    {
      id: 'capture-region',
      label: 'Capture Region',
      description: 'Select a screen region to capture',
      category: 'Commands',
      icon: <Crop size={15} />,
      keywords: ['region', 'crop', 'select', 'capture'],
      action: async () => {
        close()
        try {
          await window.api['ocr:extractFromRegion']()
          addNotification({ type: 'success', title: 'Region captured' })
          navigate('/ocr')
        } catch {
          addNotification({ type: 'error', title: 'Capture failed' })
        }
      },
    },
  ]

  const conversationItems: CommandItem[] = conversations.slice(0, 5).map((c) => ({
    id: `conv-${c.id}`,
    label: c.title,
    description: c.lastMessage ? truncate(c.lastMessage, 60) : undefined,
    category: 'Recent Conversations',
    icon: <MessageSquare size={15} />,
    action: () => {
      close()
      selectConversation(c.id)
      navigate('/')
    },
  }))

  const allItems = [...commands, ...conversationItems]

  const filtered = query.trim()
    ? allItems.filter((item) => {
        const q = query.toLowerCase()
        return (
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q)
        )
      })
    : allItems

  const grouped = filtered.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, CommandItem[]>
  )

  const flatFiltered = Object.values(grouped).flat()

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        flatFiltered[selectedIndex]?.action()
      } else if (e.key === 'Escape') {
        close()
      }
    },
    [flatFiltered, selectedIndex, close]
  )

  let itemIndex = 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={close}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed left-1/2 -translate-x-1/2 top-[15%] z-50 w-full max-w-[560px] px-4"
          >
            <div className="rounded-2xl overflow-hidden bg-gray-900/98 border border-white/10 shadow-2xl">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
                <Search size={16} className="text-gray-500 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands, conversations..."
                  className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-sm outline-none"
                  aria-label="Command palette search"
                />
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] rounded border border-white/10 text-gray-500 bg-white/5 font-mono">
                    ESC
                  </kbd>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[380px] overflow-y-auto py-1.5">
                {flatFiltered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No results for "{query}"
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        {category}
                      </div>
                      {items.map((item) => {
                        const currentIndex = itemIndex++
                        const isSelected = currentIndex === selectedIndex
                        return (
                          <button
                            key={item.id}
                            onClick={item.action}
                            onMouseEnter={() => setSelectedIndex(currentIndex)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                              isSelected
                                ? 'bg-indigo-500/20 text-gray-100'
                                : 'text-gray-300 hover:bg-white/5'
                            )}
                          >
                            <div
                              className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                                isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/8 text-gray-400'
                              )}
                            >
                              {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium leading-tight">{item.label}</div>
                              {item.description && (
                                <div className="text-xs text-gray-500 truncate mt-0.5">{item.description}</div>
                              )}
                            </div>
                            {isSelected && <ChevronRight size={13} className="text-indigo-400 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-white/8 flex items-center gap-3 text-[10px] text-gray-600">
                <span className="flex items-center gap-1"><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="font-mono">↵</kbd> select</span>
                <span className="flex items-center gap-1"><kbd className="font-mono">ESC</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
