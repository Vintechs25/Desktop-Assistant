import { useState, useCallback, useRef } from 'react'

interface UseAIResult {
  sendMessage: (content: string, images?: string[], attachments?: any[]) => Promise<void>
  abort: () => void
  isStreaming: boolean
  streamingContent: string
  error: string | null
}

export function useAI(): UseAIResult {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string, images?: string[], attachments?: any[]) => {
      setError(null)
      setIsStreaming(true)
      setStreamingContent('')
      abortControllerRef.current = new AbortController()

      try {
        const settings = await window.api['db:getSettings']()
        const apiAny = window.api as any

        if (typeof apiAny['ai:chat'] === 'function') {
          let fullContent = ''
          await apiAny['ai:chat']({
            messages: [{ role: 'user', content }],
            model: settings.defaultModel,
            providerId: settings.defaultProviderId,
            stream: settings.streamingEnabled,
            images,
            onChunk: (chunk: string) => {
              if (abortControllerRef.current?.signal.aborted) return
              fullContent += chunk
              setStreamingContent(fullContent)
            },
          })
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError(err?.message ?? 'An unexpected error occurred.')
        }
      } finally {
        setIsStreaming(false)
        setStreamingContent('')
      }
    },
    []
  )

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setStreamingContent('')
  }, [])

  return { sendMessage, abort, isStreaming, streamingContent, error }
}
