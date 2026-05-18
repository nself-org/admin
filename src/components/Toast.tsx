'use client'

import * as Icons from '@/lib/icons'
import { AnimatePresence, motion } from 'framer-motion'
import React, { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Date.now().toString()
      const duration = toast.duration || 5000
      const newToast: Toast = {
        ...toast,
        id,
        duration,
      }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          hideToast(id)
        }, duration)
      }
    },
    [hideToast]
  )

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} hideToast={hideToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  hideToast,
}: {
  toasts: Toast[]
  hideToast: (id: string) => void
}) {
  return (
    <div className="fixed right-4 bottom-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: Icons.CheckCircle,
    error: Icons.XCircle,
    warning: Icons.AlertTriangle,
    info: Icons.Info,
  }

  const colors = {
    success: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100',
    error: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100',
  }

  const iconColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  }

  const Icon = icons[toast.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`max-w-md min-w-[300px] rounded-lg p-4 shadow-lg ${colors[toast.type]}`}
    >
      <div className="flex items-start">
        <Icon className={`h-5 w-5 ${iconColors[toast.type]} mt-0.5 flex-shrink-0`} />
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{toast.title}</p>
          {toast.message && <p className="mt-1 text-xs opacity-90">{toast.message}</p>}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-xs font-medium underline hover:no-underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 rounded-lg p-1 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <Icons.XCircle className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
}

// Convenience functions
export const toast = {
  success: (title: string, message?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', {
        detail: { type: 'success', title, message },
      })
      window.dispatchEvent(event)
    }
  },
  error: (title: string, message?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', {
        detail: { type: 'error', title, message },
      })
      window.dispatchEvent(event)
    }
  },
  warning: (title: string, message?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', {
        detail: { type: 'warning', title, message },
      })
      window.dispatchEvent(event)
    }
  },
  info: (title: string, message?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', {
        detail: { type: 'info', title, message },
      })
      window.dispatchEvent(event)
    }
  },
}
