'use client'

import { Button } from '@/components/Button'
import { CodeEditorSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Send,
  Terminal,
  Trash2,
  WifiOff,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

interface AllowedCommands {
  allowed: string[]
  description: string
}

interface OutputLine {
  id: number
  type: 'start' | 'stdout' | 'stderr' | 'error' | 'exit' | 'info'
  text: string
  code?: number
}

function getCsrf(): string {
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('nself-csrf='))
      ?.split('=')[1] ?? ''
  )
}

let lineId = 0
function nextId() {
  return ++lineId
}

function TerminalContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [allowedData, setAllowedData] = useState<AllowedCommands | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<OutputLine[]>([])
  const [showCommands, setShowCommands] = useState(false)

  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<string[]>([])
  const historyIdxRef = useRef(-1)
  const abortRef = useRef<AbortController | null>(null)

  const scrollBottom = useCallback(() => {
    setTimeout(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight
      }
    }, 50)
  }, [])

  const addLine = useCallback(
    (type: OutputLine['type'], text: string, code?: number) => {
      setOutput((prev) => [...prev, { id: nextId(), type, text, code }])
      scrollBottom()
    },
    [scrollBottom],
  )

  const fetchAllowed = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const response = await fetch('/api/ws/terminal')
      if (response.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const msg: string = body?.error ?? `Request failed: ${response.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      setAllowedData(await response.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchAllowed()
  }, [fetchAllowed])

  const runCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed || running) return

      // Parse: strip leading "nself " prefix if user typed it
      const withoutPrefix = trimmed.startsWith('nself ')
        ? trimmed.slice(6).trim()
        : trimmed

      const parts = withoutPrefix.split(/\s+/)
      const command = parts[0]
      const args = parts.slice(1)

      // Save to history
      historyRef.current = [trimmed, ...historyRef.current.slice(0, 49)]
      historyIdxRef.current = -1
      setInput('')

      addLine('start', `$ nself ${withoutPrefix}`)
      setRunning(true)

      // Cancel any previous in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch('/api/ws/terminal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrf(),
          },
          body: JSON.stringify({ command, args }),
          signal: controller.signal,
        })

        if (response.status === 401) {
          window.location.href = '/login'
          return
        }

        if (!response.ok) {
          const json = await response.json().catch(() => ({}))
          addLine('error', json?.error ?? `Error ${response.status}`)
          return
        }

        // Parse SSE stream
        const reader = response.body?.getReader()
        if (!reader) {
          addLine('error', 'No response stream')
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const events = buffer.split('\n\n')
          buffer = events.pop() ?? ''

          for (const event of events) {
            const lines = event.split('\n')
            let evtType = 'stdout'
            let evtData = ''
            for (const line of lines) {
              if (line.startsWith('event: ')) evtType = line.slice(7).trim()
              if (line.startsWith('data: ')) evtData = line.slice(6).trim()
            }
            if (!evtData) continue
            const parsed = JSON.parse(evtData)
            if (evtType === 'exit') {
              const code = typeof parsed === 'object' ? parsed.code : parsed
              addLine('exit', code === 0 ? '✓ Done' : `✗ Exited with code ${code}`, code)
            } else if (evtType === 'start') {
              // Already displayed by addLine above
            } else if (parsed && typeof parsed === 'string' && parsed.trim()) {
              addLine(evtType as OutputLine['type'], parsed)
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          addLine('error', 'Connection error — is the nself stack running?')
        }
      } finally {
        setRunning(false)
        inputRef.current?.focus()
      }
    },
    [running, addLine],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        runCommand(input)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const next = Math.min(historyIdxRef.current + 1, historyRef.current.length - 1)
        historyIdxRef.current = next
        if (historyRef.current[next]) setInput(historyRef.current[next])
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = Math.max(historyIdxRef.current - 1, -1)
        historyIdxRef.current = next
        setInput(next === -1 ? '' : (historyRef.current[next] ?? ''))
        return
      }
      if (e.key === 'c' && e.ctrlKey) {
        abortRef.current?.abort()
        setRunning(false)
        addLine('info', '^C')
      }
    },
    [input, runCommand, addLine],
  )

  // State 1: Initial skeleton
  if (initialLoad && loading) return <CodeEditorSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach nself CLI</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Verify the nself binary is installed and on PATH.
            </p>
          </div>
        </div>
        <Button onClick={fetchAllowed} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !allowedData) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-400">Failed to load terminal</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchAllowed} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data yet
  if (!allowedData) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Terminal not available.</p>
        <Button onClick={fetchAllowed} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
          Load Terminal
        </Button>
      </div>
    )
  }

  // States 6 + 7: Success
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">nself Terminal</h2>
          <p className="text-sm text-gray-400 mt-1">
            {allowedData.allowed.length} allowed commands &mdash; nself prefix only
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCommands((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Commands
            <ChevronDown className={`h-3 w-3 transition-transform ${showCommands ? 'rotate-180' : ''}`} />
          </button>
          <Button onClick={fetchAllowed} disabled={loading} variant="secondary" size="sm">
            {/* State 2: Refresh spinner */}
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Allowed commands panel */}
      {showCommands && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400 mb-3">
            Only nself sub-commands from this list are permitted:
          </p>
          <div className="flex flex-wrap gap-2">
            {allowedData.allowed.map((cmd) => (
              <button
                key={cmd}
                onClick={() => {
                  setInput(`nself ${cmd}`)
                  inputRef.current?.focus()
                }}
                className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono text-sky-400 hover:bg-white/20 transition-colors"
              >
                nself {cmd}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Output panel */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-mono text-gray-400">output</span>
            {running && (
              <span className="text-xs text-yellow-400 animate-pulse">running…</span>
            )}
          </div>
          <button
            onClick={() => setOutput([])}
            disabled={running}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-30"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        </div>

        <div
          ref={outputRef}
          className="bg-gray-950 font-mono text-xs p-4 h-72 overflow-y-auto space-y-0.5"
          onClick={() => inputRef.current?.focus()}
        >
          {output.length === 0 ? (
            <p className="text-gray-600">
              Type a command below, e.g. <span className="text-sky-500">nself status</span>
            </p>
          ) : (
            output.map((line) => (
              <p
                key={line.id}
                className={
                  line.type === 'start'
                    ? 'text-sky-400'
                    : line.type === 'stderr'
                      ? 'text-yellow-400'
                      : line.type === 'error'
                        ? 'text-red-400'
                        : line.type === 'exit'
                          ? line.code === 0
                            ? 'text-green-400'
                            : 'text-red-400'
                          : line.type === 'info'
                            ? 'text-gray-500'
                            : 'text-gray-200'
                }
              >
                {line.text}
              </p>
            ))
          )}
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-t border-white/10">
          <span className="text-xs font-mono text-sky-500 flex-shrink-0">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={running}
            placeholder="nself status"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => runCommand(input)}
            disabled={running || !input.trim()}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-sky-400 transition-colors disabled:opacity-30"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-600">
        Use ↑↓ arrow keys to navigate history · Ctrl+C to cancel · Commands must start with{' '}
        <code className="font-mono text-gray-500">nself</code>
      </p>
    </div>
  )
}

export default function TerminalPage() {
  return (
    <Suspense fallback={<CodeEditorSkeleton />}>
      <TerminalContent />
    </Suspense>
  )
}
