'use client'

import { ChatPanel } from '@/app/vibe/components/ChatPanel'
import { DiffViewer } from '@/app/vibe/components/DiffViewer'
import { FileTree } from '@/app/vibe/components/FileTree'
import { TerminalPanel } from '@/app/vibe/components/TerminalPanel'
import { useVibeSession, type TargetEnv } from '@/app/vibe/hooks/useVibeSession'
import { useVibeStream } from '@/app/vibe/hooks/useVibeStream'
import { AlertCircle, Loader2, Sparkles, TerminalSquare, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Keyboard shortcut constants
const PANEL_KEYS: Record<string, number> = {
  '1': 0, // Chat
  '2': 1, // Diff
  '3': 2, // File tree
  '4': 3, // Terminal
}

export default function VibePage() {
  const {
    session,
    generation,
    applyStatus,
    error,
    isCreatingSession,
    createSession,
    submitPrompt,
    applyGeneration,
    resetGeneration,
  } = useVibeSession()

  const { chunks, isStreaming, statusMessage, startStream, clearStream } =
    useVibeStream()

  const [_focusedPanel, setFocusedPanel] = useState<number>(0)
  const [highContrast, setHighContrast] = useState(false)
  const panelRefs = useRef<Array<HTMLDivElement | null>>([
    null,
    null,
    null,
    null,
  ])
  const lastFocusRefs = useRef<Array<HTMLElement | null>>([
    null,
    null,
    null,
    null,
  ])

  // High contrast from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('vibe_high_contrast')
    if (stored === 'true') setHighContrast(true)
  }, [])

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => {
      const next = !prev
      localStorage.setItem('vibe_high_contrast', String(next))
      return next
    })
  }, [])

  // Start streaming when generation begins
  useEffect(() => {
    if (generation?.id && generation.status === 'generating' && session?.id) {
      clearStream()
      startStream(session.id, generation.id)
    }
  }, [
    generation?.id,
    generation?.status,
    session?.id,
    startStream,
    clearStream,
  ])

  // Handle keyboard panel switching (Alt+1..4)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return
      const idx = PANEL_KEYS[e.key]
      if (idx === undefined) return
      e.preventDefault()
      setFocusedPanel(idx)
      const panel = panelRefs.current[idx]
      if (panel) {
        const lastFocus = lastFocusRefs.current[idx]
        if (lastFocus) {
          lastFocus.focus()
        } else {
          // First time: focus first interactive element
          const first = panel.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          )
          if (first) first.focus()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const isDisabled =
    !session ||
    generation?.status === 'generating' ||
    applyStatus === 'applying'

  const handleSubmitPrompt = useCallback(
    (prompt: string) => {
      clearStream()
      resetGeneration()
      submitPrompt(prompt)
    },
    [clearStream, resetGeneration, submitPrompt],
  )

  const VIBE_ENABLED = process.env.NEXT_PUBLIC_NSELF_VIBE_ENABLED !== 'false'

  if (!VIBE_ENABLED) {
    return (
      <main className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <Sparkles
            className="mx-auto mb-3 h-10 w-10 text-zinc-600"
            aria-hidden="true"
          />
          <h1 className="text-lg font-semibold text-zinc-300">
            Vibe-Code is disabled
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Set <code className="text-sky-400">NSELF_VIBE_ENABLED=true</code> to
            enable.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main
      className={[
        'flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100',
        highContrast ? 'vibe-high-contrast' : '',
      ].join(' ')}
    >
      {/* Header */}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-400" aria-hidden="true" />
          <h1 className="text-sm font-semibold text-zinc-100">Vibe-Code</h1>
          <span className="text-xs text-zinc-600">
            Full-stack AI code generation
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* High contrast toggle */}
          <button
            type="button"
            onClick={toggleHighContrast}
            aria-pressed={highContrast}
            className="rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            {highContrast ? 'Standard' : 'High Contrast'}
          </button>

          {/* Session status */}
          {session ? (
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                aria-hidden="true"
              />
              <span className="text-xs text-zinc-400">
                {session.target_env} session
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {(['local', 'staging', 'prod'] as TargetEnv[]).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => createSession(env)}
                  disabled={isCreatingSession}
                  className={[
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors focus:ring-2 focus:ring-sky-500 focus:outline-none',
                    env === 'prod'
                      ? 'border border-red-600/50 text-red-400 hover:bg-red-600/10'
                      : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {isCreatingSession ? (
                    <Loader2
                      className="mr-1 inline h-3 w-3 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                  {env}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-red-900/50 bg-red-950/40 px-4 py-2"
        >
          <div className="flex items-center gap-2 text-xs text-red-300">
            <AlertCircle
              className="h-3.5 w-3.5 flex-shrink-0"
              aria-hidden="true"
            />
            {error}
          </div>
          <button
            type="button"
            onClick={() => {
              /* parent error cleared by next action */
            }}
            aria-label="Dismiss error"
            className="text-red-400 hover:text-red-200"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="sr-only" aria-live="assertive">
        Press Alt+1 for Chat, Alt+2 for Diff viewer, Alt+3 for File tree, Alt+4
        for Terminal
      </div>

      {/* No session state */}
      {!session && (
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-md text-center">
            <TerminalSquare
              className="mx-auto mb-4 h-12 w-12 text-zinc-700"
              aria-hidden="true"
            />
            <h2 className="text-base font-semibold text-zinc-300">
              Start a Vibe-Code session
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Choose an environment above to start generating full-stack
              features with AI. Local mode works with zero cloud dependencies.
            </p>
            <p className="mt-3 text-xs text-zinc-600">
              Keyboard: Alt+1 Chat &middot; Alt+2 Diff &middot; Alt+3 Files
              &middot; Alt+4 Terminal
            </p>
          </div>
        </div>
      )}

      {/* IDE panels — 4-panel layout */}
      {session && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Chat panel — 1/4 */}
          <div
            ref={(el) => {
              panelRefs.current[0] = el
            }}
            onFocus={(e) => {
              lastFocusRefs.current[0] = e.target as HTMLElement
              setFocusedPanel(0)
            }}
            className="relative flex w-1/4 min-w-[220px] flex-col overflow-hidden border-r border-zinc-800"
          >
            <ChatPanel
              generation={generation}
              streamChunks={chunks}
              isStreaming={isStreaming}
              statusMessage={statusMessage}
              onSubmit={handleSubmitPrompt}
              disabled={isDisabled}
            />
          </div>

          {/* Center: Diff viewer — 2/4 */}
          <div
            ref={(el) => {
              panelRefs.current[1] = el
            }}
            onFocus={(e) => {
              lastFocusRefs.current[1] = e.target as HTMLElement
              setFocusedPanel(1)
            }}
            className="flex flex-1 flex-col overflow-hidden border-r border-zinc-800"
          >
            <DiffViewer generation={generation} />
          </div>

          {/* Right column: File tree (top) + Terminal (bottom) — 1/4 */}
          <div className="flex w-1/4 min-w-[220px] flex-col overflow-hidden">
            {/* File tree — top half */}
            <div
              ref={(el) => {
                panelRefs.current[2] = el
              }}
              onFocus={(e) => {
                lastFocusRefs.current[2] = e.target as HTMLElement
                setFocusedPanel(2)
              }}
              className="h-1/2 overflow-hidden border-b border-zinc-800"
            >
              <FileTree generation={generation} />
            </div>

            {/* Terminal — bottom half */}
            <div
              ref={(el) => {
                panelRefs.current[3] = el
              }}
              onFocus={(e) => {
                lastFocusRefs.current[3] = e.target as HTMLElement
                setFocusedPanel(3)
              }}
              className="relative h-1/2 overflow-hidden"
            >
              <TerminalPanel
                chunks={chunks}
                isStreaming={isStreaming}
                generation={generation}
                applyStatus={applyStatus}
                targetEnv={session.target_env}
                onApply={applyGeneration}
              />
            </div>
          </div>
        </div>
      )}

      {/* High contrast CSS */}
      <style>{`
        .vibe-high-contrast {
          --hc-bg: #000000;
          --hc-fg: #ffffff;
          --hc-border: #ffff00;
          --hc-accent: #1aebff;
          background-color: var(--hc-bg) !important;
          color: var(--hc-fg) !important;
        }
        .vibe-high-contrast * {
          border-color: var(--hc-border) !important;
        }
        .vibe-high-contrast .text-sky-400,
        .vibe-high-contrast .text-sky-500,
        .vibe-high-contrast .text-sky-600 {
          color: var(--hc-accent) !important;
        }
        .vibe-high-contrast button:focus-visible,
        .vibe-high-contrast a:focus-visible,
        .vibe-high-contrast input:focus-visible,
        .vibe-high-contrast textarea:focus-visible {
          outline: 3px solid var(--hc-accent) !important;
          outline-offset: 2px !important;
        }
      `}</style>
    </main>
  )
}
