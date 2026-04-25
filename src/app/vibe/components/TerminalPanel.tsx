'use client'

import type {
  ApplyStatus,
  TargetEnv,
  VibeGeneration,
} from '@/app/vibe/hooks/useVibeSession'
import type { StreamChunk } from '@/app/vibe/hooks/useVibeStream'
import { AlertTriangle, CheckCircle2, Loader2, Terminal } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface TerminalPanelProps {
  chunks: StreamChunk[]
  isStreaming: boolean
  generation: VibeGeneration | null
  applyStatus: ApplyStatus
  targetEnv: TargetEnv
  onApply: (confirmPhrase?: string) => void
}

// Minimum 3 second countdown before apply button becomes active
const CONFIRM_COUNTDOWN_MS = 3000

export function TerminalPanel({
  chunks,
  isStreaming,
  generation,
  applyStatus,
  targetEnv,
  onApply,
}: TerminalPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [countdown, setCountdown] = useState(CONFIRM_COUNTDOWN_MS / 1000)
  const [countdownDone, setCountdownDone] = useState(false)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isProd = targetEnv === 'prod'
  const prodPhraseValid = !isProd || confirmPhrase === 'confirm-prod'
  const canApply =
    generation?.status === 'done' &&
    generation.applied_at === null &&
    applyStatus === 'idle'

  // Auto-scroll terminal
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chunks])

  // Start countdown when modal opens
  useEffect(() => {
    if (!showConfirmModal) {
      setCountdown(CONFIRM_COUNTDOWN_MS / 1000)
      setCountdownDone(false)
      if (countdownRef.current) clearInterval(countdownRef.current)
      return
    }

    setCountdown(CONFIRM_COUNTDOWN_MS / 1000)
    setCountdownDone(false)

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          setCountdownDone(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [showConfirmModal])

  const handleOpenConfirm = useCallback(() => {
    setConfirmPhrase('')
    setShowConfirmModal(true)
  }, [])

  const handleConfirmApply = useCallback(() => {
    if (!countdownDone) return
    if (!prodPhraseValid) return
    setShowConfirmModal(false)
    onApply(isProd ? confirmPhrase : undefined)
  }, [countdownDone, prodPhraseValid, onApply, isProd, confirmPhrase])

  const handleCancelConfirm = useCallback(() => {
    setShowConfirmModal(false)
    setConfirmPhrase('')
  }, [])

  const terminalLines = chunks.map((c, i) => {
    if (c.type === 'token') {
      return (
        <span key={i} className="text-zinc-300">
          {c.content}
        </span>
      )
    }
    if (c.type === 'status') {
      return (
        <div key={i} className="font-medium text-sky-400">
          ▶ {c.content}
        </div>
      )
    }
    if (c.type === 'error') {
      return (
        <div key={i} className="text-red-400">
          ✖ {c.content}
        </div>
      )
    }
    if (c.type === 'done') {
      return (
        <div key={i} className="text-emerald-400">
          ✓ {c.content}
        </div>
      )
    }
    return null
  })

  return (
    <section
      role="region"
      aria-label="Terminal"
      className="flex h-full flex-col"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Terminal className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          Apply Output
        </h2>
        {canApply && (
          <button
            type="button"
            onClick={handleOpenConfirm}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:outline-none"
            aria-label="Apply generated changes"
          >
            Apply Changes
            {isProd && (
              <span className="rounded bg-red-500/20 px-1 py-0.5 text-[10px] text-red-300">
                PROD
              </span>
            )}
          </button>
        )}
        {applyStatus === 'applying' && (
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Applying...
          </span>
        )}
        {applyStatus === 'done' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Applied
          </span>
        )}
        {applyStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Failed
          </span>
        )}
      </div>

      {/* Terminal output */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="flex-1 overflow-y-auto bg-zinc-950 p-3 font-mono text-xs leading-relaxed"
      >
        {chunks.length === 0 && !isStreaming && (
          <p className="text-zinc-600 italic">
            {generation?.status === 'done'
              ? 'Generation complete. Click Apply to run the changes.'
              : 'Terminal output will appear here during generation and apply.'}
          </p>
        )}
        {isStreaming && chunks.length === 0 && (
          <span className="animate-pulse text-zinc-500">Connecting...</span>
        )}
        <div className="space-y-0.5">{terminalLines}</div>
        {isStreaming && (
          <span
            className="ml-0.5 inline-block h-3.5 w-2 animate-pulse bg-zinc-300"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Confirm modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
          className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
            <h3
              id="confirm-title"
              className="flex items-center gap-2 text-sm font-semibold text-zinc-100"
            >
              <AlertTriangle
                className="h-4 w-4 text-amber-400"
                aria-hidden="true"
              />
              Confirm Apply
              {isProd && (
                <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">
                  PRODUCTION
                </span>
              )}
            </h3>

            <p id="confirm-desc" className="mt-2 text-xs text-zinc-400">
              This will run the migration, update Hasura permissions, and write
              UI files to your{' '}
              <strong className="text-zinc-200">{targetEnv}</strong>{' '}
              environment. This cannot be undone automatically.
            </p>

            {isProd && (
              <div className="mt-3">
                <label
                  htmlFor="prod-confirm-phrase"
                  className="text-xs font-medium text-zinc-300"
                >
                  Type{' '}
                  <code className="rounded bg-zinc-800 px-1 text-sky-400">
                    confirm-prod
                  </code>{' '}
                  to confirm
                </label>
                <input
                  id="prod-confirm-phrase"
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="confirm-prod"
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus:ring-2 focus:ring-zinc-500 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                disabled={!countdownDone || !prodPhraseValid}
                aria-describedby={!countdownDone ? 'countdown-desc' : undefined}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                {!countdownDone ? `Apply (${countdown}s)` : 'Apply'}
              </button>
            </div>
            {!countdownDone && (
              <p
                id="countdown-desc"
                className="mt-2 text-center text-xs text-zinc-600"
              >
                Review the diff before applying
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
