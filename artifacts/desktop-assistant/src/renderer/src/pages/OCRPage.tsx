import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor, Crop, Copy, Check, Send, Trash2, Scan,
  Clock, Globe, X, ChevronDown, AlertCircle, Loader2
} from 'lucide-react'
import { useOCR } from '../hooks/useOCR'
import { useUIStore } from '../stores/ui-store'
import { useConversationStore } from '../stores/conversation-store'
import { useSettingsStore } from '../stores/settings-store'
import { useNavigate } from 'react-router-dom'
import { cn } from '../utils/cn'
import { formatDateFull, truncate } from '../utils/format'
import type { OCRResult } from '@shared/types'

const LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'spa', label: 'Spanish' },
  { code: 'ita', label: 'Italian' },
  { code: 'por', label: 'Portuguese' },
  { code: 'rus', label: 'Russian' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'kor', label: 'Korean' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'chi_tra', label: 'Chinese (Traditional)' },
  { code: 'ara', label: 'Arabic' },
]

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color =
    pct >= 80 ? 'text-emerald-400 bg-emerald-400/10' :
    pct >= 60 ? 'text-amber-400 bg-amber-400/10' :
                'text-red-400 bg-red-400/10'
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', color)}>
      {pct}% confidence
    </span>
  )
}

interface OCRHistoryItemProps {
  result: OCRResult
  onCopy: () => void
  onSendToAI: () => void
}

function OCRHistoryItem({ result, onCopy, onSendToAI }: OCRHistoryItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 rounded-xl bg-white/3 border border-white/6 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
            <Scan size={13} className="text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-gray-600 flex items-center gap-1.5">
              <Clock size={9} />
              <span>{formatDateFull(result.createdAt)}</span>
              <span>·</span>
              <span className="capitalize">{result.source}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ConfidenceBadge confidence={result.confidence} />
        </div>
      </div>

      <div
        className={cn(
          'text-xs text-gray-300 leading-relaxed font-mono bg-white/3 rounded-lg p-2.5 mt-2',
          !expanded && 'line-clamp-3'
        )}
      >
        {result.text || <span className="text-gray-600 italic">No text extracted</span>}
      </div>

      {result.text && result.text.split('\n').length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          <ChevronDown size={10} className={cn('transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10 text-xs transition-colors"
          aria-label="Copy OCR text"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={onSendToAI}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 text-xs transition-colors"
          aria-label="Send to AI"
        >
          <Send size={11} />
          Send to AI
        </button>
        {result.imageData && (
          <div className="ml-auto">
            <img
              src={result.imageData}
              alt="Captured screenshot"
              className="h-8 rounded border border-white/10 object-cover"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function OCRPage() {
  const { captureScreen, captureRegion, isLoading, result, error } = useOCR()
  const [history, setHistory] = useState<OCRResult[]>([])
  const [selectedResult, setSelectedResult] = useState<OCRResult | null>(null)
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const addNotification = useUIStore((s) => s.addNotification)
  const createConversation = useConversationStore((s) => s.createConversation)
  const sendMessage = useConversationStore((s) => s.sendMessage)
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const navigate = useNavigate()

  useEffect(() => {
    loadHistory()
  }, [])

  // When new result comes in, add to history
  useEffect(() => {
    if (result) {
      setHistory((prev) => {
        const exists = prev.some((h) => h.id === result.id)
        if (exists) return prev
        return [result, ...prev]
      })
      setSelectedResult(result)
    }
  }, [result])

  const loadHistory = async () => {
    try {
      const data = await window.api['db:getOCRHistory']()
      setHistory(data.sort((a, b) => b.createdAt - a.createdAt))
    } catch (err) {
      console.error('Failed to load OCR history:', err)
    }
  }

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.api['system:copyToClipboard'](text)
    }
    addNotification({ type: 'success', title: 'Copied to clipboard' })
  }, [addNotification])

  const handleSendToAI = useCallback(async (text: string) => {
    let convId = currentConversationId
    if (!convId) {
      const conv = await createConversation('OCR Text Analysis')
      convId = conv.id
    }
    navigate('/')
    await sendMessage(`Please analyze this extracted text:\n\n${text}`)
    addNotification({ type: 'success', title: 'Sent to AI chat' })
  }, [currentConversationId, createConversation, sendMessage, navigate, addNotification])

  const handleClearHistory = async () => {
    try {
      const apiAny = window.api as any
      if (typeof apiAny['db:clearOCRHistory'] === 'function') {
        await apiAny['db:clearOCRHistory']()
      }
      setHistory([])
      setSelectedResult(null)
      addNotification({ type: 'success', title: 'History cleared' })
    } catch {
      addNotification({ type: 'error', title: 'Failed to clear history' })
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">OCR Capture</h1>
          <p className="text-xs text-gray-500 mt-0.5">Extract text from your screen</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
            <Globe size={12} className="text-gray-500" />
            <select
              value={settings.ocrLanguage}
              onChange={(e) => updateSettings({ ocrLanguage: e.target.value })}
              className="bg-transparent text-xs text-gray-400 outline-none cursor-pointer"
              aria-label="OCR language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Capture buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={captureScreen}
            disabled={isLoading}
            className={cn(
              'group flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all',
              'border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Capture full screen"
          >
            {isLoading ? (
              <Loader2 size={28} className="text-gray-500 animate-spin" />
            ) : (
              <Monitor size={28} className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
            )}
            <div className="text-center">
              <div className="text-sm font-medium text-gray-300 group-hover:text-gray-100 transition-colors">
                Full Screen
              </div>
              <div className="text-[11px] text-gray-600 mt-0.5">Capture entire display</div>
            </div>
          </button>

          <button
            onClick={captureRegion}
            disabled={isLoading}
            className={cn(
              'group flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all',
              'border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Capture region"
          >
            {isLoading ? (
              <Loader2 size={28} className="text-gray-500 animate-spin" />
            ) : (
              <Crop size={28} className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
            )}
            <div className="text-center">
              <div className="text-sm font-medium text-gray-300 group-hover:text-gray-100 transition-colors">
                Select Region
              </div>
              <div className="text-[11px] text-gray-600 mt-0.5">Choose area to capture</div>
            </div>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Latest result */}
        {selectedResult && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300">Latest Result</h2>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-1 rounded-md text-gray-600 hover:text-gray-400 transition-colors"
                aria-label="Dismiss result"
              >
                <X size={13} />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <div className="flex items-center justify-between mb-3">
                <ConfidenceBadge confidence={selectedResult.confidence} />
                <span className="text-[10px] text-gray-600 capitalize">{selectedResult.source}</span>
              </div>
              <div className="text-sm text-gray-200 leading-relaxed font-mono whitespace-pre-wrap bg-black/20 rounded-lg p-3 max-h-48 overflow-y-auto">
                {selectedResult.text || <span className="text-gray-600 italic">No text found</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleCopy(selectedResult.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10 text-xs transition-colors"
                >
                  <Copy size={11} />
                  Copy Text
                </button>
                <button
                  onClick={() => handleSendToAI(selectedResult.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs hover:bg-indigo-400 transition-colors"
                >
                  <Send size={11} />
                  Send to AI
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">
              History
              {history.length > 0 && (
                <span className="ml-2 text-[10px] text-gray-600 font-normal">{history.length} items</span>
              )}
            </h2>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors"
                aria-label="Clear OCR history"
              >
                <Trash2 size={12} />
                Clear all
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                <Scan size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">No captures yet</p>
                <p className="text-xs text-gray-700 mt-1">Use the buttons above to capture text from your screen</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <OCRHistoryItem
                    result={item}
                    onCopy={() => handleCopy(item.text)}
                    onSendToAI={() => handleSendToAI(item.text)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
