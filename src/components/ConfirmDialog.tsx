'use client'

import * as Icons from '@/lib/icons'
import { AnimatePresence, motion } from 'framer-motion'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonClass?: string
  icon?: React.ComponentType<{ className?: string }>
  dangerous?: boolean
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return context
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (dialog) {
      dialog.resolve(true)
      setDialog(null)
    }
  }, [dialog])

  const handleCancel = useCallback(() => {
    if (dialog) {
      dialog.resolve(false)
      setDialog(null)
    }
  }, [dialog])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {dialog && <ConfirmDialog {...dialog} onConfirm={handleConfirm} onCancel={handleCancel} />}
      </AnimatePresence>
    </ConfirmContext.Provider>
  )
}

/**
 * Purpose: Accessible confirmation dialog with focus trap and ARIA dialog role.
 * Inputs: ConfirmOptions + onConfirm/onCancel callbacks
 * Outputs: Modal dialog that traps focus while open; returns focus to trigger on close
 * Constraints: WCAG 2.1 AA — role=dialog, aria-modal, Tab cycles within, Escape closes
 */
function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass,
  icon: Icon = Icons.AlertTriangle,
  dangerous = false,
  onConfirm,
  onCancel,
}: ConfirmOptions & {
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // Store the element that triggered the dialog so focus returns on close
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    triggerRef.current = document.activeElement
    // Move focus into the dialog on open
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()

    return () => {
      // Return focus to trigger element on unmount
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
      }
    }
  }, [])

  // Trap focus within the dialog
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onCancel()
      return
    }
    if (e.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable || focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (!first || !last) return

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      aria-hidden="true"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start">
          <div
            className={`rounded-lg p-2 ${
              dangerous ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
            }`}
          >
            <Icon
              className={`h-6 w-6 ${
                dangerous
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}
            />
          </div>
          <div className="ml-4 flex-1">
            <h3 id="confirm-title" className="text-lg font-semibold text-zinc-900 dark:text-white">
              {title}
            </h3>
            <p id="confirm-desc" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={
              confirmButtonClass ||
              `rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                dangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`
            }
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Convenience function for quick confirms
export async function confirmAction(
  title: string,
  message: string,
  options: Partial<ConfirmOptions> = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('confirm-dialog', {
        detail: { title, message, ...options, resolve },
      })
      window.dispatchEvent(event)
    } else {
      resolve(false)
    }
  })
}
