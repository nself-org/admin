'use client'

import {
  AlertCircle,
  Camera,
  CheckCircle,
  Clock,
  Cookie,
  ExternalLink,
  Globe,
  Loader2,
  Monitor,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const BROWSER_API = 'http://127.0.0.1:3716'

// ── Types ─────────────────────────────────────────────────────────────────────

interface HealthData {
  status: string
  plugin: string
  sessions: number
  screenshots: number
}

interface BrowserSession {
  id: string
  site: string
  created_at: string
  last_used: string
  cookies_count: number
}

interface Screenshot {
  id: string
  url: string
  site: string
  created_at: string
  filename: string
}

type PluginStatus = 'checking' | 'running' | 'stopped'

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

// ── Screenshot card ───────────────────────────────────────────────────────────

function ScreenshotCard({ screenshot }: { screenshot: Screenshot }) {
  const [imgError, setImgError] = useState(false)
  const imgSrc = `${BROWSER_API}/screenshots/${screenshot.filename}`

  return (
    <a
      href={imgSrc}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-zinc-700/50 bg-zinc-800/50 overflow-hidden hover:border-zinc-600/70 transition-colors"
    >
      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
        {imgError ? (
          <div className="flex h-full items-center justify-center">
            <Camera className="h-8 w-8 text-zinc-700" />
          </div>
        ) : (
          <>
            <img
              src={imgSrc}
              alt={screenshot.site}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <ExternalLink className="h-6 w-6 text-white" />
            </div>
          </>
        )}
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-medium text-zinc-300 truncate">
          {screenshot.site}
        </p>
        <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {new Date(screenshot.created_at).toLocaleString()}
        </p>
      </div>
    </a>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BrowserPage() {
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [health, setHealth] = useState<HealthData | null>(null)
  const [sessions, setSessions] = useState<BrowserSession[]>([])
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [screenshotsLoading, setScreenshotsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)

  // ── Fetch health ─────────────────────────────────────────────────────────────

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${BROWSER_API}/health`, { cache: 'no-store' })
      if (!res.ok) {
        setPluginStatus('stopped')
        setHealth(null)
        return
      }
      const data = (await res.json()) as HealthData
      setHealth(data)
      setPluginStatus('running')
    } catch {
      setPluginStatus('stopped')
      setHealth(null)
    }
  }

  // ── Fetch sessions ────────────────────────────────────────────────────────────

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${BROWSER_API}/sessions`, { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { sessions: BrowserSession[] }
      setSessions(data.sessions ?? [])
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  // ── Fetch screenshots ─────────────────────────────────────────────────────────

  const fetchScreenshots = async () => {
    try {
      const res = await fetch(`${BROWSER_API}/screenshots`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setScreenshots([])
        return
      }
      const data = (await res.json()) as { screenshots: Screenshot[] }
      setScreenshots(data.screenshots ?? [])
    } catch {
      setScreenshots([])
    } finally {
      setScreenshotsLoading(false)
    }
  }

  // ── Initial load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      await fetchHealth()
      await Promise.all([fetchSessions(), fetchScreenshots()])
    }
    void init()

    const interval = setInterval(() => {
      void fetchHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // ── Refresh all ───────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true)
    setSessionsLoading(true)
    setScreenshotsLoading(true)
    await fetchHealth()
    await Promise.all([fetchSessions(), fetchScreenshots()])
    setRefreshing(false)
  }

  // ── Delete session ────────────────────────────────────────────────────────────

  const handleDeleteSession = async (id: string) => {
    setDeletingId(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    try {
      await fetch(`${BROWSER_API}/sessions/${id}`, { method: 'DELETE' })
    } catch {
      // network error — optimistic removal already done
    } finally {
      setDeletingId(null)
    }
  }

  // ── Clear all sessions ────────────────────────────────────────────────────────

  const handleClearAll = async () => {
    setClearingAll(true)
    setSessions([])
    try {
      await fetch(`${BROWSER_API}/sessions`, { method: 'DELETE' })
    } catch {
      // network error — optimistic clear already done
    } finally {
      setClearingAll(false)
    }
  }

  // ── Status badge ──────────────────────────────────────────────────────────────

  const StatusBadge = () => {
    if (pluginStatus === 'checking') {
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-zinc-600/50 bg-zinc-800/50 px-3 py-1 text-xs font-medium text-zinc-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking
        </span>
      )
    }
    if (pluginStatus === 'running') {
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300">
          <CheckCircle className="h-3 w-3" />
          Running
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
        <XCircle className="h-3 w-3" />
        Stopped
      </span>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Browser</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Playwright-powered browser automation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge />
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Plugin stopped warning */}
      {pluginStatus === 'stopped' && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">
                nself-browser is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the browser plugin to use automation features.
              </p>
              <div className="mt-3 rounded-lg bg-zinc-900/50 px-3 py-2 font-mono text-xs text-zinc-300">
                nself plugin install browser
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content — shown when running */}
      {pluginStatus === 'running' && (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Active Sessions"
              value={health?.sessions ?? sessions.length}
              icon={Cookie}
            />
            <StatCard
              label="Saved Screenshots"
              value={health?.screenshots ?? screenshots.length}
              icon={Camera}
            />
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Plugin Status
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                <span className="text-sm font-medium text-green-300">
                  Running
                </span>
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
            <div className="flex items-center justify-between border-b border-zinc-700/50 px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Sessions</h2>
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleClearAll()}
                  disabled={clearingAll}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-50"
                >
                  {clearingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Clear All
                </button>
              )}
            </div>

            {sessionsLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-12 animate-pulse rounded-lg bg-zinc-700/40"
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Cookie className="mb-2 h-7 w-7 text-zinc-700" />
                <p className="text-sm text-zinc-500">No sessions saved</p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  Sessions are created when the browser plugin visits sites
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-700/50">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    {/* Site icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-700/50 border border-zinc-600/50">
                      <Globe className="h-4 w-4 text-zinc-400" />
                    </div>

                    {/* Site info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {session.site}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        Last used:{' '}
                        {new Date(session.last_used).toLocaleString()}
                      </p>
                    </div>

                    {/* Cookies badge */}
                    <span className="shrink-0 rounded-full border border-zinc-600/50 bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400">
                      {session.cookies_count}{' '}
                      {session.cookies_count === 1 ? 'cookie' : 'cookies'}
                    </span>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => void handleDeleteSession(session.id)}
                      disabled={deletingId === session.id}
                      className="shrink-0 rounded-lg p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      aria-label={`Delete session for ${session.site}`}
                    >
                      {deletingId === session.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Screenshots */}
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
            <div className="flex items-center justify-between border-b border-zinc-700/50 px-5 py-4">
              <h2 className="text-sm font-semibold text-white">
                Recent Screenshots
              </h2>
              <span className="text-xs text-zinc-500">Last 10</span>
            </div>

            {screenshotsLoading ? (
              <div className="grid grid-cols-4 gap-3 p-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="aspect-video animate-pulse rounded-lg bg-zinc-700/40"
                  />
                ))}
              </div>
            ) : screenshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Camera className="mb-2 h-7 w-7 text-zinc-700" />
                <p className="text-sm text-zinc-500">No screenshots yet</p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  Screenshots are saved when automation captures pages
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3 p-4">
                {screenshots.map((screenshot) => (
                  <ScreenshotCard key={screenshot.id} screenshot={screenshot} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
