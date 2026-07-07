import React, { useEffect } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { useSettingsStore } from './stores/settings-store'
import { useTheme } from './hooks/useTheme'
import { useKeyboard } from './hooks/useKeyboard'
import { Layout } from './components/Layout'
import { CommandPalette } from './components/CommandPalette'
import { Notifications } from './components/Notifications'
import { FloatingView } from './components/FloatingView'
import { ChatPage } from './pages/ChatPage'
import { SettingsPage } from './pages/SettingsPage'
import { HistoryPage } from './pages/HistoryPage'
import { PromptsPage } from './pages/PromptsPage'
import { OCRPage } from './pages/OCRPage'

function ThemeProvider({ children }: { children: React.ReactNode }) {
  // This hook applies the dark class to document.documentElement
  useTheme()
  return <>{children}</>
}

function KeyboardProvider({ children }: { children: React.ReactNode }) {
  useKeyboard()
  return <>{children}</>
}

function AppContent() {
  const settings = useSettingsStore((s) => s.settings)
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const fontSize = settings.fontSize

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Apply font size to root
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg', 'font-size-xl')
    root.classList.add(`font-size-${fontSize}`)
  }, [fontSize])

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <ChatPage />
            </Layout>
          }
        />
        <Route
          path="/settings"
          element={
            <Layout>
              <SettingsPage />
            </Layout>
          }
        />
        <Route
          path="/history"
          element={
            <Layout>
              <HistoryPage />
            </Layout>
          }
        />
        <Route
          path="/prompts"
          element={
            <Layout>
              <PromptsPage />
            </Layout>
          }
        />
        <Route
          path="/ocr"
          element={
            <Layout>
              <OCRPage />
            </Layout>
          }
        />
      </Routes>
      <CommandPalette />
      <Notifications />
    </>
  )
}

function FloatingApp() {
  const loadSettings = useSettingsStore((s) => s.loadSettings)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return (
    <>
      <Layout floating>
        <FloatingView />
      </Layout>
      <Notifications />
    </>
  )
}

export default function App() {
  // Detect floating mode from URL hash
  const isFloating =
    typeof window !== 'undefined' &&
    (window.location.hash.includes('floating') ||
      window.location.search.includes('mode=floating'))

  return (
    <Router>
      <ThemeProvider>
        <KeyboardProvider>
          {isFloating ? <FloatingApp /> : <AppContent />}
        </KeyboardProvider>
      </ThemeProvider>
    </Router>
  )
}
