/**
 * WebTerminalPanel — admin web terminal panel.
 *
 * Purpose: Provide a browser-based terminal for running nSelf CLI commands.
 *   All 7 AsyncScreen states handled.
 * Inputs: command input, /api/terminal/exec endpoint (stream or response)
 * Outputs: terminal-style output display; TerminalOutput component
 * Constraints:
 *   - Offline = stack not running (terminal backend unavailable)
 *   - Empty = no commands run yet in this session
 *   - Error = command execution failure
 *   - Commands are run via API; no direct shell exposure
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: WebTerminalPanel 7-state
 */

'use client'

import { AdminLoginOverlay } from '@/components/AdminLoginOverlay'
import { AsyncScreen, type AsyncScreenState } from '@/components/AsyncScreen'
import { useStackStatus } from '@/hooks/useStackStatus'
import { err, ok, toAdminError, type Result } from '@/lib/result'
import { Play, Terminal } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommandResult {
  output: string
  exitCode: number
  command: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WebTerminalPanel() {
  const { stackIsDown, retry } = useStackStatus()
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<CommandResult[]>([])
  const [result, setResult] = useState<Result<CommandResult> | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  const runCommand = useCallback(async () => {
    if (!command.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: command.trim() }),
      })
      if (res.status === 401) {
        setSessionExpired(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: CommandResult = await res.json()
      const cmdResult = ok(data)
      setResult(cmdResult)
      setHistory((prev) => [...prev, data])
      setCommand('')
      // Scroll to bottom
      setTimeout(() => {
        outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' })
      }, 50)
    } catch (e) {
      setResult(err(toAdminError(e)))
    } finally {
      setLoading(false)
    }
  }, [command])

  // ---------------------------------------------------------------------------
  // Derive state
  // ---------------------------------------------------------------------------

  const screenState: AsyncScreenState = (() => {
    if (stackIsDown) return 'offline'
    if (sessionExpired) return 'auth-expired'
    if (loading) return 'loading'
    if (history.length === 0) return 'empty'
    if (result && !result.ok) return 'error'
    return 'ready'
  })()

  return (
    <section aria-label="Web Terminal" className="space-y-4">
      {sessionExpired && <AdminLoginOverlay onSuccess={() => setSessionExpired(false)} />}

      {/* Command input */}
      {!stackIsDown && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-zinc-300 bg-zinc-900 px-3 py-2 dark:border-zinc-700">
            <Terminal className="h-4 w-4 shrink-0 text-green-400" />
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && runCommand()}
              placeholder="nself status"
              disabled={loading}
              className="flex-1 bg-transparent font-mono text-sm text-green-300 placeholder-zinc-600 focus:outline-none disabled:cursor-not-allowed"
            />
          </div>
          <button
            onClick={runCommand}
            disabled={loading || !command.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Run
          </button>
        </div>
      )}

      {/* Output */}
      <AsyncScreen
        state={screenState}
        onRetry={retry}
        onReauth={() => setSessionExpired(true)}
        onErrorRetry={() => setResult(null)}
        errorMessage={result && !result.ok ? result.error.userMessage : undefined}
        emptyMessage="No commands run yet. Type a command above."
      >
        <div
          ref={outputRef}
          className="h-96 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-sm"
        >
          {history.map((entry, i) => (
            <div key={i} className="mb-3">
              <p className="text-green-400">
                <span className="text-zinc-500">$ </span>
                {entry.command}
              </p>
              <pre
                className={`text-xs whitespace-pre-wrap ${entry.exitCode === 0 ? 'text-zinc-300' : 'text-red-400'}`}
              >
                {entry.output}
              </pre>
              {entry.exitCode !== 0 && (
                <p className="text-xs text-red-500">Exit code: {entry.exitCode}</p>
              )}
            </div>
          ))}
        </div>
      </AsyncScreen>
    </section>
  )
}
