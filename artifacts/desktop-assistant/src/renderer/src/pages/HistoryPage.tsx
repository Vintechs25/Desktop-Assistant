import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Trash2, Download, LayoutGrid, List,
  MessageSquare, Calendar, CheckSquare, Square, X, ChevronDown
} from 'lucide-react'
import { useConversationStore } from '../stores/conversation-store'
import { useUIStore } from '../stores/ui-store'
import { cn } from '../utils/cn'
import { formatDate, truncate } from '../utils/format'
import type { Conversation } from '@shared/types'

type ViewMode = 'grid' | 'list'
type SortBy = 'updatedAt' | 'createdAt' | 'title'

export function HistoryPage() {
  const conversations = useConversationStore((s) => s.conversations)
  const loadConversations = useConversationStore((s) => s.loadConversations)
  const deleteConversation = useConversationStore((s) => s.deleteConversation)
  const addNotification = useUIStore((s) => s.addNotification)

  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState<string | null>(null)

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const filtered = conversations
    .filter(
      (c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.summary ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.lastMessage ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      return (b[sortBy] as number) - (a[sortBy] as number)
    })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)))
    }
  }

  const deleteSelected = async () => {
    for (const id of selectedIds) {
      await deleteConversation(id)
    }
    addNotification({
      type: 'success',
      title: `Deleted ${selectedIds.size} conversation${selectedIds.size !== 1 ? 's' : ''}`,
    })
    setSelectedIds(new Set())
  }

  const handleExport = async (id: string, format: 'json' | 'md' | 'txt') => {
    setIsExporting(id)
    try {
      const content = await window.api['db:exportConversation'](id, format)
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `conversation-${id.slice(0, 8)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      addNotification({ type: 'success', title: 'Exported conversation' })
    } catch {
      addNotification({ type: 'error', title: 'Export failed' })
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">History</h1>
          <p className="text-xs text-gray-500 mt-0.5">{conversations.length} conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:bg-white/8'
            )}
            aria-label="List view"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              viewMode === 'grid' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:bg-white/8'
            )}
            aria-label="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/8 shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-indigo-500/50 transition-colors"
            aria-label="Search history"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-gray-400 outline-none cursor-pointer"
          aria-label="Sort by"
        >
          <option value="updatedAt">Last updated</option>
          <option value="createdAt">Created</option>
          <option value="title">Title</option>
        </select>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs hover:bg-red-500/25 transition-colors"
            >
              <Trash2 size={12} />
              Delete selected
            </button>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
              <MessageSquare size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">No conversations found</p>
              <p className="text-xs text-gray-600 mt-1">
                {searchQuery ? 'Try a different search term' : 'Start chatting to build your history'}
              </p>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-1">
            {/* Select all row */}
            <div className="flex items-center gap-3 px-3 py-2">
              <button onClick={selectAll} className="text-gray-600 hover:text-gray-400 transition-colors" aria-label="Select all">
                {selectedIds.size === filtered.length && filtered.length > 0 ? (
                  <CheckSquare size={14} className="text-indigo-400" />
                ) : (
                  <Square size={14} />
                )}
              </button>
              <span className="text-xs text-gray-600">
                {filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filtered.map((conv, i) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <HistoryListItem
                  conversation={conv}
                  selected={selectedIds.has(conv.id)}
                  onToggleSelect={() => toggleSelect(conv.id)}
                  onDelete={() => deleteConversation(conv.id)}
                  onExport={(fmt) => handleExport(conv.id, fmt)}
                  isExporting={isExporting === conv.id}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((conv, i) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <HistoryGridItem
                  conversation={conv}
                  selected={selectedIds.has(conv.id)}
                  onToggleSelect={() => toggleSelect(conv.id)}
                  onDelete={() => deleteConversation(conv.id)}
                  onExport={(fmt) => handleExport(conv.id, fmt)}
                  isExporting={isExporting === conv.id}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface HistoryItemProps {
  conversation: Conversation
  selected: boolean
  onToggleSelect: () => void
  onDelete: () => void
  onExport: (format: 'json' | 'md' | 'txt') => void
  isExporting: boolean
}

function HistoryListItem({ conversation, selected, onToggleSelect, onDelete, onExport, isExporting }: HistoryItemProps) {
  const [showExport, setShowExport] = useState(false)

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-xl border transition-all group',
        selected
          ? 'bg-indigo-500/10 border-indigo-500/20'
          : 'bg-white/3 border-white/6 hover:border-white/12 hover:bg-white/5'
      )}
    >
      <button onClick={onToggleSelect} className="text-gray-600 hover:text-indigo-400 transition-colors shrink-0" aria-label="Select">
        {selected ? <CheckSquare size={14} className="text-indigo-400" /> : <Square size={14} />}
      </button>

      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
        <MessageSquare size={13} className="text-indigo-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-200 truncate">{conversation.title}</div>
        {conversation.lastMessage && (
          <div className="text-xs text-gray-600 truncate mt-0.5">{truncate(conversation.lastMessage, 80)}</div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-xs text-gray-500">{formatDate(conversation.updatedAt)}</div>
          {conversation.messageCount != null && (
            <div className="text-[10px] text-gray-700 mt-0.5">{conversation.messageCount} messages</div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-colors"
              aria-label="Export"
            >
              <Download size={13} />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-white/10 rounded-xl py-1 shadow-xl z-20 min-w-[100px]">
                {(['json', 'md', 'txt'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => { onExport(fmt); setShowExport(false) }}
                    className="w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-white/8 text-left transition-colors"
                  >
                    Export .{fmt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryGridItem({ conversation, selected, onToggleSelect, onDelete, onExport, isExporting }: HistoryItemProps) {
  const [showExport, setShowExport] = useState(false)

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all group relative',
        selected
          ? 'bg-indigo-500/10 border-indigo-500/20'
          : 'bg-white/3 border-white/6 hover:border-white/12 hover:bg-white/5'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
          <MessageSquare size={13} className="text-indigo-400" />
        </div>
        <button onClick={onToggleSelect} className="text-gray-600 hover:text-indigo-400 transition-colors" aria-label="Select">
          {selected ? <CheckSquare size={14} className="text-indigo-400" /> : <Square size={14} />}
        </button>
      </div>

      <div className="mb-2">
        <div className="text-sm font-medium text-gray-200 mb-1 line-clamp-2">{conversation.title}</div>
        {conversation.lastMessage && (
          <div className="text-xs text-gray-600 line-clamp-2">{conversation.lastMessage}</div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-600">{formatDate(conversation.updatedAt)}</div>
          {conversation.messageCount != null && (
            <div className="text-[10px] text-gray-700">{conversation.messageCount} msgs</div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-colors"
            >
              <Download size={12} />
            </button>
            {showExport && (
              <div className="absolute right-0 bottom-full mb-1 bg-gray-800 border border-white/10 rounded-xl py-1 shadow-xl z-20 min-w-[100px]">
                {(['json', 'md', 'txt'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => { onExport(fmt); setShowExport(false) }}
                    className="w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-white/8 text-left transition-colors"
                  >
                    .{fmt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onDelete}
            className="p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
