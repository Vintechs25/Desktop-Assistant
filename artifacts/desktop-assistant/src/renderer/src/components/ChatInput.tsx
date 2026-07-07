import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Send, Paperclip, Monitor, BookOpen, X, Loader2
} from 'lucide-react'
import { useConversationStore } from '../stores/conversation-store'
import { useUIStore } from '../stores/ui-store'
import { useSettingsStore } from '../stores/settings-store'
import type { Attachment } from '@shared/types'
import { cn } from '../utils/cn'
import { estimateTokens, formatBytes } from '../utils/format'
import { v4 as uuidv4 } from 'uuid'

interface ChatInputProps {
  onPromptLibrary?: () => void
  disabled?: boolean
  compact?: boolean
}

export function ChatInput({ onPromptLibrary, disabled, compact }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sendMessage = useConversationStore((s) => s.sendMessage)
  const isStreaming = useConversationStore((s) => s.isStreaming)
  const abortStreaming = useConversationStore((s) => s.abortStreaming)
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const addNotification = useUIStore((s) => s.addNotification)
  const settings = useSettingsStore((s) => s.settings)

  const canSend = (value.trim().length > 0 || images.length > 0) && !disabled && !!currentConversationId

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`
  }, [value])

  const handleSend = useCallback(async () => {
    if (!canSend || isStreaming) return
    const content = value.trim()
    setValue('')
    setImages([])
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await sendMessage(content, images, attachments)
  }, [canSend, isStreaming, value, images, attachments, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (settings.sendWithEnter) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleSend()
        }
      } else {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          handleSend()
        }
      }
    },
    [settings.sendWithEnter, handleSend]
  )

  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImages((prev) => [...prev, dataUrl])
    }
    reader.readAsDataURL(file)
  }, [])

  const processAttachmentFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result as string
      const attachment: Attachment = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        size: file.size,
        data,
      }
      setAttachments((prev) => [...prev, attachment])
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          processImageFile(file)
        } else {
          processAttachmentFile(file)
        }
      })
      e.target.value = ''
    },
    [processImageFile, processAttachmentFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          processImageFile(file)
        } else {
          processAttachmentFile(file)
        }
      })
    },
    [processImageFile, processAttachmentFile]
  )

  const handleScreenshot = useCallback(async () => {
    try {
      // capture:screen already returns a full data URL (data:image/png;base64,...)
      const dataUrl = await window.api['capture:screen']()
      setImages((prev) => [...prev, dataUrl])
      addNotification({ type: 'success', title: 'Screenshot captured' })
    } catch {
      addNotification({ type: 'error', title: 'Screenshot failed' })
    }
  }, [addNotification])

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const tokenEstimate = estimateTokens(value)

  return (
    <div
      className={cn(
        compact ? 'px-2 pb-2 pt-1 border-t border-white/15 bg-slate-950/80' : 'px-3 pb-3 pt-2 border-t border-white/10 bg-slate-950/70',
        isDragging && 'ring-2 ring-inset ring-indigo-500/50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attachment previews */}
      {!compact && (images.length > 0 || attachments.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((img, i) => (
            <div key={i} className="relative group/img">
              <img
                src={img}
                alt={`Image ${i + 1}`}
                className="w-16 h-16 rounded-lg object-cover border border-white/10"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X size={9} />
              </button>
            </div>
          ))}
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/8 border border-white/10 text-xs text-gray-300 group/att"
            >
              <Paperclip size={11} className="text-gray-500" />
              <span className="max-w-[100px] truncate">{att.name}</span>
              <span className="text-gray-600">{formatBytes(att.size)}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="ml-0.5 text-gray-500 hover:text-red-400 transition-colors"
                aria-label="Remove attachment"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        className={cn(
          'flex items-end gap-2 rounded-3xl border transition-all',
          compact ? 'bg-slate-950/25 border-white/10' : 'bg-slate-950/40 border-white/10',
          'focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/15'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !currentConversationId
              ? 'Select or create a conversation to start chatting'
              : isStreaming
              ? 'AI is responding...'
              : settings.sendWithEnter
              ? 'Type a message... (Enter to send, Shift+Enter for newline)'
              : 'Type a message... (Ctrl+Enter to send)'
          }
          disabled={!currentConversationId || disabled}
          rows={1}
          className={cn(
            'flex-1 bg-transparent resize-none leading-relaxed',
            compact ? 'py-2 px-2 text-[13px]' : 'py-3 px-3 text-sm',
            'text-gray-100 placeholder-gray-500 outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50 min-h-[34px]'
          )}
          aria-label="Message input"
        />

        {/* Toolbar */}
        <div className={cn('flex items-center gap-1 px-2', compact ? 'py-1' : 'py-2')}>
          {/* File attach */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors"
            aria-label="Attach file"
            title="Attach image or file"
            disabled={disabled}
          >
            <Paperclip size={15} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Screenshot */}
          <button
            onClick={handleScreenshot}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-indigo-500/15 transition-colors"
            aria-label="Capture screenshot"
            title="Capture screenshot"
            disabled={disabled}
          >
            <Monitor size={15} />
          </button>

          {/* Prompt library */}
          {onPromptLibrary && (
            <button
              onClick={onPromptLibrary}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors"
              aria-label="Open prompt library"
              title="Prompt library"
              disabled={disabled}
            >
              <BookOpen size={15} />
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-0.5" />

          {/* Send / Stop */}
          {isStreaming ? (
            <button
              onClick={abortStreaming}
              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Loader2 size={15} className="animate-spin" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                canSend
                  ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-md shadow-indigo-500/25'
                  : 'text-gray-600 cursor-not-allowed'
              )}
              aria-label="Send message"
              title="Send message"
            >
              <Send size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Character counter */}
      {!compact && value.length > 0 && (
        <div className="flex justify-end mt-1 gap-2">
          <span className="text-[10px] text-gray-600">
            ~{tokenEstimate} tokens
          </span>
        </div>
      )}
    </div>
  )
}
