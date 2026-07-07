import React, { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { Copy, Check, User, Bot, AlertCircle, Paperclip } from 'lucide-react'
import type { Message } from '@shared/types'
import { cn } from '../utils/cn'
import { formatDateFull } from '../utils/format'
import { useSettingsStore } from '../stores/settings-store'

interface CodeBlockProps {
  language?: string
  children?: string
}

function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const code = children ?? ''

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.api['system:copyToClipboard'](code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  return (
    <div className="code-block-wrapper my-3">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'text'}</span>
        <button
          className={cn('code-block-copy no-drag', copied && 'copied')}
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={11} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="code-block-content">
        <pre>
          <code className={language ? `language-${language}` : ''}>{code}</code>
        </pre>
      </div>
    </div>
  )
}

interface TypingIndicatorProps {}

function TypingIndicator(_: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <div className="typing-dot w-2 h-2 rounded-full bg-indigo-400" />
      <div className="typing-dot w-2 h-2 rounded-full bg-indigo-400" />
      <div className="typing-dot w-2 h-2 rounded-full bg-indigo-400" />
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  streamingContent?: string
  compact?: boolean
}

export function MessageBubble({ message, isStreaming, streamingContent, compact }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const settings = useSettingsStore((s) => s.settings)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const content = isStreaming ? streamingContent ?? '' : message.content

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.api['system:copyToClipboard'](message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [message.content])

  return (
    <div
      className={cn(
        'group flex animate-slide-up',
        compact ? 'gap-2 px-3 py-2 text-[13px]' : 'gap-3 px-4 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          compact ? 'w-7 h-7' : 'w-8 h-8',
          'rounded-xl flex items-center justify-center shrink-0 mt-0.5',
          isUser
            ? 'bg-indigo-500/20 text-indigo-400'
            : message.isError
            ? 'bg-red-500/20 text-red-400'
            : 'bg-white/8 text-gray-400 dark:bg-white/8'
        )}
        aria-label={isUser ? 'You' : 'AI Assistant'}
      >
        {isUser ? <User size={15} /> : message.isError ? <AlertCircle size={15} /> : <Bot size={15} />}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-1 max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
        {/* Images */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-1">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Attachment ${i + 1}`}
                className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-white/10"
              />
            ))}
          </div>
        )}
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-col gap-2 mb-1">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-gray-400">
                    <Paperclip size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-100 truncate">{attachment.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {attachment.type || 'Document'} · {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => window.api['system:saveFile']?.(attachment)}
                  className="px-2 py-1 rounded-xl bg-indigo-500/10 text-indigo-200 text-[11px] hover:bg-indigo-500/20 transition-colors"
                  aria-label={`Save ${attachment.name}`}
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div
          className={cn(
            'relative rounded-2xl shadow-sm',
            compact ? 'px-3 py-2 text-[13px]' : 'px-4 py-3 text-sm',
            isUser
              ? 'bg-indigo-500/10 text-indigo-100 border border-indigo-400/10 rounded-tr-sm'
              : message.isError
              ? 'bg-red-500/10 text-red-200 border border-red-500/15 rounded-tl-sm'
              : 'glass text-gray-100 rounded-tl-sm'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
          ) : isStreaming && !content ? (
            <TypingIndicator />
          ) : settings.markdownEnabled ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code(props) {
                    const { className, children, ...rest } = props
                    const match = /language-(\w+)/.exec(className || '')
                    const isBlock = String(children).includes('\n')
                    if (isBlock || match) {
                      return (
                        <CodeBlock language={match?.[1]}>
                          {String(children).replace(/\n$/, '')}
                        </CodeBlock>
                      )
                    }
                    return (
                      <code className={className} {...rest}>
                        {children}
                      </code>
                    )
                  },
                  pre({ children }) {
                    return <>{children}</>
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
          )}

          {isStreaming && content && (
            <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
          )}
        </div>

        {!compact && (
          <div
            className={cn(
              'flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-500',
              isUser ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <span>{formatDateFull(message.createdAt)}</span>
            {settings.showTokenCount && message.tokens && (
              <span>{message.tokens}t</span>
            )}
            {message.model && <span>{message.model}</span>}
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Copy message"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
