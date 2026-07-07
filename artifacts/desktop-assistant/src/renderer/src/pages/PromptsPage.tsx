import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Star, Lock, Tag, BookOpen, X,
  Edit2, Trash2, Copy, Check, Zap
} from 'lucide-react'
import { useUIStore } from '../stores/ui-store'
import { useConversationStore } from '../stores/conversation-store'
import { useNavigate } from 'react-router-dom'
import { cn } from '../utils/cn'
import type { PromptTemplate, PromptCategory } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'

const CATEGORIES: { id: PromptCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'writing', label: 'Writing' },
  { id: 'coding', label: 'Coding' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'summarization', label: 'Summarization' },
  { id: 'translation', label: 'Translation' },
  { id: 'research', label: 'Research' },
  { id: 'email', label: 'Email' },
  { id: 'brainstorming', label: 'Brainstorming' },
  { id: 'debugging', label: 'Debugging' },
  { id: 'explanation', label: 'Explanation' },
  { id: 'custom', label: 'Custom' },
]

const CATEGORY_COLORS: Record<PromptCategory, string> = {
  writing: 'bg-blue-500/20 text-blue-400',
  coding: 'bg-emerald-500/20 text-emerald-400',
  analysis: 'bg-purple-500/20 text-purple-400',
  summarization: 'bg-amber-500/20 text-amber-400',
  translation: 'bg-cyan-500/20 text-cyan-400',
  research: 'bg-indigo-500/20 text-indigo-400',
  email: 'bg-pink-500/20 text-pink-400',
  brainstorming: 'bg-orange-500/20 text-orange-400',
  debugging: 'bg-red-500/20 text-red-400',
  explanation: 'bg-teal-500/20 text-teal-400',
  custom: 'bg-gray-500/20 text-gray-400',
}

interface PromptModalProps {
  prompt?: PromptTemplate | null
  onClose: () => void
  onSave: (data: Partial<PromptTemplate>) => void
}

function PromptModal({ prompt, onClose, onSave }: PromptModalProps) {
  const [title, setTitle] = useState(prompt?.title ?? '')
  const [description, setDescription] = useState(prompt?.description ?? '')
  const [content, setContent] = useState(prompt?.content ?? '')
  const [category, setCategory] = useState<PromptCategory>(prompt?.category ?? 'custom')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    onSave({ title, description, content, category })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-gray-200">
            {prompt ? 'Edit Prompt' : 'New Prompt'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Prompt title"
              required
              className="input-base"
              aria-label="Prompt title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description (optional)"
              className="input-base"
              aria-label="Prompt description"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PromptCategory)}
              className="input-base cursor-pointer"
              aria-label="Prompt category"
            >
              {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Prompt Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your prompt here..."
              required
              rows={6}
              className="input-base resize-none font-mono text-xs"
              aria-label="Prompt content"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !content.trim()}
              className="flex-1 py-2 rounded-xl text-sm text-white bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {prompt ? 'Save Changes' : 'Create Prompt'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

interface PromptCardProps {
  prompt: PromptTemplate
  onUse: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onCopy: () => void
}

function PromptCard({ prompt, onUse, onEdit, onDelete, onToggleFavorite, onCopy }: PromptCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group flex flex-col gap-3 p-4 rounded-xl bg-white/3 border border-white/6 hover:border-white/12 hover:bg-white/5 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                CATEGORY_COLORS[prompt.category]
              )}
            >
              {prompt.category}
            </span>
            {prompt.isBuiltin && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-600">
                <Lock size={9} />
                built-in
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-200 truncate">{prompt.title}</h3>
          {prompt.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{prompt.description}</p>
          )}
        </div>
        <button
          onClick={onToggleFavorite}
          className={cn(
            'p-1 rounded-md transition-colors shrink-0',
            prompt.isFavorite
              ? 'text-amber-400 hover:text-amber-300'
              : 'text-gray-600 hover:text-amber-400'
          )}
          aria-label={prompt.isFavorite ? 'Unstar' : 'Star'}
        >
          <Star size={13} fill={prompt.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <p className="text-xs text-gray-600 line-clamp-3 font-mono bg-white/3 rounded-lg p-2.5 leading-relaxed">
        {prompt.content}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-gray-700">
          <Zap size={9} />
          <span>{prompt.usageCount} uses</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-colors"
            aria-label="Copy prompt"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
          {!prompt.isBuiltin && (
            <>
              <button
                onClick={onEdit}
                className="p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-colors"
                aria-label="Edit prompt"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={onDelete}
                className="p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                aria-label="Delete prompt"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
          <button
            onClick={onUse}
            className="px-2.5 py-1 rounded-lg bg-indigo-500 text-white text-[11px] font-medium hover:bg-indigo-400 transition-colors"
            aria-label="Use prompt"
          >
            Use
          </button>
        </div>
      </div>
    </div>
  )
}

export function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<PromptCategory | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null)
  const addNotification = useUIStore((s) => s.addNotification)
  const createConversation = useConversationStore((s) => s.createConversation)
  const sendMessage = useConversationStore((s) => s.sendMessage)
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const navigate = useNavigate()

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      const data = await window.api['db:getPrompts']()
      setPrompts(data)
    } catch (err) {
      console.error('Failed to load prompts:', err)
    }
  }

  const filtered = prompts.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const favorites = filtered.filter((p) => p.isFavorite)
  const nonFavorites = filtered.filter((p) => !p.isFavorite)

  const handleSave = async (data: Partial<PromptTemplate>) => {
    try {
      const apiAny = window.api as any
      if (typeof apiAny['db:savePrompt'] === 'function') {
        const saved = await apiAny['db:savePrompt']({
          ...data,
          id: editingPrompt?.id ?? uuidv4(),
          tags: [],
          isFavorite: false,
          usageCount: 0,
          createdAt: editingPrompt?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
          isBuiltin: false,
        })
        if (editingPrompt) {
          setPrompts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)))
        } else {
          setPrompts((prev) => [saved, ...prev])
        }
        addNotification({ type: 'success', title: editingPrompt ? 'Prompt updated' : 'Prompt created' })
      }
    } catch {
      addNotification({ type: 'error', title: 'Failed to save prompt' })
    }
    setEditingPrompt(null)
  }

  const handleDelete = async (id: string) => {
    try {
      const apiAny = window.api as any
      if (typeof apiAny['db:deletePrompt'] === 'function') {
        await apiAny['db:deletePrompt'](id)
      }
      setPrompts((prev) => prev.filter((p) => p.id !== id))
      addNotification({ type: 'success', title: 'Prompt deleted' })
    } catch {
      addNotification({ type: 'error', title: 'Failed to delete prompt' })
    }
  }

  const handleToggleFavorite = async (prompt: PromptTemplate) => {
    const updated = { ...prompt, isFavorite: !prompt.isFavorite }
    setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? updated : p)))
    try {
      const apiAny = window.api as any
      if (typeof apiAny['db:savePrompt'] === 'function') {
        await apiAny['db:savePrompt'](updated)
      }
    } catch {}
  }

  const handleUse = async (prompt: PromptTemplate) => {
    let convId = currentConversationId
    if (!convId) {
      const conv = await createConversation(prompt.title)
      convId = conv.id
    }
    navigate('/')
    // Increment usage count
    const updated = { ...prompt, usageCount: prompt.usageCount + 1 }
    setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? updated : p)))
    await sendMessage(prompt.content)
    addNotification({ type: 'success', title: 'Prompt sent to chat' })
  }

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      window.api['system:copyToClipboard'](content)
    }
    addNotification({ type: 'success', title: 'Copied to clipboard' })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">Prompt Library</h1>
          <p className="text-xs text-gray-500 mt-0.5">{prompts.length} prompts</p>
        </div>
        <button
          onClick={() => { setEditingPrompt(null); setShowModal(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors"
          aria-label="Add prompt"
        >
          <Plus size={14} />
          Add Prompt
        </button>
      </div>

      {/* Search + Categories */}
      <div className="px-6 py-3 space-y-3 border-b border-white/8 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-indigo-500/50 transition-colors"
            aria-label="Search prompts"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0',
                activeCategory === cat.id
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/8'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
              <BookOpen size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">No prompts found</p>
              <p className="text-xs text-gray-600 mt-1">
                {searchQuery ? 'Try a different search term' : 'Add your first custom prompt'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {favorites.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star size={12} className="text-amber-400" fill="currentColor" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Favorites</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {favorites.map((prompt, i) => (
                    <motion.div
                      key={prompt.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <PromptCard
                        prompt={prompt}
                        onUse={() => handleUse(prompt)}
                        onEdit={() => { setEditingPrompt(prompt); setShowModal(true) }}
                        onDelete={() => handleDelete(prompt.id)}
                        onToggleFavorite={() => handleToggleFavorite(prompt)}
                        onCopy={() => handleCopy(prompt.content)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {nonFavorites.length > 0 && (
              <div>
                {favorites.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">All Prompts</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {nonFavorites.map((prompt, i) => (
                    <motion.div
                      key={prompt.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <PromptCard
                        prompt={prompt}
                        onUse={() => handleUse(prompt)}
                        onEdit={() => { setEditingPrompt(prompt); setShowModal(true) }}
                        onDelete={() => handleDelete(prompt.id)}
                        onToggleFavorite={() => handleToggleFavorite(prompt)}
                        onCopy={() => handleCopy(prompt.content)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <PromptModal
            prompt={editingPrompt}
            onClose={() => { setShowModal(false); setEditingPrompt(null) }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
