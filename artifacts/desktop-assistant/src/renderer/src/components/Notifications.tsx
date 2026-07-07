import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useUIStore } from '../stores/ui-store'
import type { AppNotification } from '@shared/types'
import { cn } from '../utils/cn'

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  error: 'text-red-400 bg-red-400/10 border-red-400/20',
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  info: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
}

function NotificationItem({ notification }: { notification: AppNotification }) {
  const removeNotification = useUIStore((s) => s.removeNotification)
  const Icon = icons[notification.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-lg',
        'bg-gray-900/90 dark:bg-gray-900/95 border-white/10',
        'min-w-[300px] max-w-[380px]'
      )}
    >
      <div className={cn('mt-0.5 p-1 rounded-md', colors[notification.type])}>
        <Icon size={14} className="shrink-0" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100 leading-tight">{notification.title}</p>
        {notification.message && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{notification.message}</p>
        )}
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className="mt-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {notification.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => removeNotification(notification.id)}
        className="mt-0.5 p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}

export function Notifications() {
  const notifications = useUIStore((s) => s.notifications)

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="sync">
        {notifications.map((n) => (
          <div key={n.id} className="pointer-events-auto">
            <NotificationItem notification={n} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
