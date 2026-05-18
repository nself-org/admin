'use client'

import { Button } from '@/components/Button'
import { ListSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Search,
  Terminal,
  WifiOff,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

interface HelpCommand {
  name: string
  description: string
  usage?: string
}

interface HelpResult {
  commands: HelpCommand[]
  rawOutput: string
}

function HelpContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<HelpResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [search, setSearch] = useState('')
  const [showRaw, setShowRaw] = useState(false)

  const fetchHelp = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const response = await fetch('/api/nself/help')
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
      setData(await response.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchHelp()
  }, [fetchHelp])

  const filtered = useMemo(() => {
    if (!data) return []
    if (!search.trim()) return data.commands
    const q = search.toLowerCase()
    return data.commands.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    )
  }, [data, search])

  // State 1: Initial skeleton
  if (initialLoad && loading) return <ListSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach nself CLI</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Verify the nself binary is installed and on PATH.
            </p>
          </div>
        </div>
        <Button onClick={fetchHelp} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Failed to load help</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={fetchHelp} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data yet
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No help information available.</p>
        <Button
          onClick={fetchHelp}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Load Help
        </Button>
      </div>
    )
  }

  // States 6 + 7: Success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">CLI Help</h2>
          <p className="mt-1 text-sm text-gray-400">{data.commands.length} commands available</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://docs.nself.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-sky-400 transition-colors hover:text-sky-300"
          >
            Docs
            <ExternalLink className="h-3 w-3" />
          </a>
          <Button onClick={fetchHelp} disabled={loading} variant="secondary" size="sm">
            {/* State 2: Refresh spinner */}
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Search */}
      {data.commands.length > 5 && (
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search commands…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-4 pl-9 text-sm text-white placeholder-gray-500 transition-colors focus:border-sky-500/50 focus:outline-none"
          />
        </div>
      )}

      {/* Commands list — State 3 empty search variant */}
      {data.commands.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <Terminal className="mx-auto mb-2 h-8 w-8 text-gray-400 opacity-30" />
          <p className="text-gray-400">No commands parsed from CLI help output.</p>
          <button
            onClick={() => setShowRaw(true)}
            className="mt-2 text-xs text-sky-400 transition-colors hover:text-sky-300"
          >
            View raw output
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400">No commands match &ldquo;{search}&rdquo;</p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-xs text-sky-400 transition-colors hover:text-sky-300"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
          {filtered.map((cmd, i) => (
            <div
              key={i}
              className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              <Terminal className="h-4 w-4 flex-shrink-0 text-gray-500 transition-colors group-hover:text-sky-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm font-medium text-sky-400">
                    nself {cmd.name}
                  </code>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">{cmd.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-600 transition-colors group-hover:text-gray-400" />
            </div>
          ))}
        </div>
      )}

      {/* Raw output toggle */}
      {data.rawOutput && (
        <div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-gray-500 transition-colors hover:text-gray-300"
          >
            {showRaw ? 'Hide' : 'Show'} full help output
          </button>
          {showRaw && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs whitespace-pre-wrap text-gray-300">
              {data.rawOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <HelpContent />
    </Suspense>
  )
}
