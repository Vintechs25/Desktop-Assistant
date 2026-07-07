import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { AppNotification, Theme, FontSize } from '@shared/types'

interface UIStore {
  sidebarOpen: boolean
  commandPaletteOpen: boolean
  activePanel: 'chat' | 'ocr' | 'prompts' | 'settings' | 'history'
  notifications: AppNotification[]
  theme: Theme
  floatingMode: boolean
  fontSize: FontSize

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  setActivePanel: (panel: UIStore['activePanel']) => void
  addNotification: (n: Omit<AppNotification, 'id'>) => void
  removeNotification: (id: string) => void
  setTheme: (theme: Theme) => void
  setFontSize: (fontSize: FontSize) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  activePanel: 'chat',
  notifications: [],
  theme: 'dark',
  floatingMode: false,
  fontSize: 'md',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  setActivePanel: (panel) => set({ activePanel: panel }),

  addNotification: (n) => {
    const id = uuidv4()
    const notification: AppNotification = { ...n, id }
    set((s) => ({ notifications: [...s.notifications, notification] }))

    const duration = n.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, duration)
    }
  },

  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
}))
