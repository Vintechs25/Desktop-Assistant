import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Square, X, PanelLeft } from 'lucide-react'
import { useUIStore } from '../stores/ui-store'
import { Sidebar } from './Sidebar'
import { cn } from '../utils/cn'

interface LayoutProps {
  children: React.ReactNode
  floating?: boolean
}

function TitleBar({ floating }: { floating?: boolean }) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <div
      className={cn(
        'flex items-center shrink-0 border-b border-white/8 drag-region select-none',
        floating ? 'h-9 px-3' : 'h-10 px-4'
      )}
      style={{ minHeight: floating ? 36 : 40 }}
    >
      {/* Traffic light buttons */}
      <div className="flex items-center gap-1.5 no-drag">
        <button
          onClick={() => window.api['window:close']()}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center group"
          aria-label="Close window"
          title="Close"
        >
          <X size={7} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
          onClick={() => window.api['window:minimize']()}
          className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-400 transition-colors flex items-center justify-center group"
          aria-label="Minimize window"
          title="Minimize"
        >
          <Minus size={7} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
          onClick={() => window.api['window:maximize']()}
          className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center group"
          aria-label="Maximize window"
          title="Maximize"
        >
          <Square size={6} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* App name - centered */}
      {!floating && (
        <div className="absolute left-1/2 -translate-x-1/2 text-xs font-medium text-gray-500 pointer-events-none">
          AI Assistant
        </div>
      )}

      {/* Sidebar toggle (only in non-floating) */}
      {!floating && (
        <div className="ml-auto no-drag">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/8 transition-colors"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <PanelLeft size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export function Layout({ children, floating = false }: LayoutProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  if (floating) {
    return (
      <div className="flex flex-col h-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/15 shadow-[0_40px_120px_rgba(15,23,42,0.55)] backdrop-blur-3xl ring-1 ring-white/10">
        <TitleBar floating />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden"
              style={{ minWidth: 0 }}
            >
              <div className="w-[260px] h-full">
                <Sidebar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}
