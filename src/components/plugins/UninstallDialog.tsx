'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
} from 'lucide-react'
import { useState } from 'react'

export interface UninstallDialogProps {
  plugin: { name: string; displayName: string }
  onClose: () => void
  onRemoved: (name: string) => void
  /** Names of other installed plugins that depend on this plugin */
  dependents?: string[]
}

type RemoveState = 'idle' | 'removing' | 'success' | 'error'

export function UninstallDialog({
  plugin,
  onClose,
  onRemoved,
  dependents = [],
}: UninstallDialogProps) {
  const [removeState, setRemoveState] = useState<RemoveState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleRemove() {
    if (removeState !== 'idle') return
    setRemoveState('removing')
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/plugins/${plugin.name}/install`, {
        method: 'DELETE',
      })
      const data = (await res.json()) as {
        success?: boolean
        error?: string
      }

      if (!res.ok || data.success === false) {
        setRemoveState('error')
        setErrorMessage(data.error ?? 'Removal failed. Please try again.')
        return
      }

      setRemoveState('success')
      // Brief flash of success then close
      setTimeout(() => {
        onRemoved(plugin.name)
        onClose()
      }, 900)
    } catch {
      setRemoveState('error')
      setErrorMessage('Network error. Please check your connection and retry.')
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={removeState === 'removing' ? undefined : onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-sm rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-700/50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h2 className="font-semibold text-white">
                Remove {plugin.displayName}?
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={removeState === 'removing'}
              className="text-zinc-500 transition-colors hover:text-white disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-3 p-5">
            <p className="text-sm text-zinc-400">
              This will uninstall{' '}
              <span className="font-medium text-white">
                {plugin.displayName}
              </span>{' '}
              from your nself stack. This action cannot be undone without
              reinstalling.
            </p>

            {dependents.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-sm text-amber-300">
                  Warning:{' '}
                  <span className="font-medium">{dependents.length}</span> other{' '}
                  {dependents.length === 1
                    ? 'plugin depends'
                    : 'plugins depend'}{' '}
                  on this plugin.
                </p>
              </div>
            )}

            {removeState === 'error' && errorMessage && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-900/20 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
            )}

            {removeState === 'success' && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-900/30 p-3">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm text-emerald-300">Plugin removed.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-700/50 px-5 py-4">
            <button
              onClick={onClose}
              disabled={removeState === 'removing'}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={removeState !== 'idle'}
              className="flex min-w-[90px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removeState === 'removing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Removing…
                </>
              ) : removeState === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Removed
                </>
              ) : (
                'Remove'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
