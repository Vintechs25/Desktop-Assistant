import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../stores/ui-store'
import { useConversationStore } from '../stores/conversation-store'
import { useOCR } from './useOCR'

export function useKeyboard() {
  const openCommandPalette = useUIStore((s) => s.openCommandPalette)
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette)
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const createConversation = useConversationStore((s) => s.createConversation)
  const navigate = useNavigate()
  const { captureScreen, captureRegion } = useOCR()

  // ─── In-renderer keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl + K → command palette
      if (ctrlOrCmd && e.key === 'k') {
        e.preventDefault()
        commandPaletteOpen ? closeCommandPalette() : openCommandPalette()
        return
      }

      // Escape → close palette / modals
      if (e.key === 'Escape') {
        if (commandPaletteOpen) closeCommandPalette()
        return
      }

      // Cmd/Ctrl + N → new conversation
      if (ctrlOrCmd && e.key === 'n') {
        e.preventDefault()
        createConversation()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandPaletteOpen, openCommandPalette, closeCommandPalette, createConversation])

  // ─── Main-process → renderer event bridge ────────────────────────────────────
  // Global shortcuts registered in the main process emit these events so the
  // renderer can react even when the window is not focused for key events.
  useEffect(() => {
    const unsubNewConversation = window.api.onMessage('app:newConversation', () => {
      createConversation()
    })

    const unsubCaptureScreen = window.api.onMessage('app:captureScreen', async () => {
      await captureScreen()
    })

    const unsubCaptureRegion = window.api.onMessage('app:captureRegion', async () => {
      await captureRegion()
    })

    const unsubOpenSettings = window.api.onMessage('app:openSettings', () => {
      navigate('/settings')
    })

    const unsubCommandPalette = window.api.onMessage('app:openCommandPalette', () => {
      openCommandPalette()
    })

    return () => {
      unsubNewConversation()
      unsubCaptureScreen()
      unsubCaptureRegion()
      unsubOpenSettings()
      unsubCommandPalette()
    }
  }, [createConversation, captureScreen, captureRegion, navigate, openCommandPalette])
}
