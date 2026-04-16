'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  BarChart3,
  Database,
  HardDrive,
  Loader2,
  Play,
  Terminal,
  Trash2,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheStats {
  memoryUsed: string
  memoryPeak: string
  totalKeys: string
  hitRate: string
  uptimeSeconds: string
  connectedClients: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseStatsFromOutput(output: string): CacheStats | null {
  try {
    const parsed = JSON.parse(output)
    if (parsed && typeof parsed === 'object') return parsed as CacheStats
  } catch {
    // Not JSON - try line parsing
  }

  const stats: Record<string, string> = {}
  const lines = output.split('\n')
  for (const line of lines) {
    const [key, value] = line.split(':').map((s) => s.trim())
    if (key && value) {
      stats[key] = value
    }
  }

  if (Object.keys(stats).length > 0) {
    return {
      memoryUsed: stats['used_memory_human'] || stats['memoryUsed'] || '--',
      memoryPeak:
        stats['used_memory_peak_human'] || stats['memoryPeak'] || '--',
      totalKeys: stats['db0'] || stats['totalKeys'] || '--',
      hitRate: stats['keyspace_hit_rate'] || stats['hitRate'] || '--',
      uptimeSeconds:
        stats['uptime_in_seconds'] || stats['uptimeSeconds'] || '--',
      connectedClients:
        stats['connected_clients'] || stats['connectedClients'] || '--',
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CacheManagementContent() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [cliCommand, setCliCommand] = useState('')
  const [cliHistory, setCliHistory] = useState<
    { command: string; output: string }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [flushing, setFlushing] = useState(false)
  const [confirmFlush, setConfirmFlush] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [lastCommand, setLastCommand] = useState('')

  // ---------------------------------------------------------------------------
  // Fetch cache stats
  // ---------------------------------------------------------------------------

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself service cache stats')

    try {
      const res = await fetch('/api/services/cache/stats')
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to fetch cache stats')
        setOutput(data.details || data.error || '')
        return
      }

      const rawOutput = data.data?.output || ''
      setOutput(rawOutput)
      setStats(parseStatsFromOutput(rawOutput))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Initialize cache
  // ---------------------------------------------------------------------------

  const handleInit = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself service cache init')

    try {
      const res = await fetch('/api/services/cache/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Cache initialization failed')
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || 'Cache initialized successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Flush cache
  // ---------------------------------------------------------------------------

  const handleFlush = useCallback(async () => {
    if (!confirmFlush) {
      setConfirmFlush(true)
      return
    }

    setFlushing(true)
    setError(null)
    setConfirmFlush(false)
    setLastCommand('nself service cache flush')

    try {
      const res = await fetch('/api/services/cache/flush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Cache flush failed')
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || 'Cache flushed successfully.')
      // Refresh stats after flush
      await fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setFlushing(false)
    }
  }, [confirmFlush, fetchStats])

  // ---------------------------------------------------------------------------
  // Execute CLI command
  // ---------------------------------------------------------------------------

  const handleCli = useCallback(async () => {
    if (!cliCommand.trim()) return

    setLoading(true)
    setError(null)
    setLastCommand(`nself service cache cli "${cliCommand}"`)

    try {
      const res = await fetch('/api/services/cache/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cliCommand.trim() }),
      })
      const data = await res.json()

      const resultOutput = data.success
        ? data.data?.output || '(empty response)'
        : data.details || data.error || 'Command failed'

      setOutput(resultOutput)
      setCliHistory((prev) => [
        ...prev,
        { command: cliCommand.trim(), output: resultOutput },
      ])
      setCliCommand('')

      if (!data.success) {
        setError(data.details || data.error || 'CLI command failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [cliCommand])

  // ---------------------------------------------------------------------------
  // Load stats on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Reset flush confirmation on click away
  useEffect(() => {
    if (!confirmFlush) return
    const timer = setTimeout(() => setConfirmFlush(false), 5000)
    return () => clearTimeout(timer)
  }, [confirmFlush])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageShell
      title="Cache Management"
      description="Manage Redis cache, monitor memory usage, and execute commands."
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <HardDrive className="mx-auto mb-2 h-5 w-5 text-blue-500" />
                <p className="text-xs text-zinc-500">Memory Used</p>
                <p className="mt-1 font-mono text-lg font-bold text-zinc-900 dark:text-white">
                  {stats?.memoryUsed || '--'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <HardDrive className="mx-auto mb-2 h-5 w-5 text-orange-500" />
                <p className="text-xs text-zinc-500">Memory Peak</p>
                <p className="mt-1 font-mono text-lg font-bold text-zinc-900 dark:text-white">
                  {stats?.memoryPeak || '--'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Database className="mx-auto mb-2 h-5 w-5 text-green-500" />
                <p className="text-xs text-zinc-500">Total Keys</p>
                <p className="mt-1 font-mono text-lg font-bold text-zinc-900 dark:text-white">
                  {stats?.totalKeys || '--'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <BarChart3 className="mx-auto mb-2 h-5 w-5 text-sky-500" />
                <p className="text-xs text-zinc-500">Hit Rate</p>
                <p className="mt-1 font-mono text-lg font-bold text-zinc-900 dark:text-white">
                  {stats?.hitRate || '--'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Play className="mx-auto mb-2 h-5 w-5 text-teal-500" />
                <p className="text-xs text-zinc-500">Uptime (s)</p>
                <p className="mt-1 font-mono text-lg font-bold text-zinc-900 dark:text-white">
                  {stats?.uptimeSeconds || '--'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Database className="mx-auto mb-2 h-5 w-5 text-sky-500" />
                <p className="text-xs text-zinc-500">Clients</p>
                <p className="mt-1 font-mono text-lg font-bold text-zinc-900 dark:text-white">
                  {stats?.connectedClients || '--'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Initialize Cache
              </CardTitle>
              <CardDescription>
                Start or restart the Redis cache service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleInit}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Initialize
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Refresh Stats
              </CardTitle>
              <CardDescription>
                Fetch the latest cache statistics from Redis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={fetchStats}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Refresh Stats
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Flush Cache
              </CardTitle>
              <CardDescription>
                Clear all cached data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {confirmFlush && (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-xs text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Click again to confirm flush. All data will be lost.
                  </span>
                </div>
              )}
              <Button
                onClick={handleFlush}
                disabled={flushing}
                variant="destructive"
                className="w-full"
              >
                {flushing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Flushing...
                  </>
                ) : confirmFlush ? (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Confirm Flush
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Flush All
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Redis CLI Console */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Redis CLI Console
            </CardTitle>
            <CardDescription>
              Execute Redis commands directly against the cache instance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="mb-4 h-48 w-full rounded-md border border-zinc-200 bg-zinc-950 p-4 dark:border-zinc-700">
              <pre className="font-mono text-sm text-green-400">
                {cliHistory.length > 0
                  ? cliHistory
                      .map((entry) => `> ${entry.command}\n${entry.output}`)
                      .join('\n\n')
                  : 'Redis CLI ready. Enter commands like GET, SET, KEYS *, INFO, etc.'}
              </pre>
            </ScrollArea>
            <div className="flex gap-3">
              <div className="flex flex-1 items-center rounded-md border border-zinc-300 bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-800">
                <span className="px-3 font-mono text-sm text-zinc-400">
                  {'> '}
                </span>
                <input
                  type="text"
                  value={cliCommand}
                  onChange={(e) => setCliCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCli()
                  }}
                  placeholder="Enter Redis command..."
                  className="flex-1 border-0 bg-transparent py-2 pr-3 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white dark:placeholder:text-zinc-500"
                />
              </div>
              <Button
                onClick={handleCli}
                disabled={loading || !cliCommand.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Execute'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* CLI Output */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              CLI Output
            </CardTitle>
            <CardDescription>
              Command preview and execution output from the nself CLI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastCommand && (
              <div className="mb-3 rounded-md bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                $ {lastCommand}
              </div>
            )}
            <ScrollArea className="h-48 w-full rounded-md border border-zinc-200 bg-zinc-950 p-4 dark:border-zinc-700">
              <pre className="font-mono text-sm text-green-400">
                {output ||
                  'No output yet. Use the controls above to get started.'}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

export default function CacheManagementPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <CacheManagementContent />
    </Suspense>
  )
}
