'use client'

/**
 * Plugin Logs Viewer — /plugins/[name]/logs
 * Shows plugin container logs with:
 *   - Line colorization (ERROR = red, WARN = yellow, INFO = cyan)
 *   - Auto-refresh every 10s (polling) or live SSE follow mode
 *   - Line count selector
 */

import {
  ArrowLeft,
  Pause,
  Play,
  RefreshCw,
  Terminal,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface LogLine {
  id: number
  text: string
  ts?: number
}

const LEVEL_COLORS: Record<string, string> = {
  ERROR:  'text-red-400',
  FATAL:  'text-red-500',
  CRIT:   'text-red-500',
  WARN:   'text-yellow-400',
  WARNING:'text-yellow-400',
  INFO:   'text-cyan-400',
  DEBUG:  'text-zinc-400',
}

function getLineColor(text: string): string {
  const upper = text.toUpperCase()
  for (const [level, cls] of Object.entries(LEVEL_COLORS)) {
    if (upper.includes(level)) return cls
  }
  return 'text-zinc-300'
}

export default function PluginLogsPage() {
  const params = useParams()
  const pluginName = params.name as string

  const [lines, setLines] = useState<LogLine[]>([])
  const [lineCount, setLineCount] = useState(100)
  const [follow, setFollow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const logEndRef = useRef<HTMLDivElement>(null)
  const sseRef = useRef<EventSource | null>(null)
  const lineIdRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addLines = useCallback((newTexts: string[]) => {
    setLines((prev) => {
      const combined = [
        ...prev,
        ...newTexts.map((text) => ({
          id: lineIdRef.current++,
          text,
        })),
      ]
      // Keep last 2000 lines in memory
      return combined.slice(-2000)
    })
  }, [])

  // Fetch snapshot
  const fetchSnapshot = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/plugins/${pluginName}/logs?lines=${lineCount}`,
      )
      const data = await response.json()

      if (data.success) {
        lineIdRef.current = 0
        setLines(
          (data.lines as string[]).map((text: string) => ({
            id: lineIdRef.current++,
            text,
          })),
        )
        setLastRefresh(new Date())
      } else {
        setError(data.error || 'Failed to load logs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }, [pluginName, lineCount])

  // Start SSE follow stream
  const startFollow = useCallback(() => {
    // Close any existing connection
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }

    const sse = new EventSource(
      `/api/plugins/${pluginName}/logs?follow=true&lines=${lineCount}`,
    )

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.done) {
          sse.close()
          setFollow(false)
          return
        }
        if (data.error) {
          setError(data.error)
          sse.close()
          setFollow(false)
          return
        }
        if (data.line) {
          addLines([data.line])
        }
      } catch {
        // ignore parse errors
      }
    }

    sse.onerror = () => {
      sse.close()
      setFollow(false)
    }

    sseRef.current = sse
  }, [pluginName, lineCount, addLines])

  // Stop follow
  const stopFollow = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }
    setFollow(false)
  }, [])

  // Initial load
  useEffect(() => {
    fetchSnapshot()
  }, [fetchSnapshot])

  // Auto-refresh every 10s when not in follow mode
  useEffect(() => {
    if (follow) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      fetchSnapshot()
    }, 10000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [follow, fetchSnapshot])

  // Start/stop follow mode
  useEffect(() => {
    if (follow) {
      startFollow()
    } else {
      stopFollow()
    }

    return () => {
      stopFollow()
    }
  }, [follow, startFollow, stopFollow])

  // Auto-scroll to bottom when following
  useEffect(() => {
    if (follow && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [lines, follow])

  const toggleFollow = () => {
    setFollow((v) => !v)
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/plugins/${pluginName}`}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
              aria-label="Back to plugin"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-zinc-500" />
              <h1 className="text-lg font-semibold text-white capitalize">
                {pluginName} logs
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Line count selector */}
            <select
              value={lineCount}
              onChange={(e) => setLineCount(Number(e.target.value))}
              disabled={follow}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none disabled:opacity-50"
              aria-label="Number of lines"
            >
              <option value={50}>50 lines</option>
              <option value={100}>100 lines</option>
              <option value={200}>200 lines</option>
              <option value={500}>500 lines</option>
              <option value={1000}>1000 lines</option>
            </select>

            {/* Refresh button (snapshot mode) */}
            {!follow && (
              <button
                type="button"
                onClick={() => fetchSnapshot()}
                disabled={loading}
                className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-50"
                aria-label="Refresh logs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
            )}

            {/* Follow toggle */}
            <button
              type="button"
              onClick={toggleFollow}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                follow
                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                  : 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30'
              }`}
              aria-label={follow ? 'Stop following' : 'Follow logs'}
            >
              {follow ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Follow
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
          {follow ? (
            <span className="flex items-center gap-1 text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Live
            </span>
          ) : (
            lastRefresh && (
              <span>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )
          )}
          <span>{lines.length} lines</span>
        </div>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div
            role="alert"
            className="m-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
          >
            {error}
          </div>
        ) : loading && lines.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-zinc-600" />
              <p className="text-sm text-zinc-500">Loading logs...</p>
            </div>
          </div>
        ) : lines.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <Terminal className="mx-auto mb-2 h-8 w-8 text-zinc-700" />
              <p className="text-zinc-500">No logs available yet</p>
              <p className="mt-1 text-sm text-zinc-600">
                Start the plugin to see output here
              </p>
            </div>
          </div>
        ) : (
          <pre className="p-4 font-mono text-xs leading-relaxed">
            {lines.map((line) => (
              <div
                key={line.id}
                className={`py-0.5 ${getLineColor(line.text)}`}
              >
                {line.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </pre>
        )}
      </div>
    </div>
  )
}
